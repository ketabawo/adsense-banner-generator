// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ user: vi.fn(), origin: vi.fn(), consult: vi.fn() }));
vi.mock('../auth/http', () => ({ privateHeaders: { 'cache-control': 'no-store' }, requireUser: mocks.user, requireSameOrigin: mocks.origin }));
vi.mock('./creative', () => ({ consultCreative: mocks.consult }));
vi.mock('./openai', () => ({ assistantConfigured: () => true }));
import { GET, POST } from '../../../routes/api/creative-assistant/+server';
const event = (body = '{}') => ({ request: new Request('http://localhost/api/creative-assistant', { method: 'POST', body }), setHeaders: vi.fn(), cookies: {} }) as unknown as Parameters<typeof POST>[0];
beforeEach(() => { vi.resetAllMocks(); mocks.user.mockResolvedValue({ subject: 'owner' }); });
it('requires login for configuration and proposals', async () => {
  mocks.user.mockRejectedValue(new Error('Unauthorized'));
  await expect(GET(event())).rejects.toThrow('Unauthorized');
  await expect(POST(event())).rejects.toThrow('Unauthorized');
  expect(mocks.consult).not.toHaveBeenCalled();
});
it('rejects cross-origin requests before consulting', async () => {
  mocks.origin.mockImplementation(() => { throw new Error('Forbidden'); });
  await expect(POST(event())).rejects.toThrow('Forbidden');
  expect(mocks.consult).not.toHaveBeenCalled();
});
it.each(['bad json', 'x'.repeat(65537)])('bounds and validates the request body', async body => {
  expect((await POST(event(body))).status).toBe(400);
  expect(mocks.consult).not.toHaveBeenCalled();
});
it('returns configuration without caching and sanitizes unexpected failures', async () => {
  const e = event(); expect(await (await GET(e)).json()).toEqual({ configured: true });
  expect(e.setHeaders).toHaveBeenCalledWith({ 'cache-control': 'no-store' });
  mocks.consult.mockRejectedValue(new Error('private-data'));
  const result = await POST(event()); expect(result.status).toBe(502);
  expect(JSON.stringify(await result.json())).not.toContain('private-data');
});
