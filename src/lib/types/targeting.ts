/** Campaign targeting data, independent of editor and provider request schemas. */
export type Targeting = {
  locations: { countryCode: 'JP'; scope: 'country' | 'prefectures'; prefectureCodes: string[] };
  keywords: { kind: 'display_content'; terms: string[] };
  languages: string[];
};
