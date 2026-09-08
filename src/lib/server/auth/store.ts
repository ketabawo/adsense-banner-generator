import { createHash, randomBytes } from 'node:crypto';
import { database } from '../db';
import { decryptToken, encryptToken } from '../token-crypto';
import { allowedEmails, authConfig } from './config';

export const SESSION_COOKIE = 'studio_session';
export const FLOW_COOKIE = 'studio_oauth';
export const SESSION_SECONDS = 60 * 60 * 24 * 7;
export const randomToken = () => randomBytes(32).toString('base64url');
export const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');
export const validToken = (value: string | undefined): value is string => !!value && /^[A-Za-z0-9_-]{43}$/.test(value);

export async function beginAttempt(ads?: { subject: string; session: string }) {
  const config = authConfig();
  const state = randomToken(), browser = randomToken(), verifier = randomToken(), nonce = randomToken();
  await database().query('DELETE FROM oauth_attempts WHERE expires_at <= now()');
  await database().query(`INSERT INTO oauth_attempts (state_hash, browser_hash, verifier_encrypted, nonce, expires_at, purpose, google_subject, session_hash)
    VALUES ($1, $2, $3, $4, now() + interval '10 minutes', $5, $6, $7)`,
    [hashToken(state), hashToken(browser), encryptToken(verifier, config.key, state), nonce, ads ? 'ads' : 'login', ads?.subject ?? null, ads ? hashToken(ads.session) : null]);
  return { state, browser, verifier, nonce };
}

export async function consumeAttempt(state: string | null, browser: string | undefined) {
  if (!validToken(state ?? undefined) || !validToken(browser)) return undefined;
  const result = await database().query(`DELETE FROM oauth_attempts
    WHERE state_hash = $1 AND browser_hash = $2 AND expires_at > now()
    RETURNING verifier_encrypted, nonce, purpose, google_subject, session_hash`, [hashToken(state!), hashToken(browser)]);
  if (!result.rowCount) return undefined;
  return { verifier: decryptToken(result.rows[0].verifier_encrypted, authConfig().key, state!), nonce: result.rows[0].nonce as string, purpose: result.rows[0].purpose as 'login' | 'ads', subject: result.rows[0].google_subject as string | null, sessionHash: result.rows[0].session_hash as string | null };
}

export type AuthUser = { subject: string; email: string };
export async function createSession(user: AuthUser, previous?: string) {
  const token = randomToken();
  const db = await database().connect();
  try {
    await db.query('BEGIN');
    await db.query(`INSERT INTO app_users (google_subject, email) VALUES ($1, $2)
      ON CONFLICT (google_subject) DO UPDATE SET email = EXCLUDED.email, updated_at = now()`, [user.subject, user.email]);
    await db.query('DELETE FROM auth_sessions WHERE expires_at <= now()');
    if (validToken(previous)) await db.query('DELETE FROM auth_sessions WHERE token_hash = $1', [hashToken(previous)]);
    await db.query(`INSERT INTO auth_sessions (token_hash, google_subject, expires_at)
      VALUES ($1, $2, now() + interval '7 days')`, [hashToken(token), user.subject]);
    await db.query('COMMIT');
    return token;
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally { db.release(); }
}

export async function sessionUser(token: string | undefined): Promise<AuthUser | undefined> {
  if (!validToken(token)) return undefined;
  const result = await database().query(`SELECT u.google_subject, u.email FROM auth_sessions s
    JOIN app_users u ON u.google_subject = s.google_subject
    WHERE s.token_hash = $1 AND s.expires_at > now()`, [hashToken(token)]);
  const row = result.rows[0];
  if (!row || !allowedEmails().includes(row.email.toLowerCase())) return undefined;
  return { subject: row.google_subject, email: row.email };
}

export async function deleteSession(token: string | undefined) {
  if (validToken(token)) await database().query('DELETE FROM auth_sessions WHERE token_hash = $1', [hashToken(token)]);
}
