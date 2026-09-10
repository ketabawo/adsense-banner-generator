<script lang="ts">
  import { onMount } from 'svelte';
  import type { CampaignSettings, ExecutionPlan } from '$lib/types/plan';
  import { planStates, planValue } from '$lib/plans/format';
  let { customerId, campaignId, suggestion }: { customerId: string; campaignId: string; suggestion?: { text: string; token: number } } = $props();
  let settings = $state<CampaignSettings | null>(null), expected = $state('');
  let plans = $state<ExecutionPlan[]>([]), busy = $state(false), message = $state(''), listError = $state('');
  let changeName = $state(false), changeBudget = $state(false), name = $state(''), budget = $state<number | undefined>(), reason = $state('');
  let reviewing = $state<string | null>(null), confirmed = $state(false);
  let requestId = '', requestSnapshot = '', alive = true;
  $effect(() => { if (suggestion) reason = suggestion.text.slice(0, 2000); });
  const query = $derived(new URLSearchParams({ customerId, campaignId }).toString());
  const review = $derived(plans.find(plan => plan.id === reviewing));
  async function api(url: string, init?: RequestInit) {
    const response = await fetch(url, { cache: 'no-store', ...init });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || '変更案を取得できませんでした。ログイン状態を確認してください。');
    return data;
  }
  async function loadPlans() {
    listError = '';
    try { const data = await api(`/api/plans?${query}`); if (alive) plans = data.plans; }
    catch (error) { if (alive) listError = error instanceof Error ? error.message : '履歴を取得できませんでした。'; }
  }
  onMount(() => { busy = true; void loadPlans().finally(() => { if (alive) busy = false; }); return () => { alive = false; }; });
  async function loadSettings() {
    if (busy) return;
    busy = true; message = ''; settings = null; expected = '';
    try {
      const data = await api(`/api/plans?${query}&mode=settings`);
      if (!alive) return;
      settings = data.settings; expected = data.fingerprint;
      name = settings!.name; budget = Number(settings!.budgetMicros) / 1000000;
      changeName = false; changeBudget = false;
    } catch (error) { if (alive) message = error instanceof Error ? error.message : '現在値を取得できませんでした。'; }
    finally { if (alive) busy = false; }
  }
  async function save() {
    if (busy || !settings || (!changeName && !changeBudget)) return;
    const payload = { customerId, campaignId, expected, ...(changeName ? { name } : {}), ...(changeBudget ? { dailyBudget: budget } : {}), reason };
    const snapshot = JSON.stringify(payload);
    if (snapshot !== requestSnapshot) { requestId = crypto.randomUUID(); requestSnapshot = snapshot; }
    busy = true; message = '';
    try {
      const data = await api('/api/plans', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...payload, requestId }) });
      if (!alive) return;
      plans = [data.plan, ...plans.filter(plan => plan.id !== data.plan.id)].slice(0, 50);
      reviewing = data.plan.id; confirmed = false;
      message = '変更案を保存しました。下の変更前後を確認して承認できます。';
    } catch (error) { if (alive) message = error instanceof Error ? error.message : '保存結果を確認できませんでした。履歴を更新してください。'; }
    finally { if (alive) busy = false; }
  }
  async function decide(plan: ExecutionPlan, action: 'approve' | 'cancel') {
    if (busy || (action === 'approve' && !confirmed)) return;
    busy = true; message = '';
    try {
      const data = await api('/api/plans', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: plan.id, customerId, campaignId, action }) });
      if (!alive) return;
      plans = plans.map(item => item.id === data.plan.id ? data.plan : item); confirmed = false;
      message = data.plan.state === 'approved' ? '承認を記録しました。Google Adsへの反映はまだ行っていません。'
        : data.plan.state === 'stale' ? 'Google Adsの現在値が変わったため承認できません。現在の設定を取得して、新しい変更案を作成してください。' : '変更案を取り消しました。';
    } catch (error) { if (alive) message = error instanceof Error ? error.message : '操作結果を確認できませんでした。履歴を更新してください。'; }
    finally { if (alive) busy = false; }
  }
