import { database } from '../db';
import { connectionStatus } from './connections';
import { AdsError, searchAdsReport, verifyTestAccount } from './api';
import type { AdsReportRow } from './api';
import type { Metrics, PerformanceReport } from '$lib/types/performance';

export class PerformanceInputError extends Error {}
export function reportDays(value: string | null): number {
  if (value === null) return 30;
  if (!['7', '30', '90'].includes(value)) throw new PerformanceInputError('期間は7日・30日・90日から選択してください。');
  return Number(value);
}
export function dateRange(days: number, timeZone: string, now = new Date()) {
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone }).format(now);
  const end = new Date(`${today}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}
export function metricsFor(rows: AdsReportRow[]): Metrics {
  let impressions = 0, clicks = 0, micros = 0, conversions = 0;
  for (const row of rows) {
    const values = [row.metrics?.impressions ?? 0, row.metrics?.clicks ?? 0, row.metrics?.costMicros ?? 0, row.metrics?.conversions ?? 0].map(Number);
    if (values.some(value => !Number.isFinite(value) || value < 0)) throw new AdsError('UPSTREAM');
    impressions += values[0]; clicks += values[1]; micros += values[2]; conversions += values[3];
  }
  const cost = micros / 1_000_000;
  return { impressions, clicks, cost, conversions, ctr: impressions ? clicks / impressions * 100 : null, cpc: clicks ? cost / clicks : null, cpa: conversions ? cost / conversions : null };
}
export async function performanceReport(subject: string, days: number): Promise<PerformanceReport> {
  const connection = await connectionStatus(subject);
  if (!connection.customerId) throw new PerformanceInputError('Google Adsのテスト広告アカウントを接続してください。');
  const account = await verifyTestAccount(subject, connection.customerId, connection.loginCustomerId);
  const range = dateRange(days, account.timeZone);
  const result = await database().query(
    "SELECT resources FROM google_ads_submissions WHERE google_subject = $1 AND customer_id = $2 AND state = 'succeeded'",
    [subject, account.customerId]
  );
  const ids = [...new Set<string>(result.rows.flatMap(row => Object.values(row.resources ?? {}).flatMap(resource => {
    const match = typeof resource === 'string' ? /^customers\/(\d{10})\/campaigns\/(\d+)$/.exec(resource) : null;
    return match && match[1] === account.customerId ? [match[2]] : [];
  })))];
  if (ids.length > 500) throw new AdsError('LIMIT');
  const report: PerformanceReport = { account, ...range, fetchedAt: new Date().toISOString(), campaigns: [] };
  if (!ids.length) return report;
  const filter = `campaign.id IN (${ids.join(',')})`;
  // Fetch identity separately: segmented reports omit rows with all-zero metrics.
  const identities = await searchAdsReport(subject, account.customerId, account.loginCustomerId,
    `SELECT campaign.id, campaign.name, campaign.status FROM campaign WHERE ${filter}`);
  const rows = await searchAdsReport(subject, account.customerId, account.loginCustomerId,
    `SELECT campaign.id, segments.date, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions FROM campaign WHERE ${filter} AND segments.date BETWEEN '${range.start}' AND '${range.end}' ORDER BY segments.date ASC`);
  report.campaigns = ids.map(id => {
    const campaign = identities.find(row => row.campaign?.id === id)?.campaign;
    const ownRows = rows.filter(row => row.campaign?.id === id);
    return { id, name: campaign?.name || `Campaign ${id}`, status: campaign?.status || 'UNAVAILABLE', metrics: metricsFor(ownRows),
      daily: ownRows.map(row => ({ date: row.segments?.date ?? '', metrics: metricsFor([row]) })) };
  });
  return report;
}
