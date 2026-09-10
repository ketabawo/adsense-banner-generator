// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ query: vi.fn(), connection: vi.fn(), verify: vi.fn(), search: vi.fn() }));
vi.mock('../db', () => ({ database: () => ({ query: mocks.query }) }));
vi.mock('./connections', () => ({ connectionStatus: mocks.connection }));
vi.mock('./api', () => ({ AdsError: class extends Error {}, verifyTestAccount: mocks.verify, searchAdsReport: mocks.search }));
import { dateRange, metricsFor, performanceReport, reportDays } from './performance';
const account = { customerId: '2222222222', loginCustomerId: '1111111111', name: 'Test', currencyCode: 'JPY', timeZone: 'Asia/Tokyo' };
beforeEach(() => {
  vi.resetAllMocks(); mocks.connection.mockResolvedValue(account); mocks.verify.mockResolvedValue(account);
  mocks.query.mockResolvedValue({ rows: [{ resources: { campaign: 'customers/2222222222/campaigns/42', other: 'customers/3333333333/campaigns/99', group: 'customers/2222222222/adGroups/55' } }] });
});
describe('performance reports', () => {
  it('uses account-local yesterday and an inclusive range across year boundaries', () => {
    expect(dateRange(7, 'Asia/Tokyo', new Date('2026-01-01T16:00:00Z'))).toEqual({ start: '2025-12-26', end: '2026-01-01' });
    expect(dateRange(7, 'America/Los_Angeles', new Date('2026-01-01T16:00:00Z'))).toEqual({ start: '2025-12-25', end: '2025-12-31' });
  });
  it('only accepts bounded preset periods', () => {
    expect(reportDays(null)).toBe(30); expect(reportDays('90')).toBe(90);
    expect(() => reportDays('7 OR 1=1')).toThrow(); expect(() => reportDays('365')).toThrow();
  });
  it('converts micros and calculates weighted ratios with fractional conversions', () => {
    const result = metricsFor([{ metrics: { impressions: '100', clicks: '10', costMicros: '10000000', conversions: 0.5 } }, { metrics: { impressions: '900', clicks: '20', costMicros: '5000000', conversions: 2 } }]);
    expect(result).toEqual({ impressions: 1000, clicks: 30, cost: 15, conversions: 2.5, ctr: 3, cpc: 0.5, cpa: 6 });
    expect(metricsFor([])).toMatchObject({ cost: 0, ctr: null, cpc: null, cpa: null });
    expect(() => metricsFor([{ metrics: { costMicros: 'invalid' } }])).toThrow();
  });
  it('scopes records by authenticated owner and selected account and retains zero-data campaigns', async () => {
    mocks.search.mockResolvedValueOnce([{ campaign: { id: '42', name: 'studio-test', status: 'PAUSED' } }]).mockResolvedValueOnce([]);
    const report = await performanceReport('owner', 30);
    expect(mocks.query.mock.calls[0][1]).toEqual(['owner', account.customerId]);
    expect(mocks.query.mock.calls[0][0]).toContain("state = 'succeeded'");
    expect(mocks.verify).toHaveBeenCalledWith('owner', account.customerId, account.loginCustomerId);
    for (const call of mocks.search.mock.calls) {
      expect(call.slice(0, 3)).toEqual(['owner', account.customerId, account.loginCustomerId]);
      expect(call[3]).toContain('campaign.id IN (42)'); expect(call[3]).not.toContain('99');
    }
    expect(report.campaigns[0]).toMatchObject({ id: '42', status: 'PAUSED', daily: [], metrics: { impressions: 0, cpc: null } });
  });
  it('keeps daily results separate by campaign and marks missing identities', async () => {
    mocks.query.mockResolvedValue({ rows: [{ resources: { a: 'customers/2222222222/campaigns/42', b: 'customers/2222222222/campaigns/43' } }] });
    mocks.search.mockResolvedValueOnce([{ campaign: { id: '42', name: 'First', status: 'PAUSED' } }]).mockResolvedValueOnce([
      { campaign: { id: '42' }, segments: { date: '2026-09-01' }, metrics: { clicks: '3' } },
      { campaign: { id: '43' }, segments: { date: '2026-09-01' }, metrics: { clicks: '8' } }
    ]);
    const report = await performanceReport('owner', 7);
    expect(report.campaigns[0].metrics.clicks).toBe(3); expect(report.campaigns[0].daily).toHaveLength(1);
    expect(report.campaigns[1]).toMatchObject({ status: 'UNAVAILABLE', metrics: { clicks: 8 } });
  });
  it('does not query Ads reports without successful submissions', async () => {
    mocks.query.mockResolvedValue({ rows: [] });
    expect((await performanceReport('owner', 7)).campaigns).toEqual([]);
    expect(mocks.search).not.toHaveBeenCalled();
  });
  it('stops before accessing records if account verification fails', async () => {
    mocks.verify.mockRejectedValue(new Error('TEST_ONLY'));
    await expect(performanceReport('owner', 7)).rejects.toThrow('TEST_ONLY');
    expect(mocks.query).not.toHaveBeenCalled(); expect(mocks.search).not.toHaveBeenCalled();
  });
  it('propagates report failures instead of substituting zero metrics', async () => {
    mocks.search.mockRejectedValue(new Error('UPSTREAM'));
    await expect(performanceReport('owner', 7)).rejects.toThrow('UPSTREAM');
  });
});
