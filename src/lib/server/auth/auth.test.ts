// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import type { TokenPayload } from 'google-auth-library';
const { config } = vi.hoisted(() => ({ config: {
  GOOGLE_CLIENT_ID: 'test-client', GOOGLE_CLIENT_SECRET: 'test-secret', ORIGIN: 'http://localhost:5173',
  DATABASE_URL: 'test', TOKEN_ENCRYPTION_KEY: 'ab'.repeat(32), AUTH_ALLOWED_EMAILS: 'owner@example.com'
} }));
vi.mock('$env/dynamic/private', () => ({ env: config }));
import { allowedIdentity, authorizationUrl } from './google';
import { authConfigured } from './config';
import { requireSameOrigin } from './http';

const payload = { sub: 'google-owner', email: 'owner@example.com', email_verified: true, nonce: 'nonce' } as TokenPayload & { nonce: string };
describe('Google login safeguards', () => {
  it('limits permissions and binds the request to state, nonce and PKCE', () => {
    const url = new URL(authorizationUrl({ state: 'state', nonce: 'nonce', verifier: 'verifier' }));
    expect(url.origin).toBe('https://accounts.google.com');
    expect(url.searchParams.get('scope')).toBe('openid email');
    expect(url.searchParams.get('state')).toBe('state');
    expect(url.searchParams.get('nonce')).toBe('nonce');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).not.toBe('verifier');
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:5173/auth/google/callback');
    expect(url.toString()).not.toContain('test-secret');
  });
  it('allows verified allowlisted identities only', () => {
    expect(allowedIdentity(payload, 'nonce')).toEqual({ subject: 'google-owner', email: 'owner@example.com' });
    expect(() => allowedIdentity({ ...payload, email_verified: false }, 'nonce')).toThrow();
    expect(() => allowedIdentity({ ...payload, email: 'other@example.com' }, 'nonce')).toThrow();
    expect(() => allowedIdentity(payload, 'other-nonce')).toThrow();
    expect(() => allowedIdentity(undefined, 'nonce')).toThrow();
  });
  it('rejects missing and foreign origins on mutations', () => {
    expect(() => requireSameOrigin(new Request('http://localhost:5173/auth/logout', { headers: { origin: config.ORIGIN } }))).not.toThrow();
    expect(() => requireSameOrigin(new Request('http://localhost:5173/auth/logout'))).toThrow();
    expect(() => requireSameOrigin(new Request('http://localhost:5173/auth/logout', { headers: { origin: 'https://foreign.example' } }))).toThrow();
  });
  it('fails closed when no owner is configured or origin is unsafe', () => {
    config.AUTH_ALLOWED_EMAILS = '';
    expect(authConfigured()).toBe(false);
    config.AUTH_ALLOWED_EMAILS = 'owner@example.com';
    config.ORIGIN = 'http://public.example';
    expect(authConfigured()).toBe(false);
    config.ORIGIN = 'http://localhost:5173';
    expect(authConfigured()).toBe(true);
  });
});