</script>
<section class="plans" aria-label="Execution Plan">
  <h3>Execution Plan <span>変更案の確認・承認</span></h3>
  <p>Campaign名・日予算の変更前後と理由を保存できます。現在は承認の記録まで対応しており、Google Adsへの反映機能は準備中です。</p>
  <p class="note">対象は停止中のDisplay Campaign・専用の日予算（JPY）です。テスト環境の実績から最適な予算は判断できません。</p>
  <button disabled={busy} onclick={loadSettings}>現在の設定を取得</button>
  {#if settings}
    <p class="metadata">現在値の取得：{new Date(settings.fetchedAt).toLocaleString('ja-JP')} ／ Campaign ID：{campaignId}</p>
    <form onsubmit={(event) => { event.preventDefault(); void save(); }}>
      <div class="fields">
        <div><label class="choice"><input type="checkbox" bind:checked={changeName} disabled={busy} /> Campaign名を変更</label><p>現在：{settings.name}</p>
          <label>変更後のCampaign名<input type="text" bind:value={name} maxlength="100" required disabled={!changeName || busy} /></label></div>
        <div><label class="choice"><input type="checkbox" bind:checked={changeBudget} disabled={busy} /> 日予算を変更</label><p>現在：{planValue('dailyBudget', settings.budgetMicros)}</p>
          <label>変更後の日予算（円）<input type="number" bind:value={budget} min="1" max="100000000" step="1" required disabled={!changeBudget || busy} /></label></div>
      </div>
      <label>変更理由<textarea bind:value={reason} rows="3" maxlength="2000" required disabled={busy} placeholder="変更の目的と根拠を入力してください"></textarea></label>
      <p class="metadata">AI提案から引き継いだ理由も編集できます。変更後の値は自分で指定してください。変更案と承認記録はサーバーに保存します。</p>
      <button disabled={busy || (!changeName && !changeBudget) || !reason.trim()} type="submit">変更案を保存して確認</button>
    </form>
  {:else if suggestion}<p role="status">AI提案の理由を引き継ぎました。「現在の設定を取得」から変更内容を指定してください。</p>{/if}
  {#if message}<p role="status">{message}</p>{/if}
  <div class="heading"><h4>変更案の履歴</h4><button class="secondary" disabled={busy} onclick={async () => { busy = true; reviewing = null; confirmed = false; await loadPlans(); if (alive) busy = false; }}>履歴を更新</button></div>
  {#if listError}<p role="alert">{listError}</p>
  {:else if !plans.length}<p>保存された変更案はありません。</p>{/if}
  <p class="metadata">このCampaignの最新50件を表示します。承認済みでも広告には未反映です。</p>
  {#each plans as plan}
    <button class="plan-row secondary" disabled={busy} onclick={() => { reviewing = plan.id; confirmed = false; }}><span>{planStates[plan.state]}</span><span>{new Date(plan.createdAt).toLocaleString('ja-JP')} · {plan.changes.map(change => change.field === 'name' ? 'Campaign名' : '日予算').join('・')}</span></button>
  {/each}
  {#if review}
    <article class="review">
      <h4>保存済み変更案の確認</h4><p><strong>{planStates[review.state]}</strong></p>
      <div class="table"><table><thead><tr><th>変更項目</th><th>変更前</th><th>変更後</th></tr></thead><tbody>
        {#each review.changes as change}<tr><th scope="row">{change.field === 'name' ? 'Campaign名' : '日予算'}</th><td>{planValue(change.field, change.before)}</td><td>{planValue(change.field, change.after)}</td></tr>{/each}
      </tbody></table></div>
      <p class="reason">理由：{review.reason}</p><p class="metadata">記録ID：{review.id}</p>
      {#if review.decidedAt}<p class="metadata">状態更新：{new Date(review.decidedAt).toLocaleString('ja-JP')}</p>{/if}
      {#if review.state === 'draft'}
        <label class="choice"><input type="checkbox" bind:checked={confirmed} disabled={busy} /> この保存済み変更案の変更前後と理由を確認しました</label>
        <button disabled={busy || !confirmed} onclick={() => decide(review, 'approve')}>この変更案の承認を記録</button>
      {/if}
      {#if review.state !== 'cancelled'}<button class="secondary" disabled={busy} onclick={() => decide(review, 'cancel')}>この変更案を取り消す</button>{/if}
      <p class="metadata">内容を修正する場合は新しい変更案として保存してください。承認時に現在値を再確認します。反映機能を追加する際には実行前の再確認も必要です。</p>
    </article>
  {/if}
</section>
<style>
  .plans { border-top: 1px solid #dbe3ed; padding-top: 22px; margin-top: 24px; }
  h3 { font-size: 18px; margin: 0; } h3 span, .metadata { font-size: 12px; color: #64748b; } h4 { font-size: 14px; }
  p { font-size: 13px; line-height: 1.7; overflow-wrap: anywhere; } .note { padding: 12px; background: #eff6ff; border-radius: 5px; }
  .fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 16px 0; }
  label { display: grid; gap: 8px; font-size: 13px; } label.choice { display: flex; align-items: center; gap: 8px; margin: 12px 0; }
  input[type='text'], input[type='number'], textarea { box-sizing: border-box; width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 5px; font: inherit; font-size: 13px; background: white; color: #1e293b; } textarea { resize: vertical; }
  button { padding: 10px 14px; border: 0; border-radius: 5px; background: #2563eb; color: white; font: inherit; font-size: 12px; cursor: pointer; }
  .secondary { border: 1px solid #cbd5e1; background: white; color: #334155; } button:disabled, input:disabled, textarea:disabled { opacity: .5; cursor: default; }
  button:focus-visible, input:focus-visible, textarea:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
  .heading, .plan-row { display: flex; justify-content: space-between; gap: 12px; align-items: center; flex-wrap: wrap; } .heading { margin-top: 24px; }
  .plan-row { width: 100%; margin: 8px 0; text-align: left; } .review { padding: 16px; border: 1px solid #cbd5e1; border-radius: 5px; margin-top: 16px; }
  .review button { margin: 6px 6px 6px 0; } .table { overflow-x: auto; } table { width: 100%; border-collapse: collapse; font-size: 13px; table-layout: fixed; }
  th, td { padding: 12px 8px; text-align: left; border-bottom: 1px solid #dbe3ed; overflow-wrap: anywhere; } .reason { white-space: pre-wrap; }
  @media (max-width: 600px) { .fields { grid-template-columns: 1fr; } .review { padding: 10px; } }
</style>
