<script lang="ts">
  import type { CampaignDraft, GoogleAdsDraft } from '$lib/types/campaign';
  let { draft, ads, makeImage, makeImages, selectedCount = 1, selectionKey = '' }: { draft: CampaignDraft; ads: GoogleAdsDraft; makeImage?: () => Promise<string>; makeImages?: () => Promise<{ id: string; image: string }[]>; selectedCount?: number; selectionKey?: string } = $props();
  let busy = $state(false), checked = $state(false), message = $state('');
  let customerId = $state('');
  let resources = $state<Record<string, string>>({});
  let variantResults = $state<Record<string, { state: string; resourceName?: string }>>({});
  const campaignResource = $derived(Object.entries(resources).find(([key]) => key.startsWith('campaignResult-'))?.[1]);
  const adGroupResource = $derived(Object.entries(resources).find(([key]) => key.startsWith('adGroupResult-'))?.[1]);
  let reviewed = $state('');
  const snapshot = $derived(JSON.stringify({ draft, ads, selectionKey }));
  $effect(() => { if (snapshot !== reviewed) { checked = false; customerId = ''; message = ''; resources = {}; variantResults = {}; reviewed = snapshot; } });
  async function loadAccount() {
    busy = true; message = '';
    try {
      const response = await fetch('/api/google-ads/status');
      const data = await response.json();
      if (!response.ok || !data.customerId) throw new Error('ログインしてテスト広告アカウントを接続してください。');
      customerId = data.customerId;
    } catch { message = 'ログインしてテスト広告アカウントを接続してください。'; }
    finally { busy = false; }
  }
  async function submit() {
    if (busy || !checked || !customerId || !selectedCount) return;
    busy = true; message = ''; resources = {}; variantResults = {};
    const payload = { draft: $state.snapshot(draft), ads: $state.snapshot(ads) };
    let images: { id: string; image: string }[];
    try {
      images = makeImages ? await makeImages() : [{ id: 'active', image: await makeImage!() }];
      if (!images.length) throw new Error('入稿する画像を選択してください。');
    } catch {
      message = '選択した画像をPNGに変換できませんでした。画像を確認してください。';
      busy = false;
      return;
    }
    try {
      const response = await fetch('/api/google-ads/submissions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...payload, images, noEuPoliticalAds: checked, customerId }) });
      const data = await response.json();
      if (!response.ok) {
        message = data.message || '入稿できませんでした。';
        if (response.status === 400) variantResults = Object.fromEntries(images.map(image => [image.id, { state: 'failed' }]));
        return;
      }
      resources = data.resources || {};
      variantResults = data.variantResults || {};
      message = data.state === 'succeeded'
        ? `停止状態で入稿済みです。記録ID: ${data.id}`
        : `送信中、または結果が未確定です。二重作成を防ぐため再送しません。Google Adsで studio-${data.id} を確認してください。内容を変えての再送も確認が済むまでお控えください。`;
    } catch { message = '通信結果を確認できませんでした。同じ内容で再度押すと、保存済みの送信記録を確認します。'; }
    finally { busy = false; }
  }
</script>
<div class="submission">
  <h3>テストアカウントへ入稿</h3>
  <p>選択した地域・日本語／JPY口座、対応サイズのPNG（150KB以下）で作成します。目標KPIは管理用の目安で、入札単価の上限には設定しません。</p>
  <p>Campaign・広告グループ・広告はすべて停止状態で作成します。</p>
  <p>選択中の画像: {selectedCount}件。各画像を同じ広告グループ内の別々の画像広告として作成します。</p>
  <p>Google Adsで一括検証し、どれか一件が受け付けられない場合は全件作成しません。</p>
  <p>入稿すると、広告画像と広告設定をstudioサーバー経由でGoogle Adsへ送信します。<a href="/privacy" target="_blank" rel="noopener">データの扱い（別タブ）</a></p>
  <button disabled={busy} onclick={loadAccount}>接続先を確認</button>
  {#if customerId}
    <p>接続先: {customerId} ／ 入札: {ads.bidding === 'maximize_clicks' ? 'クリック数の最大化' : 'コンバージョン数の最大化'} ／ {draft.startDate} ～ {draft.endDate || '終了日なし'}</p>
    <label><input type="checkbox" bind:checked disabled={busy} /> EU政治広告を含まないことを確認しました</label>
    <button disabled={busy || !checked || !selectedCount} onclick={submit}>{busy ? '処理中…' : 'この内容で停止状態の広告を作成'}</button>
  {/if}
  {#if message}<p role="status">{message}</p>{/if}
  {#if campaignResource}<p class="resource">Campaign: {campaignResource}</p>{/if}
  {#if adGroupResource}<p class="resource">Ad Group: {adGroupResource}</p>{/if}
  {#each Object.entries(variantResults) as [id, result]}<p class="resource">Variant {id}: {result.state === 'succeeded' ? '成功' : result.state === 'failed' ? '作成されませんでした' : '結果未確定'}{result.resourceName ? ` · ${result.resourceName}` : ''}</p>{/each}
</div>
<style>
  .submission { margin-top: 18px; padding: 15px; border: 1px solid #bfdbfe; border-radius: 5px; background: #eff6ff; }
  h3 { margin: 0; font-size: 14px; }
  p, label { font-size: 12px; line-height: 1.6; }
  label { display: block; margin: 12px 0; }
  button { padding: 10px 14px; border: 0; border-radius: 5px; background: #2563eb; color: white; cursor: pointer; }
  button:disabled { opacity: .5; cursor: default; }
  .resource { overflow-wrap: anywhere; }
</style>
