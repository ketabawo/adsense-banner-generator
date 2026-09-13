// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ user: vi.fn(), origin: vi.fn(), generate: vi.fn(), configured: vi.fn() }));
vi.mock('../auth/http', () => ({ privateHeaders: { 'cache-control': 'no-store' }, requireUser: mocks.user, requireSameOrigin: mocks.origin }));
vi.mock('./openai', () => ({ generateBackground: mocks.generate, imageGenerationConfigured: mocks.configured, ImageGenerationError: class extends Error { status = 502; } }));
import { GET, POST } from '../../../routes/api/image-generation/+server';

const event = (body = '{}') => ({ request: new Request('http://localhost/api/image-generation', { method: 'POST', body }), setHeaders: vi.fn(), cookies: {} }) as unknown as Parameters<typeof POST>[0];
beforeEach(() => { vi.resetAllMocks(); mocks.user.mockResolvedValue({ subject: 'owner' }); mocks.generate.mockResolvedValue('data:image/webp;base64,dGVzdA=='); });

it('requires login and same-origin before a billable generation call', async () => {
  mocks.user.mockRejectedValueOnce(new Error('Unauthorized'));
  await expect(POST(event())).rejects.toThrow('Unauthorized');
  mocks.origin.mockImplementationOnce(() => { throw new Error('Forbidden'); });
  await expect(POST(event())).rejects.toThrow('Forbidden');
  expect(mocks.generate).not.toHaveBeenCalled();
});

it('accepts a known variant size and rejects invalid or oversized input', async () => {
  const result = await POST(event(JSON.stringify({ prompt: '森', size: '1200x628' })));
  expect(result.status).toBe(200);
  expect(mocks.generate).toHaveBeenCalledWith('森', '1200x628');
  expect((await POST(event(JSON.stringify({ prompt: '森', size: '9999x9999' })))).status).toBe(400);
  expect((await POST(event(JSON.stringify({ prompt: 'x'.repeat(9000) })))).status).toBe(413);
  expect(mocks.generate).toHaveBeenCalledTimes(1);
});

it('exposes only availability on GET', async () => {
  mocks.configured.mockReturnValue(true);
  expect(await (await GET(event())).json()).toEqual({ configured: true });
});
