import type { Targeting } from '$lib/types/targeting';
import { PREFECTURES } from './locations';
export function defaultTargeting(): Targeting {
  return { locations: { countryCode: 'JP', scope: 'country', prefectureCodes: [] }, keywords: { kind: 'display_content', terms: [] }, languages: ['ja'] };
}
export function legacyTargeting(location: string): Targeting {
  const result = defaultTargeting();
  if (!['日本', '日本全国'].includes(location.trim())) {
    result.locations.scope = 'prefectures';
    result.locations.prefectureCodes = PREFECTURES.filter(p => p.name === location.trim()).map(p => p.code);
  }
  return result;
}
export function targetingFor(settings: { targeting?: Targeting; location: string }): Targeting {
  return settings.targeting ?? legacyTargeting(settings.location);
}
export function locationLabel(targeting: Targeting): string {
  return targeting.locations.scope === 'country' ? '日本全国' : targeting.locations.prefectureCodes.map(code => PREFECTURES.find(p => p.code === code)?.name ?? code).join('・') || '都道府県を選択してください';
}
export function parseTargeting(value: unknown): Targeting {
  const fail = (message: string): never => { throw new Error(message); };
  if (!value || typeof value !== 'object') return fail('ターゲティングを設定してください。');
  const t = value as Record<string, any>;
  if (Object.keys(t).some(key => !['locations', 'keywords', 'languages'].includes(key))) fail('未対応のターゲティング設定が含まれています。');
  if (!t.locations || t.locations.countryCode !== 'JP' || !['country', 'prefectures'].includes(t.locations.scope) || !Array.isArray(t.locations.prefectureCodes)) fail('配信地域を正しく指定してください。');
  if (Object.keys(t.locations).some(k => !['countryCode', 'scope', 'prefectureCodes'].includes(k))) fail('未対応の地域設定です。');
  const codes = t.locations.prefectureCodes;
  if (codes.length > 47 || codes.some((code: unknown) => !PREFECTURES.some(p => p.code === code))) fail('都道府県が正しくありません。');
  if (t.locations.scope === 'country' && codes.length) fail('全国と都道府県は同時に指定できません。');
  if (t.locations.scope === 'prefectures' && !codes.length) fail('都道府県を1つ以上選択してください。');
  if (!t.keywords || t.keywords.kind !== 'display_content' || !Array.isArray(t.keywords.terms) || t.keywords.terms.length > 100) fail('Displayキーワードは100件以内で指定してください。');
  if (Object.keys(t.keywords).some(k => !['kind', 'terms'].includes(k))) fail('未対応のキーワード設定です。');
  const terms: string[] = [];
  for (const term of t.keywords.terms) {
    if (typeof term !== 'string' || term.trim().length > 80 || /[\u0000-\u001f\u007f]/.test(term)) fail('各キーワードは1〜80文字で入力してください。');
    const trimmed = term.trim();
    if (!trimmed) continue;
    if (!terms.some(t => t.toLocaleLowerCase() === trimmed.toLocaleLowerCase())) terms.push(trimmed);
  }
  if (!Array.isArray(t.languages) || t.languages.length !== 1 || t.languages[0] !== 'ja') fail('MVPの言語は日本語です。');
  return { locations: { countryCode: 'JP', scope: t.locations.scope, prefectureCodes: [...new Set<string>(codes)].sort() }, keywords: { kind: 'display_content', terms }, languages: ['ja'] };
}
