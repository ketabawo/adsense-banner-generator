<script lang="ts">
  import type { CampaignDraft, GoogleAdsDraft } from '$lib/types/campaign';
  let { draft, ads, makeImage }: { draft: CampaignDraft; ads: GoogleAdsDraft; makeImage: () => Promise<string> } = $props();
  let busy = $state(false), checked = $state(false), message = $state('');
  let customerId = $state('');
  let resources = $state<Record<string, string>>({});
  let reviewed = $state('');
  const snapshot = $derived(JSON.stringify({ draft, ads }));
  $effect(() => { if (snapshot !== reviewed) { checked = false; customerId = ''; reviewed = snapshot; } });
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
    if (busy || !checked || !customerId) return;
    busy = true; message = ''; resources = {};
    const payload = JSON.parse(snapshot);
    try {
      const image = await makeImage();
      const response = await fetch('/api/google-ads/submissions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...payload, image, noEuPoliticalAds: checked, customerId }) });
      const data = await response.json();
      if (!response.ok) { message = data.message || '入稿できませんでした。'; return; }
      resources = data.resources || {};
      message = data.state === 'succeeded'
        ? `停止状態で入稿済みです。記録ID: ${data.id}`
        : `送信中、または結果が未確定です。二重作成を防ぐため再送しません。Google Adsで studio-${data.id} を確認してください。内容を変えての再送も確認が済むまでお控えください。`;
    } catch { message = '通信結果を確認できませんでした。同じ内容で再度押すと、保存済みの送信記録を確認します。'; }
    finally { busy = false; }
  }
</script>
<div class="submission">
  <h3>テストアカウントへ入稿</h3>
  <p>日本・日本語／JPY口座、対応サイズのPNG（150KB以下）で作成します。目標KPIは管理用の目安で、入札単価の上限には設定しません。</p>
  <p>Campaign・広告グループ・広告はすべて停止状態で作成します。</p>
  <button disabled={busy} onclick={loadAccount}>接続先を確認</button>
  {#if customerId}
    <p>接続先: {customerId} ／ 入札: {ads.bidding === 'maximize_clicks' ? 'クリック数の最大化' : 'コンバージョン数の最大化'} ／ {draft.startDate} ～ {draft.endDate || '終了日なし'}</p>
    <label><input type="checkbox" bind:checked disabled={busy} /> EU政治広告を含まないことを確認しました</label>
    <button disabled={busy || !checked} onclick={submit}>{busy ? '処理中…' : 'この内容で停止状態の広告を作成'}</button>
  {/if}
  {#if message}<p role="status">{message}</p>{/if}
  {#each Object.values(resources) as resource}<p class="resource">{resource}</p>{/each}
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
