import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { loadCreativeLibrary, removeLibraryCreative } from '$lib/creative/library';
import { loadCampaigns } from '$lib/campaign/storage';
import Page from './+page.svelte';

vi.mock('$lib/components/GoogleAdsConnection.svelte', () => ({ default: () => null }));
vi.mock('$lib/components/PerformanceDashboard.svelte', () => ({ default: () => null }));
beforeAll(() => vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null));
afterEach(() => vi.unstubAllGlobals());
const proposal = { reason: 'CTAを具体的にしました。', copy: { headline: 'あなたのサービスを\nもっと多くの人へ', subText: '効果的な広告バナーを簡単作成', cta: 'サービスを見る' } };
const response = (data: unknown) => new Response(JSON.stringify(data));

it('applies into the real editor, saves and restores both variants, and clears proposals on size changes', async () => {
  vi.stubGlobal('requestAnimationFrame', () => 0); vi.stubGlobal('scrollTo', () => {});
  vi.stubGlobal('fetch', vi.fn().mockImplementation((url, init) => Promise.resolve(response(
    url === '/api/auth/session' ? { configured: true, user: { email: 'test@example.com' } }
      : init?.method === 'POST' ? proposal : { configured: true }
  ))));
  for (const item of await loadCreativeLibrary()) await removeLibraryCreative(item.id);
  let view = render(Page);
  try {
    await fireEvent.input(screen.getByLabelText('Campaign名'), { target: { value: 'コピー相談テスト' } });
    await fireEvent.input(screen.getByLabelText('Landing Page URL'), { target: { value: 'https://example.com' } });
    await fireEvent.input(screen.getByLabelText('1日の予算（円）'), { target: { value: '1000' } });
    await fireEvent.input(screen.getByLabelText('目標CPC（円）'), { target: { value: '100' } });
    await fireEvent.input(screen.getByLabelText('広告名'), { target: { value: 'コピー相談テスト広告' } });
    await fireEvent.change(screen.getByLabelText('別のサイズを作る'), { target: { value: '1200x628' } });
    await fireEvent.click(screen.getByRole('button', { name: 'サイズを追加' }));
    await fireEvent.input(await screen.findByLabelText('コピーの相談内容'), { target: { value: 'CTAを具体的にして' } });
    await fireEvent.click(screen.getByRole('button', { name: 'コピーの修正案を作る' }));
    await screen.findByText(proposal.reason);
    expect(screen.getByLabelText('ボタンテキスト')).toHaveValue('詳しく見る');
    await fireEvent.click(screen.getByRole('button', { name: 'この修正案を適用' }));
    expect(screen.getByLabelText('ボタンテキスト')).toHaveValue('サービスを見る');
    await fireEvent.click(screen.getByRole('button', { name: /300 × 250（レクタングル） · 背景画像なし/ }));
    expect(screen.queryByText(proposal.reason)).not.toBeInTheDocument();
    expect(screen.getByLabelText('ボタンテキスト')).toHaveValue('詳しく見る');
    await fireEvent.click(screen.getByRole('button', { name: /Landscape 1200 × 628 · 背景画像なし/ }));
    expect(screen.getByLabelText('ボタンテキスト')).toHaveValue('サービスを見る');
    await fireEvent.click(screen.getByRole('button', { name: 'Reviewへ進む' }));
    await fireEvent.click(screen.getByRole('button', { name: '下書きを保存' }));
    await screen.findByText('「コピー相談テスト」を下書き保存しました。');
    const saved = (await loadCreativeLibrary()).find(item => item.id === loadCampaigns()[0].creative.id)!;
    expect(saved.variants?.find(item => item.state.size.width === 1200)?.state.cta.text).toBe('サービスを見る');
    expect(saved.variants?.find(item => item.state.size.width === 300)?.state.cta.text).toBe('詳しく見る');
    view.unmount(); view = render(Page);
    await fireEvent.click(await screen.findByRole('button', { name: /コピー相談テスト.*アクセス/ }));
    await waitFor(() => expect(screen.getByLabelText('ボタンテキスト')).toHaveValue('サービスを見る'));
    expect(screen.queryByText(proposal.reason)).not.toBeInTheDocument();
  } finally {
    view.unmount();
    for (const item of await loadCreativeLibrary()) await removeLibraryCreative(item.id);
  }
});
