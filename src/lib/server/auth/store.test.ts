// @vitest-environment node
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it, vi } from 'vitest';
const { config } = vi.hoisted(() => ({ config: {
  DATABASE_URL: process.env.TEST_DATABASE_URL, TOKEN_ENCRYPTION_KEY: 'ab'.repeat(32),
  GOOGLE_CLIENT_ID: 'test-client', GOOGLE_CLIENT_SECRET: 'test-secret', ORIGIN: 'http://localhost:5173', AUTH_ALLOWED_EMAILS: 'owner@example.com'
} }));
vi.mock('$env/dynamic/private', () => ({ env: config }));
import { database } from '../db';
import { beginAttempt, consumeAttempt, createSession, sessionUser, deleteSession, hashToken } from './store';

const subject = `auth-test-${randomUUID()}`;
const states: string[] = [];
describe.skipIf(!process.env.TEST_DATABASE_URL)('Auth persistence', () => {
  afterAll(async () => {
    await database().query('DELETE FROM app_users WHERE google_subject = $1', [subject]);
    for (const state of states) await database().query('DELETE FROM oauth_attempts WHERE state_hash = $1', [hashToken(state)]);
    await database().end();
  });
  it('binds attempts to browser, expires them and consumes each only once', async () => {
    const attempt = await beginAttempt(); states.push(attempt.state);
    expect(await consumeAttempt(attempt.state, 'x'.repeat(43))).toBeUndefined();
    expect(await consumeAttempt(attempt.state, attempt.browser)).toMatchObject({ nonce: attempt.nonce, verifier: attempt.verifier });
    expect(await consumeAttempt(attempt.state, attempt.browser)).toBeUndefined();
    const expired = await beginAttempt(); states.push(expired.state);
    await database().query("UPDATE oauth_attempts SET expires_at = now() - interval '1 second' WHERE state_hash = $1", [hashToken(expired.state)]);
    expect(await consumeAttempt(expired.state, expired.browser)).toBeUndefined();
  });
  it('persists Ads purpose bound to the user and session', async () => {
    const session = await createSession({ subject, email: 'owner@example.com' });
    const attempt = await beginAttempt({ subject, session }); states.push(attempt.state);
    expect(await consumeAttempt(attempt.state, attempt.browser)).toMatchObject({ purpose: 'ads', subject, sessionHash: hashToken(session) });
    await deleteSession(session);
  });
  it('stores session hashes, rotates sessions, honors expiry and revokes logout', async () => {
    const user = { subject, email: 'owner@example.com' };
    const first = await createSession(user);
    expect(await sessionUser(first)).toEqual(user);
    const row = await database().query('SELECT token_hash FROM auth_sessions WHERE google_subject = $1', [subject]);
    expect(row.rows[0].token_hash).toBe(hashToken(first));
    const second = await createSession(user, first);
    expect(await sessionUser(first)).toBeUndefined();
    config.AUTH_ALLOWED_EMAILS = 'other@example.com';
    expect(await sessionUser(second)).toBeUndefined();
    config.AUTH_ALLOWED_EMAILS = 'owner@example.com';
    await deleteSession(second);
    expect(await sessionUser(second)).toBeUndefined();
    const expired = await createSession(user);
    await database().query("UPDATE auth_sessions SET expires_at = now() - interval '1 second' WHERE token_hash = $1", [hashToken(expired)]);
    expect(await sessionUser(expired)).toBeUndefined();
  });
});
