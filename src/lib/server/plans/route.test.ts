// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ user: vi.fn(), origin: vi.fn(), create: vi.fn(), decide: vi.fn(), list: vi.fn(), settings: vi.fn() }));
vi.mock('../auth/http', () => ({ privateHeaders: { 'cache-control': 'no-store' }, requireUser: mocks.user, requireSameOrigin: mocks.origin }));
vi.mock('./service', () => ({ createPlan: mocks.create, decidePlan: mocks.decide, listPlans: mocks.list }));
vi.mock('./settings', () => ({ currentSettings: mocks.settings, fingerprint: () => 'a'.repeat(64) }));
vi.mock('../google-ads/api', () => ({ AdsError: class extends Error {}, adsErrorMessage: () => 'Ads error' }));
import { GET, POST, PATCH } from '../../../routes/api/plans/+server';
const event = (method = 'POST', body = '{}') => ({ request: new Request('http://localhost/api/plans', { method, body: method === 'GET' ? undefined : body }), url: new URL('http://localhost/api/plans?customerId=2222222222&campaignId=42'), setHeaders: vi.fn(), cookies: {} }) as unknown as Parameters<typeof POST>[0];
beforeEach(() => { vi.resetAllMocks(); mocks.user.mockResolvedValue({ subject: 'verified-owner' }); mocks.list.mockResolvedValue([]); });
describe('Execution Plan API authorization', () => {
  it('requires authentication for reads, creation and approval', async () => {
    mocks.user.mockRejectedValue(new Error('Unauthorized'));
    for (const handler of [GET, POST, PATCH]) await expect(handler(event())).rejects.toThrow('Unauthorized');
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.decide).not.toHaveBeenCalled();
  });
  it('rejects cross-origin mutations', async () => {
    mocks.origin.mockImplementation(() => { throw new Error('Forbidden'); });
    for (const handler of [POST, PATCH]) await expect(handler(event())).rejects.toThrow('Forbidden');
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.decide).not.toHaveBeenCalled();
  });
  it('uses authenticated identity and disables caching', async () => {
    const e = event('GET'); const result = await GET(e);
    expect(await result.json()).toEqual({ plans: [] });
    expect(mocks.list).toHaveBeenCalledWith('verified-owner', '2222222222', '42');
    expect(e.setHeaders).toHaveBeenCalledWith({ 'cache-control': 'no-store' });
    await POST(event('POST', '{"subject":"attacker"}'));
    expect(mocks.create).toHaveBeenCalledWith('verified-owner', { subject: 'attacker' });
  });
  it('sanitizes database errors and rejects invalid JSON', async () => {
    mocks.decide.mockRejectedValue(new Error('private token'));
    const result = await PATCH(event('PATCH'));
    expect(result.status).toBe(502); expect(JSON.stringify(await result.json())).not.toContain('private');
    expect((await POST(event('POST', 'invalid'))).status).toBe(400);
  });
});
