import { render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultCreativeState } from '$lib/banner/defaultState';
import CampaignReview from './CampaignReview.svelte';
import { adsDraft, campaignDraft } from '../../test/fixtures';

vi.mock('$lib/banner/drawBanner', () => ({ drawBanner: vi.fn(() => ({ textOverflow: false })) }));

describe('入稿前Review', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as CanvasRenderingContext2D);
  });

  it('完成Creativeと入稿情報を表示する', () => {
    const creative = createDefaultCreativeState();
    render(CampaignReview, {
      draft: campaignDraft(),
      ads: adsDraft(),
      creativeName: 'テストCreative',
      creativeSource: { type: 'studio', state: creative },
      onCancel: vi.fn(),
      onConfirm: vi.fn()
    });

    expect(screen.getByLabelText('入稿するCreativeのプレビュー')).toBeInTheDocument();
    expect(screen.getByText(`${creative.size.width} × ${creative.size.height}px`)).toBeInTheDocument();
    expect(screen.getByText('https://example.com')).toBeInTheDocument();
    expect(screen.getByText(/あなたのサービスを/)).toBeInTheDocument();
    expect(screen.queryByText('Creative', { selector: 'dt' })).not.toBeInTheDocument();
  });

  it('アップロードCreativeを画像のまま表示する', () => {
    render(CampaignReview, {
      draft: campaignDraft(),
      ads: adsDraft(),
      creativeName: 'Canva完成バナー',
      creativeSource: {
        type: 'upload',
        asset: { url: 'data:image/png;base64,test', mimeType: 'image/png', width: 300, height: 250 }
      },
      onCancel: vi.fn(),
      onConfirm: vi.fn()
    });

    expect(screen.getByText('Canva完成バナー')).toBeInTheDocument();
    expect(screen.getByAltText('入稿するCreativeのプレビュー')).toHaveAttribute('src', 'data:image/png;base64,test');
    expect(screen.getByText('完成画像アップロード')).toBeInTheDocument();
    expect(screen.getByText('PNG')).toBeInTheDocument();
  });

  it('制作専用Variantでは入稿操作を表示せず、下書き保存を許可する', () => {
    const creative = createDefaultCreativeState();
    creative.size = { id: '1200x628', width: 1200, height: 628, label: 'Landscape' };
    render(CampaignReview, { draft: campaignDraft(), ads: adsDraft(), creativeName: 'Landscape', creativeSource: { type: 'studio', state: creative }, onCancel: vi.fn(), onConfirm: vi.fn() });
    expect(screen.getByText('下書きを保存')).toBeInTheDocument();
    expect(screen.getByText(/現在の固定サイズ画像広告への入稿対象外/)).toBeInTheDocument();
    expect(screen.queryByText('テストアカウントへ入稿')).not.toBeInTheDocument();
  });

  it('サイズ別に作成したVariantをすべてReviewで表示する', () => {
    const rectangle = createDefaultCreativeState();
    const landscape = structuredClone(rectangle);
    landscape.size = { id: '1200x628', width: 1200, height: 628, label: 'Landscape 1200 × 628' };
    render(CampaignReview, { draft: campaignDraft(), ads: adsDraft(), creativeName: '複数サイズ', creativeSource: { type: 'studio', state: landscape }, variants: [{ id: 'rectangle', state: rectangle }, { id: 'landscape', state: landscape }], activeVariantId: 'landscape', onCancel: vi.fn(), onConfirm: vi.fn() });
    expect(screen.getByRole('region', { name: '作成したサイズ別バナー' })).toBeInTheDocument();
    expect(screen.getByText('Landscape 1200 × 628')).toBeInTheDocument();
    expect(screen.getByText('現在の入稿対象')).toBeInTheDocument();
    expect(screen.getByText('下書きに保存')).toBeInTheDocument();
  });
});
