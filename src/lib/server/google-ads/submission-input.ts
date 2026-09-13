import { parseTargeting, legacyTargeting } from '$lib/targeting/rules';
import { PREFECTURES } from '$lib/targeting/locations';
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
  let targeting;
  try { targeting = parseTargeting(ads.targeting ?? legacyTargeting(typeof ads.location === 'string' ? ads.location : '')); }
  catch (error) { fail((error as Error).message); }
  if (!['maximize_clicks', 'maximize_conversions'].includes(String(ads.bidding))) fail('入札方針が正しくありません。');
  if (!['traffic', 'conversion'].includes(String(draft.objective)) || !['cpc', 'cpa'].includes(String(kpi.type))) fail('目的・目標KPIが正しくありません。');
  if (body.noEuPoliticalAds !== true) fail('EU政治広告を含まないことを確認してください。');
  const startDate = date(draft.startDate), endDate = draft.endDate ? date(draft.endDate) : '';
  if (endDate && endDate < startDate) fail('終了日は開始日以降にしてください。');
  const raw = Array.isArray(body.images) ? body.images : [{ id: 'active', image: body.image }];
  if (!raw.length || raw.length > 8) fail('入稿画像は1〜8件選択してください。');
  const images = raw.map((item, index) => {
    const entry = object(item), id = text(entry.id, 'Variant', 80), encoded = text(entry.image, '画像', 205000);
    if (!/^[A-Za-z0-9_-]+$/.test(id)) fail('Variant IDが正しくありません。');
    if (raw.findIndex(other => object(other).id === id) !== index) fail('同じVariantを重複して入稿できません。');
    if (!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(encoded)) fail('入稿画像はPNGで送信してください。');
    const data = Buffer.from(encoded.split(',')[1], 'base64');
    if (data.length > 150 * 1024) fail('入稿画像は150KB以下にしてください。背景画像を軽くして再度お試しください。');
    if (data.length < 33 || data.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || data.toString('ascii', 12, 16) !== 'IHDR') fail('PNG画像が正しくありません。');
    const width = data.readUInt32BE(16), height = data.readUInt32BE(20);
    if (!BANNER_SIZES.some(s => s.width === width && s.height === height)) fail('入稿画像をエディタの対応広告サイズにしてください。');
    return { id, image: data.toString('base64') };
  });
  return { name, adName, landingPageUrl, dailyBudget: money(draft.dailyBudget), targetKpi: { type: kpi.type as string, value: money(kpi.value) }, objective: draft.objective as string,
    startDate, endDate, bidding: ads.bidding as string, images, targeting };
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
    ...(input.targeting.locations.scope === 'country' ? ['2392'] : input.targeting.locations.prefectureCodes.map(code => PREFECTURES.find(p => p.code === code)!.geoId)).map(id => ({ campaignCriterionOperation: { create: { campaign, location: { geoTargetConstant: `geoTargetConstants/${id}` } } } })),
    { campaignCriterionOperation: { create: { campaign, language: { languageConstant: 'languageConstants/1005' } } } },
    { adGroupOperation: { create: { resourceName: group, name: `${input.adName} ${marker}`, campaign, status: 'PAUSED', type: 'DISPLAY_STANDARD', optimizedTargetingEnabled: false } } },
    ...input.targeting.keywords.terms.map(text => ({ adGroupCriterionOperation: { create: { adGroup: group, status: 'ENABLED', negative: false, keyword: { text, matchType: 'BROAD' } } } })),
    ...input.images.map(image => ({ adGroupAdOperation: { create: { adGroup: group, status: 'PAUSED', ad: { name: input.images.length === 1 ? input.adName : `${input.adName} · ${image.id}`, finalUrls: [input.landingPageUrl], displayUrl: new URL(input.landingPageUrl).hostname, imageAd: { data: image.image } } } } }))
  ];
}
