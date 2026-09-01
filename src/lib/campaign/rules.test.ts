import { describe, expect, it } from 'vitest';
import { settingsForObjective, validateCampaignDraft, withoutCampaign } from './rules';
import { adsDraft, campaign, campaignDraft } from '../../test/fixtures';

describe('Campaign入力ルール', () => {
  it('アクセス目的をCPCとクリック最大化へ連動する', () => {
    expect(settingsForObjective('traffic')).toEqual({ kpiType: 'cpc', bidding: 'maximize_clicks' });
  });

  it('コンバージョン目的をCPAとコンバージョン最大化へ連動する', () => {
    expect(settingsForObjective('conversion')).toEqual({ kpiType: 'cpa', bidding: 'maximize_conversions' });
  });

  it('正常な入力をReview可能と判定する', () => {
    expect(validateCampaignDraft(campaignDraft(), adsDraft())).toEqual({ valid: true, message: '', dateError: '' });
  });

  it('開始日がない場合はReviewへ進ませない', () => {
    const result = validateCampaignDraft(campaignDraft({ startDate: '' }), adsDraft());
    expect(result.valid).toBe(false);
    expect(result.dateError).toBe('開始日を入力してください。');
  });

  it('終了日が開始日より前の場合はReviewへ進ませない', () => {
    const result = validateCampaignDraft(campaignDraft({ startDate: '2026-09-10', endDate: '2026-09-01' }), adsDraft());
    expect(result.valid).toBe(false);
    expect(result.dateError).toBe('終了日は開始日以降の日付を指定してください。');
  });

  it('終了日と開始日が同じ場合は許可する', () => {
    const result = validateCampaignDraft(campaignDraft({ startDate: '2026-09-10', endDate: '2026-09-10' }), adsDraft());
    expect(result.valid).toBe(true);
  });

  it.each(['ftp://example.com', 'not-a-url'])('不正なLanding Page URL「%s」を拒否する', (landingPageUrl) => {
    expect(validateCampaignDraft(campaignDraft({ landingPageUrl }), adsDraft()).message).toBe('Landing Page URLを正しく入力してください。');
  });

  it('指定したCampaignだけを削除する', () => {
    const campaigns = [campaign(), campaign({ id: 'campaign-2', name: '残すCampaign' })];
    expect(withoutCampaign(campaigns, 'campaign-1').map((item) => item.id)).toEqual(['campaign-2']);
  });
});
