import type { AdsAccount } from './google-ads';
export type Metrics = { impressions: number; clicks: number; cost: number; conversions: number; ctr: number | null; cpc: number | null; cpa: number | null };
export type PerformanceReport = {
  account: AdsAccount; start: string; end: string; fetchedAt: string;
  campaigns: { id: string; name: string; status: string; metrics: Metrics; daily: { date: string; metrics: Metrics }[] }[];
};
