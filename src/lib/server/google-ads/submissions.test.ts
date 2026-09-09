// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ query: vi.fn(), connection: vi.fn(), verify: vi.fn(), mutate: vi.fn() }));
vi.mock('../db', () => ({ database: () => ({ query: mocks.query }) }));
vi.mock('./connections', () => ({ connectionStatus: mocks.connection }));
vi.mock('./api', () => ({ verifyTestAccount: mocks.verify, mutateTestResources: mocks.mutate, adsErrorMessage: () => '検証エラー' }));
import { submitCampaign } from './submissions';
import { buildOperations, parseSubmission } from './submission-input';
function body() {
  const png = Buffer.alloc(33); Buffer.from('89504e470d0a1a0a', 'hex').copy(png); png.write('IHDR', 12); png.writeUInt32BE(300, 16); png.writeUInt32BE(250, 20);
  return { customerId: '2222222222', noEuPoliticalAds: true, image: `data:image/png;base64,${png.toString('base64')}`, draft: { name: 'Test', landingPageUrl: 'https://example.com', dailyBudget: 500, targetKpi: { type: 'cpc', value: 50 }, objective: 'traffic', startDate: '2099-01-01', endDate: '2099-01-02' }, ads: { adName: 'Banner', location: '日本', bidding: 'maximize_clicks' } };
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.connection.mockResolvedValue({ customerId: '2222222222', loginCustomerId: '1111111111' });
  mocks.verify.mockResolvedValue({ customerId: '2222222222', loginCustomerId: '1111111111', currencyCode: 'JPY', timeZone: 'Asia/Tokyo' });
  mocks.query.mockResolvedValue({ rows: [], rowCount: 1 });
  mocks.mutate.mockResolvedValue({});
});
it('creates an atomic paused display campaign with dates and Japan/Japanese criteria', () => {
  const ops = buildOperations(parseSubmission(body()), '2222222222', 'marker');
  expect(ops[1].campaignOperation?.create).toMatchObject({ status: 'PAUSED', startDateTime: '2099-01-01 00:00:00', endDateTime: '2099-01-02 23:59:59', targetSpend: {} });
  expect(ops[4].adGroupOperation?.create.status).toBe('PAUSED');
  expect(ops[5].adGroupAdOperation?.create.status).toBe('PAUSED');
  expect(ops[5].adGroupAdOperation?.create.ad).toMatchObject({ displayUrl: 'example.com', finalUrls: ['https://example.com'] });
  expect(ops[2].campaignCriterionOperation?.create.location?.geoTargetConstant).toBe('geoTargetConstants/2392');
  expect(ops[3].campaignCriterionOperation?.create.language?.languageConstant).toBe('languageConstants/1005');
});
it.each([NaN, Infinity, -1, 0])('rejects invalid budgets %s', (value) => {
  const input = body(); input.draft.dailyBudget = value; expect(() => parseSubmission(input)).toThrow();
});
it('rejects remote images, impossible dates, unsupported regions and missing declaration', () => {
  expect(() => parseSubmission({ ...body(), image: 'https://private-server/image' })).toThrow();
  expect(() => parseSubmission({ ...body(), noEuPoliticalAds: false })).toThrow();
  const input = body(); input.draft.startDate = '2099-02-30'; expect(() => parseSubmission(input)).toThrow();
  input.draft.startDate = '2099-01-01'; input.ads.location = '全世界'; expect(() => parseSubmission(input)).toThrow();
});
it('does not mutate when account revalidation rejects production/access', async () => {
  mocks.verify.mockRejectedValue(new Error('TEST_ONLY'));
  await expect(submitCampaign('owner', body())).rejects.toThrow();
  expect(mocks.mutate).not.toHaveBeenCalled(); expect(mocks.query).not.toHaveBeenCalled();
});
it('rejects a changed account and non-JPY currency', async () => {
  await expect(submitCampaign('owner', { ...body(), customerId: '3333333333' })).rejects.toThrow('接続先');
  mocks.verify.mockResolvedValue({ currencyCode: 'USD' });
  await expect(submitCampaign('owner', body())).rejects.toThrow('JPY');
  expect(mocks.mutate).not.toHaveBeenCalled();
});
it.each(['succeeded', 'unknown', 'sending'])('never replays a recorded %s submission', async (state) => {
  mocks.query.mockResolvedValueOnce({ rows: [{ id: 'old', state, resources: {} }] });
  expect(await submitCampaign('owner', body())).toMatchObject({ id: 'old', state });
  expect(mocks.mutate).not.toHaveBeenCalled();
});
it('does not send when another request wins the unique reservation', async () => {
  mocks.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rowCount: 0 }).mockResolvedValueOnce({ rows: [{ id: 'other', state: 'sending' }] });
  expect(await submitCampaign('owner', body())).toMatchObject({ id: 'other' }); expect(mocks.mutate).toHaveBeenCalledTimes(1);
  expect(mocks.mutate.mock.calls[0][3].validateOnly).toBe(true);
});
it('persists uncertainty after a timeout and never leaks provider errors', async () => {
  mocks.mutate.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('secret provider data'));
  const result = await submitCampaign('owner', body());
  expect(result.state).toBe('unknown'); expect(JSON.stringify(result)).not.toContain('secret');
  expect(mocks.query.mock.calls[2][0]).toContain("state = 'unknown'");
});
it('saves returned resource IDs after exactly one non-partial mutate', async () => {
  const keys = ['campaignBudget', 'campaign', 'campaignCriterion', 'campaignCriterion', 'adGroup', 'adGroupAd'];
  mocks.mutate.mockResolvedValue({ mutateOperationResponses: keys.map((key, i) => ({ [`${key}Result`]: { resourceName: `customers/2222222222/${key}s/${i + 1}` } })) });
  const result = await submitCampaign('owner', body());
  expect(result.state).toBe('succeeded'); expect(Object.keys(result.resources)).toHaveLength(6);
  expect(mocks.mutate).toHaveBeenCalledTimes(2);
  expect(mocks.mutate.mock.calls[1][3]).toMatchObject({ partialFailure: false, validateOnly: false });
  expect(mocks.query.mock.calls[2][0]).toContain("state = 'succeeded'");
});
it('does not create resources if reservation storage fails', async () => {
  mocks.query.mockResolvedValueOnce({ rows: [] }).mockRejectedValueOnce(new Error('DB'));
  await expect(submitCampaign('owner', body())).rejects.toThrow(); expect(mocks.mutate.mock.calls.every(call => call[3].validateOnly)).toBe(true);
});

it('does not reserve or create resources when Google validation fails', async () => {
  mocks.mutate.mockRejectedValueOnce(new Error('Invalid input'));
  await expect(submitCampaign('owner', body())).rejects.toThrow('広告はまだ作成していません');
  expect(mocks.query).toHaveBeenCalledTimes(1);
  expect(mocks.mutate.mock.calls[0][3].validateOnly).toBe(true);
});
