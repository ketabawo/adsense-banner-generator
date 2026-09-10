// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ user: vi.fn(), origin: vi.fn(), consult: vi.fn(), configured: vi.fn() }));
vi.mock('../auth/http', () => ({ privateHeaders: { 'cache-control': 'no-store' }, requireUser: mocks.user, requireSameOrigin: mocks.origin }));
vi.mock('./service', () => ({ consultCampaign: mocks.consult }));
vi.mock('./openai', () => ({ assistantConfigured: mocks.configured }));
vi.mock('../google-ads/api', () => ({ AdsError: class extends Error {}, adsErrorMessage: () => 'Ads error' }));
vi.mock('../google-ads/performance', () => ({ PerformanceInputError: class extends Error {} }));
import { GET, POST } from '../../../routes/api/assistant/+server';
const event = (body = '{}') => ({ request: new Request('http://localhost/api/assistant', { method: 'POST', body }), setHeaders: vi.fn(), cookies: {} }) as unknown as Parameters<typeof POST>[0];
beforeEach(() => { vi.resetAllMocks(); mocks.user.mockResolvedValue({ subject: 'verified-owner' }); mocks.configured.mockReturnValue(false); });
describe('assistant API authorization', () => {
  it('returns only configuration availability with no-store', async () => {
    const e = event(); const result = await GET(e);
    expect(await result.json()).toEqual({ configured: false });
    expect(e.setHeaders).toHaveBeenCalledWith({ 'cache-control': 'no-store' });
  });
  it('requires authentication for both methods', async () => {
    mocks.user.mockRejectedValue(new Error('Unauthorized'));
    await expect(GET(event())).rejects.toThrow('Unauthorized');
    await expect(POST(event())).rejects.toThrow('Unauthorized');
    expect(mocks.consult).not.toHaveBeenCalled();
  });
  it('rejects cross-origin POST before any AI call', async () => {
    mocks.origin.mockImplementation(() => { throw new Error('Forbidden'); });
    await expect(POST(event())).rejects.toThrow('Forbidden'); expect(mocks.consult).not.toHaveBeenCalled();
  });
  it('uses server identity and sanitizes unexpected errors', async () => {
    mocks.consult.mockRejectedValue(new Error('secret token'));
    const result = await POST(event('{"subject":"attacker"}'));
    expect(mocks.consult).toHaveBeenCalledWith('verified-owner', { subject: 'attacker' });
    expect(result.status).toBe(502); expect(JSON.stringify(await result.json())).not.toContain('secret token');
  });
  it('rejects invalid JSON before consulting', async () => {
    const result = await POST(event('not json')); expect(result.status).toBe(400); expect(mocks.consult).not.toHaveBeenCalled();
  });
});
