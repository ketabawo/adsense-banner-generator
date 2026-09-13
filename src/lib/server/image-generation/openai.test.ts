// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const config = vi.hoisted(() => ({ OPENAI_API_KEY: 'private-test-key', OPENAI_IMAGE_MODEL: '' }));
vi.mock('$env/dynamic/private', () => ({ env: config }));
import { generateBackground } from './openai';

const fetcher = vi.fn();
beforeEach(() => { vi.resetAllMocks(); config.OPENAI_API_KEY = 'private-test-key'; vi.stubGlobal('fetch', fetcher); });
afterEach(() => vi.unstubAllGlobals());

it('sends the brief to the image API and returns a local image data URL', async () => {
  fetcher.mockResolvedValue(new Response(JSON.stringify({ data: [{ b64_json: 'dGVzdA==' }] })));
  await expect(generateBackground('秋の森')).resolves.toBe('data:image/webp;base64,dGVzdA==');
  const [url, options] = fetcher.mock.calls[0];
  expect(url).toBe('https://api.openai.com/v1/images/generations');
  const body = JSON.parse(options.body);
  expect(body).toMatchObject({ model: 'gpt-image-2.5-flare', size: '1024x1024', quality: 'medium', output_format: 'webp' });
  expect(body.prompt).toContain('秋の森');
  expect(body.prompt).toContain('Do not add any letters');
});

it('does not expose provider errors or call without a key', async () => {
  fetcher.mockResolvedValue(new Response(JSON.stringify({ error: { message: 'private-account' } }), { status: 500 }));
  const error = await generateBackground('景色').catch(error => error);
  expect(error.message).not.toContain('private-account');
  config.OPENAI_API_KEY = '';
  await expect(generateBackground('景色')).rejects.toMatchObject({ status: 503 });
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('rejects missing and oversized image data', async () => {
  fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ data: [] })));
  await expect(generateBackground('景色')).rejects.toMatchObject({ status: 502 });
  fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ b64_json: 'x'.repeat(16_000_001) }] })));
  await expect(generateBackground('景色')).rejects.toMatchObject({ status: 502 });
});
