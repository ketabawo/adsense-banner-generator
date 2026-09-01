import type { Campaign } from '$lib/types/campaign';

const STORAGE_KEY = 'studio.campaigns.v1';
const STORAGE_VERSION = 1;
const MAX_STORAGE_BYTES = 4_500_000;

type StoredCampaigns = {
  version: typeof STORAGE_VERSION;
  campaigns: Campaign[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCreativeSource(value: unknown) {
  if (!isRecord(value)) return false;
  if (value.type === 'studio') {
    const state = value.state;
    return isRecord(state)
      && isRecord(state.size)
      && typeof state.size.width === 'number'
      && typeof state.size.height === 'number'
      && isRecord(state.background)
      && isRecord(state.headline)
      && isRecord(state.subText)
      && isRecord(state.cta);
  }
  if (value.type === 'upload') {
    const asset = value.asset;
    return isRecord(asset)
      && typeof asset.url === 'string'
      && ['image/png', 'image/jpeg', 'image/webp'].includes(String(asset.mimeType))
      && typeof asset.width === 'number'
      && asset.width > 0
      && typeof asset.height === 'number'
      && asset.height > 0;
  }
  return false;
}

function isCampaign(value: unknown): value is Campaign {
  if (!isRecord(value) || !isRecord(value.targetKpi) || !isRecord(value.creative) || !isRecord(value.googleAds)) return false;
  const source = value.creative.source;
  return typeof value.id === 'string'
    && typeof value.name === 'string'
    && typeof value.landingPageUrl === 'string'
    && (value.objective === 'traffic' || value.objective === 'conversion')
    && typeof value.dailyBudget === 'number'
    && typeof value.startDate === 'string'
    && (value.endDate === undefined || typeof value.endDate === 'string')
    && (value.targetKpi.type === 'cpa' || value.targetKpi.type === 'cpc')
    && typeof value.targetKpi.value === 'number'
    && (value.status === 'draft' || value.status === 'ready')
    && typeof value.creative.id === 'string'
    && typeof value.creative.name === 'string'
    && isCreativeSource(source)
    && value.googleAds.channel === 'google_ads'
    && value.googleAds.campaignType === 'display'
    && typeof value.googleAds.adName === 'string'
    && typeof value.googleAds.location === 'string'
    && (value.googleAds.bidding === 'maximize_clicks' || value.googleAds.bidding === 'maximize_conversions')
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string';
}

function validCampaigns(value: unknown): Campaign[] {
  return Array.isArray(value) ? value.filter(isCampaign) : [];
}

export function loadCampaigns(): Campaign[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    // The original format was a bare array. Keep it readable while moving new
    // writes to a versioned envelope.
    if (Array.isArray(value)) return validCampaigns(value);
    if (isRecord(value) && value.version === STORAGE_VERSION) return validCampaigns(value.campaigns);
    return [];
  } catch {
    return [];
  }
}

export function saveCampaigns(campaigns: Campaign[]) {
  const stored: StoredCampaigns = { version: STORAGE_VERSION, campaigns };
  const serialized = JSON.stringify(stored);
  // localStorage implementations commonly count UTF-16 bytes. Leave room for
  // other site data and fail before an existing value can be disturbed.
  if (serialized.length * 2 > MAX_STORAGE_BYTES) throw new Error('storage_limit');
  localStorage.setItem(STORAGE_KEY, serialized);
}
