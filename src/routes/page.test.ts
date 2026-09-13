import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeAll, expect, it, vi } from 'vitest';
import { loadCreativeLibrary, removeLibraryCreative } from '$lib/creative/library';
import { loadCampaigns } from '$lib/campaign/storage';
import Page from './+page.svelte';

vi.mock('$lib/components/GoogleAccount.svelte', () => ({ default: () => null }));
beforeAll(() => vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null));
beforeAll(() => vi.stubGlobal('requestAnimationFrame', () => 0));
beforeAll(() => vi.stubGlobal('scrollTo', () => {}));

it('制作専用サイズを追加して下書き保存後、開き直しても両サイズが残る', async () => {
  const previous = await loadCreativeLibrary();
  await Promise.all(previous.map(item => removeLibraryCreative(item.id)));
  const page = render(Page);
  try {
    await fireEvent.input(screen.getByLabelText('Campaign名'), { target: { value: 'Variant保存テスト' } });
    await fireEvent.input(screen.getByLabelText('Landing Page URL'), { target: { value: 'https://example.com' } });
    await fireEvent.input(screen.getByLabelText('1日の予算（円）'), { target: { value: '1000' } });
    await fireEvent.input(screen.getByLabelText('目標CPC（円）'), { target: { value: '100' } });
    await fireEvent.input(screen.getByLabelText('広告名'), { target: { value: 'Variant保存テスト広告' } });
    await fireEvent.change(screen.getByLabelText('別のサイズを作る'), { target: { value: '1200x628' } });
    await fireEvent.click(screen.getByRole('button', { name: 'サイズを追加' }));
    expect(screen.getByRole('button', { name: /Landscape 1200 × 628 · 背景画像なし · 編集中/ })).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Reviewへ進む' }));
    await fireEvent.click(screen.getByRole('button', { name: '下書きを保存' }));
    await waitFor(() => expect(screen.getByText('「Variant保存テスト」を下書き保存しました。')).toBeInTheDocument());
    expect(loadCampaigns()).toHaveLength(1);
    const creative = (await loadCreativeLibrary()).find(item => item.id === loadCampaigns()[0].creative.id);
    expect(creative?.variants).toHaveLength(2);
    page.unmount();
    render(Page);
    await fireEvent.click(await screen.findByRole('button', { name: /Variant保存テスト.*アクセス/ }));
    expect(await screen.findByRole('button', { name: /Landscape 1200 × 628 · 背景画像なし/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /300 × 250（レクタングル） · 背景画像なし/ })).toBeInTheDocument();
  } finally {
    for (const item of await loadCreativeLibrary()) await removeLibraryCreative(item.id);
  }
});
