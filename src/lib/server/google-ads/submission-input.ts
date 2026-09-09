import { BANNER_SIZES } from '$lib/banner/sizes';

export class SubmissionInputError extends Error {}
function fail(message: string): never { throw new SubmissionInputError(message); }
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('入稿データが正しくありません。');
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, max: number) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max || /[\u0000\r\n]/.test(value)) fail(`${label}を正しく入力してください。`);
  return value.trim();
}
function money(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > 1e8 || !Number.isSafeInteger(Math.round(value * 1e6))) fail('予算と目標KPIを正しく入力してください。');
  return value;
}
function date(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) fail('配信日を正しく入力してください。');
  return value;
}
export function parseSubmission(value: unknown) {
  const body = object(value), draft = object(body.draft), ads = object(body.ads), kpi = object(draft.targetKpi);
  const name = text(draft.name, 'Campaign名', 100), adName = text(ads.adName, '広告名', 100);
  const landingPageUrl = text(draft.landingPageUrl, 'URL', 2048);
  try { const url = new URL(landingPageUrl); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw 0; } catch { fail('Landing Page URLを正しく入力してください。'); }
  if (ads.location !== '日本') fail('現在のテスト入稿は配信地域「日本」のみ対応しています。');
  if (!['maximize_clicks', 'maximize_conversions'].includes(String(ads.bidding))) fail('入札方針が正しくありません。');
  if (!['traffic', 'conversion'].includes(String(draft.objective)) || !['cpc', 'cpa'].includes(String(kpi.type))) fail('目的・目標KPIが正しくありません。');
  if (body.noEuPoliticalAds !== true) fail('EU政治広告を含まないことを確認してください。');
  const startDate = date(draft.startDate), endDate = draft.endDate ? date(draft.endDate) : '';
  if (endDate && endDate < startDate) fail('終了日は開始日以降にしてください。');
  const image = text(body.image, '画像', 205000);
  if (!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(image)) fail('入稿画像はPNGで送信してください。');
  const data = Buffer.from(image.split(',')[1], 'base64');
  if (data.length > 150 * 1024) fail('入稿画像は150KB以下にしてください。背景画像を軽くして再度お試しください。');
  if (data.length < 33 || data.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || data.toString('ascii', 12, 16) !== 'IHDR') fail('PNG画像が正しくありません。');
  const width = data.readUInt32BE(16), height = data.readUInt32BE(20);
  if (!BANNER_SIZES.some(s => s.width === width && s.height === height)) fail('入稿画像をエディタの対応広告サイズにしてください。');
  return { name, adName, landingPageUrl, dailyBudget: money(draft.dailyBudget), targetKpi: { type: kpi.type as string, value: money(kpi.value) }, objective: draft.objective as string,
    startDate, endDate, bidding: ads.bidding as string, image: data.toString('base64') };
}
export type SubmissionInput = ReturnType<typeof parseSubmission>;

export function buildOperations(input: SubmissionInput, customer: string, marker: string) {
  const root = `customers/${customer}`, budget = `${root}/campaignBudgets/-1`, campaign = `${root}/campaigns/-2`, group = `${root}/adGroups/-3`;
  return [
    { campaignBudgetOperation: { create: { resourceName: budget, name: `${input.name} ${marker}`, amountMicros: String(Math.round(input.dailyBudget * 1e6)), deliveryMethod: 'STANDARD', explicitlyShared: false } } },
    { campaignOperation: { create: { resourceName: campaign, name: `${input.name} ${marker}`, advertisingChannelType: 'DISPLAY', status: 'PAUSED', campaignBudget: budget,
      containsEuPoliticalAdvertising: 'DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING', startDateTime: `${input.startDate} 00:00:00`, ...(input.endDate ? { endDateTime: `${input.endDate} 23:59:59` } : {}),
      ...(input.bidding === 'maximize_clicks' ? { targetSpend: {} } : { maximizeConversions: {} }),
      networkSettings: { targetGoogleSearch: false, targetSearchNetwork: false, targetContentNetwork: true },
      geoTargetTypeSetting: { positiveGeoTargetType: 'PRESENCE' } } } },
    { campaignCriterionOperation: { create: { campaign, location: { geoTargetConstant: 'geoTargetConstants/2392' } } } },
    { campaignCriterionOperation: { create: { campaign, language: { languageConstant: 'languageConstants/1005' } } } },
    { adGroupOperation: { create: { resourceName: group, name: `${input.adName} ${marker}`, campaign, status: 'PAUSED', type: 'DISPLAY_STANDARD' } } },
    { adGroupAdOperation: { create: { adGroup: group, status: 'PAUSED', ad: { name: input.adName, finalUrls: [input.landingPageUrl], displayUrl: new URL(input.landingPageUrl).hostname, imageAd: { data: input.image } } } } }
  ];
}
