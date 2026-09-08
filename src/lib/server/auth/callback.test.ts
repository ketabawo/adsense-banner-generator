// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
const mocks = vi.hoisted(() => ({ consume: vi.fn(), exchange: vi.fn(), create: vi.fn(), session: vi.fn(), connectAds: vi.fn() }));
vi.mock('$lib/server/auth/config', () => ({ authConfig: () => ({ secure: true }) }));
vi.mock('$lib/server/auth/store', () => ({
  consumeAttempt: mocks.consume, createSession: mocks.create, sessionUser: mocks.session, hashToken: () => 'session-hash',
  FLOW_COOKIE: 'studio_oauth', SESSION_COOKIE: 'studio_session', SESSION_SECONDS: 604800
}));
vi.mock('$lib/server/google-ads/oauth', () => ({ connectAds: mocks.connectAds }));
vi.mock('$lib/server/auth/google', () => ({ exchangeIdentity: mocks.exchange }));
vi.mock('$lib/server/auth/http', () => ({ privateHeaders: { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } }));
import { GET } from '../../../routes/auth/google/callback/+server';

function event(query: string) {
  const cookies = { get: vi.fn(() => 'browser-token'), set: vi.fn(), delete: vi.fn() };
  const setHeaders = vi.fn();
  return { cookies, setHeaders, url: new URL(`https://studio.example/auth/google/callback?${query}`) };
}
async function callback(e: ReturnType<typeof event>) {
  return GET(e as unknown as RequestEvent as Parameters<typeof GET>[0]);
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.consume.mockResolvedValue({ verifier: 'verifier', nonce: 'nonce' });
  mocks.exchange.mockResolvedValue({ subject: 'owner', email: 'owner@example.com' });
  mocks.create.mockResolvedValue('new-session');
});
describe('OAuth callback', () => {
  it('binds Ads consent to the initiating logged-in session', async () => {
    mocks.consume.mockResolvedValue({ verifier: 'verifier', nonce: 'nonce', purpose: 'ads', subject: 'owner', sessionHash: 'session-hash' });
    mocks.session.mockResolvedValue({ subject: 'owner' });
    await expect(callback(event('state=state&code=code'))).rejects.toMatchObject({ location: '/auth/result?result=ads-success' });
    expect(mocks.connectAds).toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
    mocks.connectAds.mockClear();
    mocks.session.mockResolvedValue({ subject: 'other' });
    await expect(callback(event('state=state&code=code'))).rejects.toMatchObject({ location: '/auth/result?result=failed' });
    expect(mocks.connectAds).not.toHaveBeenCalled();
  });

  it('sets a protected fresh cookie only after identity verification', async () => {
    const e = event('state=state&code=secret-code');
    await expect(callback(e)).rejects.toMatchObject({ status: 303, location: '/auth/result?result=success' });
    expect(mocks.exchange).toHaveBeenCalledWith('secret-code', { verifier: 'verifier', nonce: 'nonce' });
    expect(e.cookies.set).toHaveBeenCalledWith('studio_session', 'new-session', expect.objectContaining({ httpOnly: true, secure: true, sameSite: 'lax', path: '/' }));
  });
  it('does not exchange codes when browser/state is invalid', async () => {
    mocks.consume.mockResolvedValue(undefined);
    const e = event('state=invalid&code=secret-code');
    await expect(callback(e)).rejects.toMatchObject({ location: '/auth/result?result=failed' });
    expect(mocks.exchange).not.toHaveBeenCalled();
    expect(e.cookies.set).not.toHaveBeenCalled();
  });
  it('handles denied consent without creating a session', async () => {
    const e = event('state=state&error=access_denied');
    await expect(callback(e)).rejects.toMatchObject({ location: '/auth/result?result=cancelled' });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('does not expose verification errors or establish a session', async () => {
    mocks.exchange.mockRejectedValue(new Error('secret-token-in-provider-error'));
    const e = event('state=state&code=secret-code');
    await expect(callback(e)).rejects.toMatchObject({ location: '/auth/result?result=failed' });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(e.cookies.set).not.toHaveBeenCalled();
    expect(e.cookies.delete).toHaveBeenCalledWith('studio_oauth', { path: '/auth/google' });
  });
});
