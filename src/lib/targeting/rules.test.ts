import { describe, expect, it } from 'vitest';
import { defaultTargeting, legacyTargeting, parseTargeting, locationLabel } from './rules';
import { PREFECTURES } from './locations';
import { saveCampaigns, loadCampaigns } from '$lib/campaign/storage';
import { campaign } from '../../test/fixtures';

describe('targeting validation and storage', () => {
  it('supports all 47 prefectures with unique verified IDs', () => {
    expect(PREFECTURES).toHaveLength(47);
    expect(new Set(PREFECTURES.map(p => p.geoId)).size).toBe(47);
    expect(PREFECTURES.find(p => p.name === '神奈川県')?.geoId).toBe('20637');
  });
  it('migrates old Japan and prefecture labels without broadening unknown locations', () => {
    expect(legacyTargeting('日本')).toEqual(defaultTargeting());
    expect(locationLabel(legacyTargeting('神奈川県'))).toBe('神奈川県');
    expect(() => parseTargeting(legacyTargeting('横浜市'))).toThrow('都道府県');
  });
  it('normalizes duplicate locations and keywords while preserving meaningful hyphens', () => {
    const t = defaultTargeting();
    t.locations = { countryCode: 'JP', scope: 'prefectures', prefectureCodes: ['JP-14', 'JP-13', 'JP-14'] };
    t.keywords.terms = [' GPZ1000RX ', 'ZX-10', 'zx-10', '', 'ZXT00A'];
    const parsed = parseTargeting(t);
    expect(parsed.locations.prefectureCodes).toEqual(['JP-13', 'JP-14']);
    expect(parsed.keywords.terms).toEqual(['GPZ1000RX', 'ZX-10', 'ZXT00A']);
  });
  it('rejects mixed nationwide/prefecture, unknown codes, empty prefectures and unsupported dimensions', () => {
    const t = defaultTargeting();
    t.locations.prefectureCodes = ['JP-14'];
    expect(() => parseTargeting(t)).toThrow();
    t.locations.scope = 'prefectures'; t.locations.prefectureCodes = [];
    expect(() => parseTargeting(t)).toThrow();
    t.locations.prefectureCodes = ['JP-99']; expect(() => parseTargeting(t)).toThrow();
    expect(() => parseTargeting({ ...defaultTargeting(), exclusions: [] })).toThrow();
    expect(() => parseTargeting({ ...defaultTargeting(), languages: ['en'] })).toThrow();
  });
  it('rejects search keyword semantics, overlong terms and excessive counts', () => {
    expect(() => parseTargeting({ ...defaultTargeting(), keywords: { kind: 'search', terms: ['ZX-10'] } })).toThrow();
    const t = defaultTargeting(); t.keywords.terms = ['a'.repeat(81)]; expect(() => parseTargeting(t)).toThrow();
    t.keywords.terms = Array.from({ length: 101 }, (_, i) => `keyword${i}`); expect(() => parseTargeting(t)).toThrow();
  });
  it('saves, reloads and edits multiple regions and keywords without losing other campaign data', () => {
    const c = campaign(); c.googleAds.targeting = legacyTargeting('神奈川県'); c.googleAds.targeting.keywords.terms = ['ZX-10', 'ZXT00B'];
    saveCampaigns([c]); const restored = loadCampaigns()[0]; expect(restored).toEqual(c);
    restored.googleAds.targeting!.locations.prefectureCodes.push('JP-13'); saveCampaigns([restored]);
    expect(loadCampaigns()[0].googleAds.targeting!.locations.prefectureCodes).toEqual(['JP-14', 'JP-13']);
  });
});
