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
  expect(ops[1]).toMatchObject({ campaignOperation: { create: { status: 'PAUSED', startDateTime: '2099-01-01 00:00:00', endDateTime: '2099-01-02 23:59:59', targetSpend: {} } } });
  expect(ops[4]).toMatchObject({ adGroupOperation: { create: { status: 'PAUSED' } } });
  expect(ops[5]).toMatchObject({ adGroupAdOperation: { create: { status: 'PAUSED', ad: { displayUrl: 'example.com', finalUrls: ['https://example.com'] } } } });
  expect(ops[2]).toMatchObject({ campaignCriterionOperation: { create: { location: { geoTargetConstant: 'geoTargetConstants/2392' } } } });
  expect(ops[3]).toMatchObject({ campaignCriterionOperation: { create: { language: { languageConstant: 'languageConstants/1005' } } } });
});
it('creates one paused image ad per selected variant in the same ad group', () => {
  const source = body();
  const ops = buildOperations(parseSubmission({ ...source, images: [{ id: 'rect', image: source.image }, { id: 'wide', image: source.image }] }), '2222222222', 'marker');
  const ads = ops.filter(operation => 'adGroupAdOperation' in operation);
  expect(ads).toHaveLength(2);
  for (const ad of ads) expect(ad).toMatchObject({ adGroupAdOperation: { create: { adGroup: 'customers/2222222222/adGroups/-3', status: 'PAUSED' } } });
  expect(ads[0]).toMatchObject({ adGroupAdOperation: { create: { ad: { name: 'Banner · rect' } } } });
  expect(ads[1]).toMatchObject({ adGroupAdOperation: { create: { ad: { name: 'Banner · wide' } } } });
});
it('returns a resource name for every selected variant', async () => {
  const source = body();
  const input = { ...source, images: [{ id: 'rect', image: source.image }, { id: 'wide', image: source.image }] };
  const ops = buildOperations(parseSubmission(input), '2222222222', 'marker');
  mocks.mutate.mockResolvedValueOnce({}).mockResolvedValueOnce({ mutateOperationResponses: ops.map((operation, index) => ({ [Object.keys(operation)[0].replace(/Operation$/, 'Result')]: { resourceName: `customers/2222222222/adGroupAds/${index + 1}` } })) });
  const result = await submitCampaign('owner', input);
  expect(result.state).toBe('succeeded');
  expect(result.variantResults).toEqual({ rect: { state: 'succeeded', resourceName: result.resources['variant:rect'] }, wide: { state: 'succeeded', resourceName: result.resources['variant:wide'] } });
  expect(result.resources['variant:rect']).not.toBe(result.resources['variant:wide']);
  expect(mocks.mutate.mock.calls[1][3]).toMatchObject({ partialFailure: false, validateOnly: false });
});
it('restores variant results from a recorded submission without sending again', async () => {
  const source = body();
  const input = { ...source, images: [{ id: 'rect', image: source.image }, { id: 'wide', image: source.image }] };
  mocks.query.mockResolvedValueOnce({ rows: [{ id: 'old', state: 'succeeded', resources: { 'variant:rect': 'customers/2222222222/adGroupAds/11', 'variant:wide': 'customers/2222222222/adGroupAds/12' } }] });
  const result = await submitCampaign('owner', input);
  expect(result.variantResults).toEqual({ rect: { state: 'succeeded', resourceName: 'customers/2222222222/adGroupAds/11' }, wide: { state: 'succeeded', resourceName: 'customers/2222222222/adGroupAds/12' } });
  expect(mocks.mutate).not.toHaveBeenCalled();
});
it('rejects a duplicate variant before writing to Google', async () => {
  const source = body();
  await expect(submitCampaign('owner', { ...source, images: [{ id: 'rect', image: source.image }, { id: 'rect', image: source.image }] })).rejects.toThrow('重複');
  expect(mocks.mutate).not.toHaveBeenCalled();
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
  expect(result.state).toBe('succeeded'); expect(Object.keys(result.resources)).toHaveLength(7);
  expect(result.variantResults.active).toMatchObject({ state: 'succeeded', resourceName: result.resources['variant:active'] });
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

it('maps multiple prefectures and content keywords to the correct Display resources', () => {
  const input = parseSubmission({ ...body(), ads: { ...body().ads, targeting: {
    locations: { countryCode: 'JP', scope: 'prefectures', prefectureCodes: ['JP-14', 'JP-13'] },
    keywords: { kind: 'display_content', terms: ['ZX-10', 'ZXT00A'] }, languages: ['ja']
  } } });
  const ops = buildOperations(input, '2222222222', 'test');
  expect(ops).toHaveLength(9);
  expect(JSON.stringify(ops)).not.toContain('geoTargetConstants/2392');
  expect(ops).toContainEqual({ campaignCriterionOperation: { create: { campaign: 'customers/2222222222/campaigns/-2', location: { geoTargetConstant: 'geoTargetConstants/20637' } } } });
  expect(ops).toContainEqual({ adGroupCriterionOperation: { create: { adGroup: 'customers/2222222222/adGroups/-3', status: 'ENABLED', negative: false, keyword: { text: 'ZX-10', matchType: 'BROAD' } } } });
  expect(ops.find(o => 'adGroupOperation' in o)).toMatchObject({ adGroupOperation: { create: { optimizedTargetingEnabled: false } } });
});

it('saves the variable number of targeting results', async () => {
  const input = { ...body(), ads: { ...body().ads, targeting: { locations: { countryCode: 'JP', scope: 'prefectures', prefectureCodes: ['JP-14', 'JP-13'] }, keywords: { kind: 'display_content', terms: ['ZX-10'] }, languages: ['ja'] } } };
  const operations = buildOperations(parseSubmission(input), '2222222222', 'test');
  mocks.mutate.mockResolvedValueOnce({}).mockResolvedValueOnce({ mutateOperationResponses: operations.map((o, i) => ({ [Object.keys(o)[0].replace(/Operation$/, 'Result')]: { resourceName: `customers/2222222222/campaignCriteria/${i + 1}` } })) });
  const result = await submitCampaign('owner', input);
  expect(result.state).toBe('succeeded'); expect(Object.keys(result.resources)).toHaveLength(9);
});
