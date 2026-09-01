import { createDefaultCreativeState } from '$lib/banner/defaultState';
import type { Campaign, CampaignDraft, GoogleAdsDraft } from '$lib/types/campaign';

export function campaignDraft(overrides: Partial<CampaignDraft> = {}): CampaignDraft {
  return {
    name: '画像テスト',
    landingPageUrl: 'https://example.com',
    objective: 'traffic',
    dailyBudget: 1000,
    startDate: '2026-09-01',
    endDate: '',
    targetKpi: { type: 'cpc', value: 100 },
    ...overrides
  };
}

export function adsDraft(overrides: Partial<GoogleAdsDraft> = {}): GoogleAdsDraft {
  return { adName: 'テスト広告', location: '日本', bidding: 'maximize_clicks', ...overrides };
}

export function campaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'campaign-1',
    name: '画像テスト',
    landingPageUrl: 'https://example.com',
    objective: 'traffic',
    dailyBudget: 1000,
    startDate: '2026-09-01',
    endDate: '',
    targetKpi: { type: 'cpc', value: 100 },
    status: 'draft',
    creative: {
      id: 'creative-1',
      name: '画像テスト Creative',
      source: { type: 'studio', state: createDefaultCreativeState() }
    },
    googleAds: {
      channel: 'google_ads',
      campaignType: 'display',
      adName: 'テスト広告',
      location: '日本',
      language: 'ja',
      bidding: 'maximize_clicks',
      initialState: 'paused'
    },
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides
  };
}
