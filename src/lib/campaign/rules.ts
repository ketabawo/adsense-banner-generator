import type { Campaign, CampaignDraft, GoogleAdsBidding, GoogleAdsDraft } from '$lib/types/campaign';

export type CampaignValidation = {
  valid: boolean;
  message: string;
  dateError: string;
};

export function settingsForObjective(objective: CampaignDraft['objective']): {
  kpiType: CampaignDraft['targetKpi']['type'];
  bidding: GoogleAdsBidding;
} {
  return objective === 'traffic'
    ? { kpiType: 'cpc', bidding: 'maximize_clicks' }
    : { kpiType: 'cpa', bidding: 'maximize_conversions' };
}

export function validateCampaignDraft(draft: CampaignDraft, googleAds: GoogleAdsDraft): CampaignValidation {
  if (!draft.name.trim() || !draft.landingPageUrl.trim() || !draft.dailyBudget || draft.dailyBudget <= 0 || !draft.targetKpi.value || draft.targetKpi.value <= 0) {
    return { valid: false, message: 'Campaign名、URL、予算、目標KPIを正しく入力してください。', dateError: '' };
  }
  if (!draft.startDate) {
    const message = '開始日を入力してください。';
    return { valid: false, message, dateError: message };
  }
  if (draft.endDate && draft.endDate < draft.startDate) {
    const message = '終了日は開始日以降の日付を指定してください。';
    return { valid: false, message, dateError: message };
  }
  try {
    const url = new URL(draft.landingPageUrl);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('invalid protocol');
  } catch {
    return { valid: false, message: 'Landing Page URLを正しく入力してください。', dateError: '' };
  }
  if (!googleAds.adName.trim() || !googleAds.location.trim()) {
    return { valid: false, message: 'Google Adsの広告名と配信地域を入力してください。', dateError: '' };
  }
  return { valid: true, message: '', dateError: '' };
}

export function withoutCampaign(campaigns: Campaign[], id: string) {
  return campaigns.filter((campaign) => campaign.id !== id);
}
