import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, expect, it, vi } from 'vitest';
import { createDefaultCreativeState } from '$lib/banner/defaultState';
import CreativeAssistant from './CreativeAssistant.svelte';
const proposal = { reason: '読みやすく短くしました。', copy: { headline: 'もっと多くの人へ', subText: '広告を簡単作成', cta: '内容を見る' } };
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
afterEach(() => vi.unstubAllGlobals());
function setup() {
  const fetcher = vi.fn().mockImplementation((_url, init) => Promise.resolve(response(init?.method === 'POST' ? proposal : { configured: true })));
  vi.stubGlobal('fetch', fetcher);
  const creative = createDefaultCreativeState();
  const onApply = vi.fn().mockReturnValue(true);
  const view = render(CreativeAssistant, { creative, signedIn: true, onApply });
  return { fetcher, creative, onApply, view };
}
async function ask() {
  await fireEvent.input(await screen.findByLabelText('コピーの相談内容'), { target: { value: '短くして' } });
  await fireEvent.click(screen.getByRole('button', { name: 'コピーの修正案を作る' }));
}
it('shows a comparison without applying, applies explicitly once, and can dismiss', async () => {
  const { onApply, creative, fetcher } = setup(); const original = structuredClone(creative);
  await ask(); await screen.findByText(proposal.reason);
  expect(screen.getAllByText('変更前')).toHaveLength(3);
  expect(creative).toEqual(original); expect(onApply).not.toHaveBeenCalled();
  expect(JSON.parse(fetcher.mock.calls[1][1].body).context.copy.headline).toBe(original.headline.text);
  await fireEvent.click(screen.getByRole('button', { name: 'この修正案を適用' }));
  expect(onApply).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: '適用済み' })).toBeDisabled();
  await fireEvent.click(screen.getByRole('button', { name: '修正案を閉じる' }));
  expect(screen.queryByText(proposal.reason)).not.toBeInTheDocument();
});
it('blocks an old proposal after manual editing', async () => {
  const { view, creative, onApply } = setup();
  await ask(); await screen.findByText(proposal.reason);
  await view.rerender({ creative: { ...creative, headline: { ...creative.headline, text: '手動修正' } } });
  expect(screen.getByRole('button', { name: 'この修正案を適用' })).toBeDisabled();
  expect(screen.getByText(/この案は適用できません/)).toBeInTheDocument();
  expect(onApply).not.toHaveBeenCalled();
});
it('aborts in-flight work when switching editor or logging out', async () => {
  const { fetcher, view, onApply } = setup();
  fetcher.mockImplementationOnce(() => new Promise(() => {}));
  await ask();
  expect(screen.getByRole('button', { name: '修正案を作成中…' })).toBeDisabled();
  view.unmount();
  expect(fetcher.mock.calls[1][1].signal.aborted).toBe(true);
  expect(onApply).not.toHaveBeenCalled();
});
it('preserves input on failure and allows retry', async () => {
  const { fetcher } = setup();
  fetcher.mockResolvedValueOnce(response({ message: 'AIの利用上限です。' }, 502));
  await ask(); expect(await screen.findByRole('alert')).toHaveTextContent('利用上限');
  expect(screen.getByLabelText('コピーの相談内容')).toHaveValue('短くして');
  await fireEvent.click(screen.getByRole('button', { name: 'コピーの修正案を作る' }));
  expect(await screen.findByText(proposal.reason)).toBeInTheDocument();
});
it('does not request AI configuration or proposals when logged out', async () => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  render(CreativeAssistant, { creative: createDefaultCreativeState(), signedIn: false, onApply: vi.fn() });
  expect(screen.getByText(/ページ上部からGoogleでログイン/)).toBeInTheDocument();
  expect(fetcher).not.toHaveBeenCalled();
});
it('rejects malformed proposals without showing an apply action', async () => {
  const { fetcher } = setup();
  await screen.findByLabelText('コピーの相談内容');
  fetcher.mockResolvedValueOnce(response({ ...proposal, copy: { cta: 'bad' } }));
  await ask(); await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  expect(screen.queryByRole('button', { name: 'この修正案を適用' })).not.toBeInTheDocument();
});
