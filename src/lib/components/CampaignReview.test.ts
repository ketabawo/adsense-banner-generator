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
});
