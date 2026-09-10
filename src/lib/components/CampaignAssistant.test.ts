import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CampaignAssistant from './CampaignAssistant.svelte';
const props = { customerId: '2222222222', campaignId: '42', days: 30, start: '2026-08-11', end: '2026-09-09' };
const reply = { advice: { summary: '成果は判断できません。', observations: ['配信実績は0です。'], limitations: ['テスト環境です。'], recommendations: [{ title: '計測を確認', reason: '実績がありません。', nextStep: '計測対象を整理しましょう。' }] }, context: { ...props, testAccount: true, fetchedAt: '2026-09-10T00:00:00Z' } };
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
afterEach(() => vi.unstubAllGlobals());
describe('CampaignAssistant', () => {
  it('explains missing configuration and can recheck it', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response({ configured: false })).mockResolvedValueOnce(response({ configured: true }));
    vi.stubGlobal('fetch', fetcher); render(CampaignAssistant, props);
    expect(await screen.findByText(/AI相談は未設定/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: '設定を再確認' }));
    expect(await screen.findByRole('textbox')).toBeInTheDocument();
    expect(fetcher.mock.calls.every(call => !call[1]?.method)).toBe(true);
  });
  it('sends only on submit, supports follow-up and clears history', async () => {
    const fetcher = vi.fn().mockImplementation((_url, init) => Promise.resolve(response(init?.method === 'POST' ? reply : { configured: true })));
    vi.stubGlobal('fetch', fetcher); render(CampaignAssistant, props);
    await screen.findByRole('textbox');
    await fireEvent.click(screen.getByRole('button', { name: '今の状況を説明して' }));
    expect(fetcher).toHaveBeenCalledTimes(1);
    await fireEvent.click(screen.getByRole('button', { name: 'AIに相談する' }));
    expect(await screen.findByText('成果は判断できません。')).toBeInTheDocument();
    expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({ ...props, question: '今の状況を説明して', history: [] });
    await fireEvent.input(screen.getByRole('textbox'), { target: { value: '詳しく教えて' } });
    await fireEvent.click(screen.getByRole('button', { name: 'AIに相談する' }));
    await waitFor(() => expect(screen.getAllByText('成果は判断できません。')).toHaveLength(2));
    expect(JSON.parse(fetcher.mock.calls[2][1].body).history).toHaveLength(2);
    await fireEvent.click(screen.getByRole('button', { name: '会話をクリア' }));
    expect(screen.queryByText('成果は判断できません。')).not.toBeInTheDocument();
  });
  it('preserves input after API failure and renders no fake answer', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response({ configured: true })).mockResolvedValueOnce(response({ message: 'AIの利用上限に達しました。' }, 502));
    vi.stubGlobal('fetch', fetcher); render(CampaignAssistant, props);
    await fireEvent.input(await screen.findByRole('textbox'), { target: { value: '今の状況は？' } });
    await fireEvent.click(screen.getByRole('button', { name: 'AIに相談する' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('利用上限');
    expect(screen.getByRole('textbox')).toHaveValue('今の状況は？');
    expect(screen.queryByText('AIの回答')).not.toBeInTheDocument();
  });
  it('aborts a pending request when the selected context is unmounted', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response({ configured: true })).mockImplementationOnce(() => new Promise(() => {}));
    vi.stubGlobal('fetch', fetcher); const view = render(CampaignAssistant, props);
    await fireEvent.input(await screen.findByRole('textbox'), { target: { value: '説明して' } });
    await fireEvent.click(screen.getByRole('button', { name: 'AIに相談する' }));
    expect(screen.getByRole('button', { name: 'AIに相談中…' })).toBeDisabled();
    const signal = fetcher.mock.calls[1][1].signal as AbortSignal;
    view.unmount(); expect(signal.aborted).toBe(true);
  });
});
