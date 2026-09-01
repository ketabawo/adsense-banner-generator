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
      creative,
      onCancel: vi.fn(),
      onConfirm: vi.fn()
    });

    expect(screen.getByLabelText('入稿するCreativeのプレビュー')).toBeInTheDocument();
    expect(screen.getByText(`${creative.size.width} × ${creative.size.height}px`)).toBeInTheDocument();
    expect(screen.getByText('https://example.com')).toBeInTheDocument();
    expect(screen.getByText(/あなたのサービスを/)).toBeInTheDocument();
    expect(screen.queryByText('Creative', { selector: 'dt' })).not.toBeInTheDocument();
  });
});
