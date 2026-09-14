// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const config = vi.hoisted(() => ({ OPENAI_API_KEY: 'test-private-key', OPENAI_MODEL: 'gpt-4.1-mini' }));
vi.mock('$env/dynamic/private', () => ({ env: config }));
import { consultCreative, parseCreativeInput } from './creative';
import { createDefaultCreativeState } from '$lib/banner/defaultState';
import { copyContext } from '$lib/creative/copy';

const context = copyContext(createDefaultCreativeState());
const proposal = { reason: '短くしました。', copy: { headline: 'サービスを届けよう', subText: '広告を簡単作成', cta: '内容を見る' } };
const fetcher = vi.fn();
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
const complete = (data: unknown) => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(data) }] }] });
beforeEach(() => { vi.resetAllMocks(); vi.stubGlobal('fetch', fetcher); });
afterEach(() => vi.unstubAllGlobals());

it('sends only whitelisted text context, uses strict output and does not store responses', async () => {
  fetcher.mockResolvedValue(reply(complete(proposal)));
  await expect(consultCreative({ question: '短くして', context: { ...context, image: 'private-image', account: 'secret' }, token: 'secret' })).resolves.toEqual(proposal);
  const body = JSON.parse(fetcher.mock.calls[0][1].body);
  expect(JSON.parse(body.input)).toEqual({ question: '短くして', context });
  expect(body).toMatchObject({ model: config.OPENAI_MODEL, store: false, text: { format: { type: 'json_schema', name: 'creative_copy', strict: true } } });
  expect(body.tools).toBeUndefined();
  expect(JSON.stringify(body)).not.toMatch(/private-image|secret/);
});
it('preserves disabled text even when the provider changes it', async () => {
  fetcher.mockResolvedValue(reply(complete(proposal)));
  const result = await consultCreative({ question: '短くして', context: { ...context, enabled: { subText: false, cta: false } } });
  expect(result.copy).toEqual({ ...context.copy, headline: proposal.copy.headline });
});
it.each([
  null, {}, { question: '', context }, { question: 'x'.repeat(2001), context },
  { question: '変更', context: { ...context, size: { width: -1, height: 250 } } },
  { question: '変更', context: { ...context, enabled: { subText: 'yes', cta: true } } },
  { question: '変更', context: { ...context, copy: { ...context.copy, headline: 'x'.repeat(2001) } } },
  { question: '変更', context: { ...context, copy: { ...context.copy, background: 'image' } } }
])('rejects invalid input without calling OpenAI', async value => {
  expect(() => parseCreativeInput(value)).toThrow();
  await expect(consultCreative(value)).rejects.toMatchObject({ status: 400 });
  expect(fetcher).not.toHaveBeenCalled();
});
it.each([
  { status: 'incomplete', output: [] },
  { status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal' }] }] },
  complete({ ...proposal, copy: { ...proposal.copy, cta: 42 } }),
  complete({ ...proposal, reason: 'x'.repeat(1001) }),
  complete({ ...proposal, copy: { ...proposal.copy, background: 'override' } })
])('rejects incomplete or invalid model proposals', async data => {
  fetcher.mockResolvedValue(reply(data));
  await expect(consultCreative({ question: '短くして', context })).rejects.toMatchObject({ status: 502 });
});
it('does not expose provider errors or retry a failed paid request', async () => {
  fetcher.mockResolvedValue(reply({ error: 'test-private-key private-data' }, 429));
  const error = await consultCreative({ question: '短くして', context }).catch(error => error);
  expect(error.status).toBe(502); expect(error.message).not.toMatch(/private/);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
