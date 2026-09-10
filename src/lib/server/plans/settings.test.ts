// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ query: vi.fn(), connection: vi.fn(), verify: vi.fn(), search: vi.fn() }));
vi.mock('../db', () => ({ database: () => ({ query: mocks.query }) }));
vi.mock('../google-ads/connections', () => ({ connectionStatus: mocks.connection }));
vi.mock('../google-ads/api', () => ({ searchAdsReport: mocks.search, verifyTestAccount: mocks.verify }));
import { currentSettings, fingerprint } from './settings';
import { changesFor, parseCreate, readPlanBody } from './input';
const account = { customerId: '2222222222', loginCustomerId: null, currencyCode: 'JPY' };
const settings = { customerId: account.customerId, campaignId: '42', name: 'Example', status: 'PAUSED', currency: 'JPY' as const, budgetResource: 'customers/2222222222/campaignBudgets/99', budgetMicros: '1000000000', fetchedAt: '2026-09-10T00:00:00Z' };
const row = { campaign: { id: '42', name: 'Example', status: 'PAUSED', advertisingChannelType: 'DISPLAY', campaignBudget: settings.budgetResource }, campaignBudget: { resourceName: settings.budgetResource, amountMicros: settings.budgetMicros, explicitlyShared: false, referenceCount: '1', period: 'DAILY' } };
const input = { customerId: account.customerId, campaignId: '42', requestId: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', expected: fingerprint(settings), reason: '設定整理', dailyBudget: 1500 };
beforeEach(() => { vi.resetAllMocks(); mocks.query.mockResolvedValue({ rowCount: 1 }); mocks.connection.mockResolvedValue(account); mocks.verify.mockResolvedValue(account); mocks.search.mockResolvedValue([structuredClone(row)]); });
describe('plan settings and validation', () => {
  it('canonicalizes JSONB key ordering and ignores fetchedAt but detects changed values', () => {
    const reordered = Object.fromEntries(Object.entries(settings).reverse()) as typeof settings;
    expect(fingerprint({ ...reordered, fetchedAt: 'later' })).toBe(fingerprint(settings));
    expect(fingerprint({ ...settings, budgetMicros: '2000000000' })).not.toBe(fingerprint(settings));
  });
  it('loads only an owned successful campaign under the selected test account', async () => {
    expect(await currentSettings('owner', account.customerId, '42')).toMatchObject(settingsWithoutTime());
    expect(mocks.query.mock.calls[0][1]).toEqual(['owner', account.customerId, 'customers/2222222222/campaigns/42']);
    expect(mocks.query.mock.calls[0][0]).toContain("state = 'succeeded'");
    expect(mocks.verify).toHaveBeenCalledWith('owner', account.customerId, null);
    expect(mocks.search.mock.calls[0][3]).toContain('WHERE campaign.id = 42');
  });
  it('blocks other accounts and campaigns before provider reads', async () => {
    await expect(currentSettings('owner', '3333333333', '42')).rejects.toThrow('接続先');
    mocks.query.mockResolvedValue({ rowCount: 0 });
    await expect(currentSettings('owner', account.customerId, '42')).rejects.toThrow('成功記録');
    expect(mocks.verify).not.toHaveBeenCalled(); expect(mocks.search).not.toHaveBeenCalled();
  });
  it.each([
    { ...row, campaign: { ...row.campaign, status: 'ENABLED' } },
    { ...row, campaign: { ...row.campaign, advertisingChannelType: 'SEARCH' } },
    { ...row, campaignBudget: { ...row.campaignBudget, explicitlyShared: true } },
    { ...row, campaignBudget: { ...row.campaignBudget, referenceCount: '2' } },
    { ...row, campaignBudget: { ...row.campaignBudget, period: 'CUSTOM_PERIOD' } },
    { ...row, campaignBudget: { ...row.campaignBudget, amountMicros: 'invalid' } }
  ])('rejects unsupported or unsafe current settings', async (value) => {
    mocks.search.mockResolvedValue([value]); await expect(currentSettings('owner', account.customerId, '42')).rejects.toThrow();
  });
  it('propagates test verification failure and rejects mid-read account switching', async () => {
    mocks.verify.mockRejectedValueOnce(new Error('TEST_ONLY'));
    await expect(currentSettings('owner', account.customerId, '42')).rejects.toThrow('TEST_ONLY');
    mocks.connection.mockResolvedValueOnce(account).mockResolvedValueOnce({ customerId: '3333333333' });
    await expect(currentSettings('owner', account.customerId, '42')).rejects.toThrow('接続先');
  });
  it('limits fields and exact integer currency amounts', () => {
    for (const changed of [{ status: 'ENABLED' }, { dailyBudget: -1 }, { dailyBudget: 1.5 }, { dailyBudget: 100000001 }, { name: '' }, { name: 'x'.repeat(101) }, { expected: 'client guessed current value' }, { reason: ' ' }, { campaignId: '42 OR 1=1' }]) {
      expect(() => parseCreate({ ...input, ...changed })).toThrow();
    }
    expect(changesFor(settings, parseCreate(input))).toEqual([{ field: 'dailyBudget', before: '1000000000', after: '1500000000' }]);
    expect(() => changesFor(settings, parseCreate({ ...input, dailyBudget: 1000 }))).toThrow('同じ');
  });
  it('rejects oversized streamed JSON', async () => {
    await expect(readPlanBody(new Request('http://localhost', { method: 'POST', body: 'a'.repeat(16001) }))).rejects.toThrow('大きすぎ');
  });
});
function settingsWithoutTime() { const { fetchedAt: _date, ...rest } = settings; return rest; }
