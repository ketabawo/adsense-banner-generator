import type { Targeting } from './targeting';
import type { Creative } from './creative';

export type CampaignObjective = 'traffic' | 'conversion';
export type CampaignStatus = 'draft' | 'ready';
export type GoogleAdsBidding = 'maximize_clicks' | 'maximize_conversions';

export type GoogleAdsSettings = {
  channel: 'google_ads';
  campaignType: 'display';
  adName: string;
  /** Legacy display label; targeting is authoritative when present. */
  location: string;
  targeting?: Targeting;
  language: 'ja';
  bidding: GoogleAdsBidding;
  initialState: 'paused';
};

export type Campaign = {
  id: string;
  name: string;
  landingPageUrl: string;
  objective: CampaignObjective;
  dailyBudget: number;
  startDate: string;
  endDate?: string;
  targetKpi: {
    type: 'cpa' | 'cpc';
    value: number;
  };
  status: CampaignStatus;
  creative: Creative;
  googleAds: GoogleAdsSettings;
  createdAt: string;
  updatedAt: string;
};

export type GoogleAdsDraft = Omit<GoogleAdsSettings, 'channel' | 'campaignType' | 'language' | 'initialState'>;

export type CampaignDraft = {
  name: string;
  landingPageUrl: string;
  objective: CampaignObjective;
  dailyBudget?: number;
  startDate: string;
  endDate?: string;
  targetKpi: {
    type: 'cpa' | 'cpc';
    value?: number;
  };
};
