<script lang="ts">
  import Field from './Field.svelte';
  import type { GoogleAdsDraft } from '$lib/types/campaign';

  let { settings }: { settings: GoogleAdsDraft } = $props();
</script>

<section class="ads-card">
  <div class="section-title">
    <span>3</span>
    <div><h2>Google Adsを設定</h2><p>MVPでは画像を使ったディスプレイ広告に限定します。</p></div>
    <em>入稿時は一時停止</em>
  </div>
  <div class="fixed"><span>媒体</span><strong>Google Ads</strong><span>Campaignタイプ</span><strong>ディスプレイ</strong></div>
  <div class="form-grid">
    <Field label="広告名"><input bind:value={settings.adName} placeholder="例：studio バナー広告" /></Field>
    <Field label="配信地域"><input bind:value={settings.location} placeholder="例：日本" /></Field>
    <Field label="入札方針">
      <select bind:value={settings.bidding}>
        <option value="maximize_clicks">クリック数の最大化</option>
        <option value="maximize_conversions">コンバージョン数の最大化</option>
      </select>
    </Field>
  </div>
</section>

<style>
  .ads-card { margin-top: 24px; padding: 22px; border: 1px solid #dbe3ef; border-radius: 16px; background: white; box-shadow: 0 8px 24px #0f172a08; }
  .section-title { display: flex; align-items: center; gap: 11px; margin-bottom: 17px; }
  .section-title > span { display: grid; width: 30px; height: 30px; place-items: center; border-radius: 9px; background: #2563eb; color: white; font-size: 13px; font-weight: 800; }
  h2, p { margin: 0; }
  h2 { font-size: 16px; }
  p { margin-top: 3px; color: #64748b; font-size: 11px; }
  em { margin-left: auto; padding: 5px 8px; border-radius: 12px; background: #fff7ed; color: #c2410c; font-size: 10px; font-style: normal; font-weight: 700; }
  .fixed { display: flex; align-items: center; gap: 9px; margin-bottom: 16px; padding: 10px 12px; border-radius: 9px; background: #f8fafc; font-size: 11px; }
  .fixed span { color: #64748b; }
  .fixed strong { margin-right: 16px; }
  .form-grid { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 15px; align-items: end; }
  select, input { box-sizing: border-box; width: 100%; min-height: 40px; border: 1px solid #cbd5e1; border-radius: 8px; background: white; padding: 9px 11px; color: #172033; font: inherit; font-size: 13px; outline: none; }
  select:focus, input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px #dbeafe; }
  @media (max-width: 700px) { .form-grid { grid-template-columns: 1fr; } .section-title { align-items: flex-start; } em { white-space: nowrap; } }
</style>
