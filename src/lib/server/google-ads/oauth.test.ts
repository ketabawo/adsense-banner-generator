// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getToken: vi.fn(), verify: vi.fn(), save: vi.fn(), load: vi.fn() }));
vi.mock('../auth/config', () => ({ authConfig: () => ({ clientId: 'client' }) }));
vi.mock('../auth/google', () => ({
  googleOAuthClient: () => ({ getToken: mocks.getToken, verifyIdToken: mocks.verify }),
  allowedIdentity: (payload: { sub: string }) => ({ subject: payload.sub })
}));
vi.mock('./connections', () => ({ saveRefreshToken: mocks.save, loadRefreshToken: mocks.load }));
import { ADS_SCOPE, connectAds } from './oauth';
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getToken.mockResolvedValue({ tokens: { id_token: 'id', scope: `openid email ${ADS_SCOPE}`, refresh_token: 'refresh' } });
  mocks.verify.mockResolvedValue({ getPayload: () => ({ sub: 'owner' }) });
});
describe('Ads authorization', () => {
  it('stores refresh token only for the matching verified identity', async () => {
    await connectAds('code', { verifier: 'verifier', nonce: 'nonce' }, 'owner');
    expect(mocks.save).toHaveBeenCalledWith('owner', 'refresh');
  });
  it('rejects a different Google account', async () => {
    await expect(connectAds('code', { verifier: 'verifier', nonce: 'nonce' }, 'other')).rejects.toThrow();
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('rejects consent without the Ads scope', async () => {
    mocks.getToken.mockResolvedValue({ tokens: { id_token: 'id', scope: 'openid email', refresh_token: 'refresh' } });
    await expect(connectAds('code', { verifier: 'verifier', nonce: 'nonce' }, 'owner')).rejects.toThrow();
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('preserves an existing refresh token when Google omits a new one', async () => {
    mocks.getToken.mockResolvedValue({ tokens: { id_token: 'id', scope: ADS_SCOPE } });
    mocks.load.mockResolvedValue('existing');
    await connectAds('code', { verifier: 'verifier', nonce: 'nonce' }, 'owner');
    expect(mocks.save).not.toHaveBeenCalled();
    mocks.load.mockResolvedValue(undefined);
    await expect(connectAds('code', { verifier: 'verifier', nonce: 'nonce' }, 'owner')).rejects.toThrow();
  });
});
