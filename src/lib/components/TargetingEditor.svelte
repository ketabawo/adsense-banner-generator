<script lang="ts">
  import type { GoogleAdsDraft } from '$lib/types/campaign';
  import { PREFECTURES } from '$lib/targeting/locations';
  import { targetingFor, locationLabel } from '$lib/targeting/rules';
  let { settings }: { settings: GoogleAdsDraft } = $props();
  const targeting = $derived(targetingFor(settings));
  function setScope(scope: 'country' | 'prefectures') {
    settings.targeting = { ...targeting, locations: { ...targeting.locations, scope, prefectureCodes: [] } };
    settings.location = locationLabel(settings.targeting);
  }
  function toggle(code: string, checked: boolean) {
    settings.targeting = { ...targeting, locations: { ...targeting.locations, prefectureCodes: checked ? [...targeting.locations.prefectureCodes, code] : targeting.locations.prefectureCodes.filter(c => c !== code) } };
    settings.location = locationLabel(settings.targeting);
  }
  function keywords(value: string) {
    settings.targeting = { ...targeting, keywords: { kind: 'display_content', terms: value.split('\n') } };
  }
</script>
<div class="targeting">
  <fieldset>
    <legend>配信地域</legend>
    <label><input type="radio" name="location-scope" checked={targeting.locations.scope === 'country'} onchange={() => setScope('country')} /> 日本全国</label>
    <label><input type="radio" name="location-scope" checked={targeting.locations.scope === 'prefectures'} onchange={() => setScope('prefectures')} /> 都道府県を選択（複数可）</label>
    {#if targeting.locations.scope === 'prefectures'}
      <div class="prefectures">
        {#each PREFECTURES as prefecture}
          <label><input type="checkbox" checked={targeting.locations.prefectureCodes.includes(prefecture.code)} onchange={(event) => toggle(prefecture.code, event.currentTarget.checked)} /> {prefecture.name}</label>
        {/each}
      </div>
      <p>{locationLabel(targeting)}</p>
    {/if}
  </fieldset>
  <label class="keywords">キーワード（掲載コンテンツ向け）
    <textarea rows="5" value={targeting.keywords.terms.join('\n')} oninput={(event) => keywords(event.currentTarget.value)} placeholder={'GPZ1000RX\nZX-10\nZXT00A\nZXT00B'} aria-describedby="keyword-help"></textarea>
  </label>
  <p id="keyword-help">1行に1件、最大100件・各80文字。関連する内容のページへの掲載に使います。検索語句の指定ではありません。空欄の場合、キーワードによる絞り込みは行いません。</p>
</div>
<style>
  .targeting { margin-top: 18px; }
  fieldset { border: 1px solid #cbd5e1; border-radius: 5px; padding: 12px; margin: 0 0 16px; }
  legend, .keywords { color: #334155; font-size: 13px; font-weight: 650; }
  label { font-size: 13px; line-height: 1.8; margin-right: 16px; }
  .prefectures { display: grid; grid-template-columns: repeat(auto-fit, minmax(115px, 1fr)); gap: 6px; margin-top: 12px; }
  .keywords { display: grid; gap: 6px; margin: 0; }
  textarea { box-sizing: border-box; width: 100%; border: 1px solid #cbd5e1; border-radius: 5px; padding: 10px; font: inherit; resize: vertical; }
  textarea:focus { outline: 2px solid #93c5fd; }
  p { color: #64748b; font-size: 12px; line-height: 1.6; }
</style>
