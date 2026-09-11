<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type { CampaignSettings, ExecutionPlan, PlanAction } from '$lib/types/plan';
  import { planStates, planValue } from '$lib/plans/format';
  let { customerId, campaignId, suggestion }: { customerId: string; campaignId: string; suggestion?: { text: string; token: number } } = $props();
  let settings = $state<CampaignSettings | null>(null), expected = $state('');
  let plans = $state<ExecutionPlan[]>([]), busy = $state(false), message = $state(''), listError = $state('');
  let changeName = $state(false), changeBudget = $state(false), name = $state(''), budget = $state<number | undefined>(), reason = $state('');
  let reviewing = $state<string | null>(null), confirmed = $state(false);
  let reviewElement = $state<HTMLElement>();
  let recovery = $state<{ settings: CampaignSettings; fingerprint: string } | null>(null), recoveryReason = $state(''), recoveryConfirmed = $state(false);
  function resetRecovery() { recovery = null; recoveryReason = ''; recoveryConfirmed = false; }
  async function inspectRecovery(plan: ExecutionPlan) {
    if (busy) return;
    busy = true; message = ''; resetRecovery();
    try { const data = await api(`/api/plans?${query}&mode=recovery&id=${plan.id}`); if (alive) recovery = data; }
    catch (error) { if (alive) message = error instanceof Error ? error.message : '現在値を取得できませんでした。'; }
    finally { if (alive) busy = false; }
  }
  let actions = $state<PlanAction[]>([]), actionError = $state('');
  async function loadActions() {
    actionError = '';
    try { const data = await api(`/api/plans?${query}&mode=actions`); if (alive) actions = data.actions ?? []; }
    catch { if (alive) actionError = 'Action Logを取得できませんでした。履歴を更新してください。'; }
  }
  let requestId = '', requestSnapshot = '', alive = true;
  $effect(() => { if (suggestion) reason = suggestion.text.slice(0, 2000); });
  const query = $derived(new URLSearchParams({ customerId, campaignId }).toString());
  const review = $derived(plans.find(plan => plan.id === reviewing));
  const nextStep = $derived(review?.state === 'draft' ? '次は承認：下の変更前後と理由を確認し、チェックを入れて承認してください。'
    : review?.state === 'approved' ? '次は反映：承認は完了しました。反映用のチェックを入れ、Google Adsに反映してください。'
    : review?.state === 'applied' ? '反映完了：Google Adsの現在値と変更後の値が一致しました。追加の反映操作は不要です。'
    : review?.state === 'resolved' ? '終了：この案は再送しません。変更を続ける場合は、現在の設定を取得して新しい案を保存してください。'
    : review?.state === 'cancelled' || review?.state === 'stale' ? '次は新しい案の作成：現在の設定を取得し、変更内容を入力してください。'
    : review ? '次は結果の確認：再照合でGoogle Adsの現在値を確認してください。' : 'まず現在の設定を取得し、変更する項目・変更後の値・理由を入力して保存してください。');
  async function api(url: string, init?: RequestInit) {
    const response = await fetch(url, { cache: 'no-store', ...init });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || '変更案を取得できませんでした。ログイン状態を確認してください。');
    return data;
  }
  async function loadPlans() {
    listError = '';
    try { const data = await api(`/api/plans?${query}`); if (alive) { plans = data.plans; if (!plans.some(p => p.id === reviewing)) reviewing = plans[0]?.id ?? null; } await loadActions(); }
    catch (error) { if (alive) listError = error instanceof Error ? error.message : '履歴を取得できませんでした。'; }
  }
  onMount(() => { busy = true; void loadPlans().finally(() => { if (alive) busy = false; }); return () => { alive = false; }; });
  async function loadSettings() {
    if (busy) return;
    busy = true; message = ''; settings = null; expected = '';
    try {
      const data = await api(`/api/plans?${query}&mode=settings`);
      if (!alive) return;
      settings = data.settings; expected = data.fingerprint; reviewing = null; confirmed = false; resetRecovery();
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
      reviewing = data.plan.id; confirmed = false; requestSnapshot = ''; requestId = '';
      resetRecovery(); await tick(); reviewElement?.focus();
      await loadActions();
      message = '変更案を保存しました。下の変更前後を確認して承認できます。';
    } catch (error) { if (alive) message = error instanceof Error ? error.message : '保存結果を確認できませんでした。履歴を更新してください。'; }
    finally { if (alive) busy = false; }
  }
  async function decide(plan: ExecutionPlan, action: 'approve' | 'cancel' | 'execute' | 'reconcile' | 'resolve') {
    if (busy || (['approve', 'execute'].includes(action) && !confirmed)) return;
    if (action === 'resolve' && (!recovery || !recoveryConfirmed || !recoveryReason.trim())) return;
    busy = true; message = '';
    try {
      const data = await api('/api/plans', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: plan.id, customerId, campaignId, action, ...(action === 'resolve' ? { expected: recovery!.fingerprint, reason: recoveryReason, confirmed: recoveryConfirmed } : {}) }) });
      if (!alive) return;
      plans = plans.map(item => item.id === data.plan.id ? data.plan : item); confirmed = false; resetRecovery();
      await loadActions();
      message = data.plan.state === 'resolved' ? '現在値と終了理由を保存し、この変更案を終了しました。Google Adsへの再送は行っていません。'
        : data.plan.state === 'applied' ? 'Google Adsの設定を再取得し、変更後の値との一致を確認しました。'
        : data.plan.state === 'unknown' ? '反映結果を確認できません。自動再送せず、結果を再照合してください。'
        : ['executing', 'sending'].includes(data.plan.state) ? '反映処理中です。時間をおいて履歴を更新してください。'
        : data.plan.state === 'approved' ? '承認を記録しました。Google Adsへの反映はまだ行っていません。'
        : data.plan.state === 'stale' ? 'Google Adsの現在値が変わったため承認できません。反映も行いません。現在の設定を取得して、新しい変更案を作成してください。' : '変更案を取り消しました。';
    } catch (error) { if (alive) message = error instanceof Error ? error.message : '操作結果を確認できませんでした。履歴を更新してください。'; }
    finally { if (alive) busy = false; }
  }
</script>
<section class="plans" aria-label="Execution Plan">
  <h3>Execution Plan <span>変更案の確認・承認</span></h3>
  <p>Campaign名・日予算の変更前後と理由を保存できます。承認後、別の確認操作でテストアカウントへ反映できます。</p>
  <p class="note">対象は停止中のDisplay Campaign・専用の日予算（JPY）です。テスト環境の実績から最適な予算は判断できません。</p>
  <ol class="steps" aria-label="変更案の手順">
    <li aria-current={!review ? 'step' : undefined}>1. 変更案を保存</li>
    <li aria-current={review?.state === 'draft' ? 'step' : undefined}>2. 内容を承認</li>
    <li aria-current={review?.state === 'approved' ? 'step' : undefined}>3. Google Adsに反映</li>
  </ol>
  <p class="note">保存と承認では広告設定は変わりません。「3. Google Adsに反映」で実際に変更します。</p>
  {#if !review}<p>{nextStep}</p>{/if}
  <h4>1. 新しい変更案を作成</h4>
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
  <div class="heading"><h4>変更案の履歴</h4><button class="secondary" disabled={busy} onclick={async () => { busy = true; confirmed = false; resetRecovery(); await loadPlans(); if (alive) busy = false; }}>履歴を更新</button></div>
  {#if listError}<p role="alert">{listError}</p>
  {:else if !plans.length}<p>保存された変更案はありません。</p>{/if}
  <p class="metadata">このCampaignの最新50件を表示します。承認だけでは未反映です。反映確認済みは実行後の取得時点の状態です。</p>
  {#each plans as plan}
    <button class="plan-row secondary" disabled={busy} onclick={() => { reviewing = plan.id; confirmed = false; resetRecovery(); }}><span>{planStates[plan.state]}</span><span>{new Date(plan.createdAt).toLocaleString('ja-JP')} · {plan.changes.map(change => change.field === 'name' ? 'Campaign名' : '日予算').join('・')}</span></button>
  {/each}
  {#if review}
    <article class="review" tabindex="-1" bind:this={reviewElement} aria-label="選択した変更案">
      <h4>{review.state === 'draft' ? '2. 保存済み変更案を承認' : review.state === 'approved' ? '3. 承認済み変更案を反映' : '保存済み変更案の確認'}</h4><p class="note">{nextStep}</p><p><strong>{planStates[review.state]}</strong></p>
      <div class="table"><table><thead><tr><th>変更項目</th><th>変更前</th><th>変更後</th></tr></thead><tbody>
        {#each review.changes as change}<tr><th scope="row">{change.field === 'name' ? 'Campaign名' : '日予算'}</th><td>{planValue(change.field, change.before)}</td><td>{planValue(change.field, change.after)}</td></tr>{/each}
      </tbody></table></div>
      <p class="reason">理由：{review.reason}</p><p class="metadata">記録ID：{review.id}</p>
      {#if review.decidedAt}<p class="metadata">状態更新：{new Date(review.decidedAt).toLocaleString('ja-JP')}</p>{/if}
      {#if review.state === 'draft'}
        <label class="choice"><input type="checkbox" bind:checked={confirmed} disabled={busy} /> この保存済み変更案の変更前後と理由を確認しました</label>
        <button disabled={busy || !confirmed} onclick={() => decide(review, 'approve')}>この変更案の承認を記録</button>
      {/if}
      {#if review.state === 'approved'}
        <label class="choice"><input type="checkbox" bind:checked={confirmed} disabled={busy} /> この変更内容をGoogle Adsのテストアカウントに反映することを確認しました</label>
        <button disabled={busy || !confirmed} onclick={() => decide(review, 'execute')}>承認済み変更案をGoogle Adsに反映</button>
      {/if}
      {#if ['unknown', 'executing', 'sending'].includes(review.state)}
        <p>まず「Google Adsの結果を再照合」を押してください。反映処理中・送信中は1分待ってから確認します。変更後の値と一致すると反映確認済みになります。</p>
        <button disabled={busy} onclick={() => decide(review, 'reconcile')}>Google Adsの結果を再照合</button>
        <details class="recovery">
          <summary>再照合しても結果不明のとき</summary>
          <p>最後の状態更新から5分以上待ち、Google Ads管理画面の現在値と変更履歴を確認してください。進行中の操作がないことを確認してから、下の現在値を取得します。</p>
          <button class="secondary" disabled={busy} onclick={() => inspectRecovery(review)}>復旧用の現在値を取得</button>
          {#if recovery}
            <p>取得日時：{new Date(recovery.settings.fetchedAt).toLocaleString('ja-JP')}</p>
            <p>Campaign名：{recovery.settings.name} ／ 日予算：{planValue('dailyBudget', recovery.settings.budgetMicros)} ／ 状態：{recovery.settings.status}</p>
            <p>この案を「手動確認で終了」にすると、他の変更案を実行できるようになります。過去の送信結果は確定しません。遅れてGoogle側に反映される可能性もあるため、変更を続ける前に現在値を確認してください。</p>
            <label>終了理由<textarea bind:value={recoveryReason} maxlength="2000" rows="3" disabled={busy} placeholder="管理画面で確認した内容と、この案を終了する理由"></textarea></label>
            <label class="choice"><input type="checkbox" bind:checked={recoveryConfirmed} disabled={busy} /> Google Adsの現在値と変更履歴を確認しました。進行中の操作がなく、結果を未確定のままこの案を終了することを理解しました</label>
            <button disabled={busy || !recoveryConfirmed || !recoveryReason.trim()} onclick={() => decide(review, 'resolve')}>確認を記録してこの案を終了</button>
          {/if}
        </details>
      {/if}
      {#if review.recovery}
        <p class="reason">終了理由：{review.recovery.reason}</p>
        <p>終了時の確認値：{review.recovery.settings.name} ／ 日予算 {planValue('dailyBudget', review.recovery.settings.budgetMicros)}（{new Date(review.recovery.settings.fetchedAt).toLocaleString('ja-JP')}）</p>
      {/if}
      {#if ['draft', 'approved', 'stale'].includes(review.state)}<button class="secondary" disabled={busy} onclick={() => decide(review, 'cancel')}>この変更案を取り消す</button>{/if}
      <p class="metadata">内容を修正する場合は新しい変更案として保存してください。承認時と反映直前に現在値を再確認します。反映開始後は取り消せません。</p>
    </article>
  {/if}
  <h4>Action Log</h4>
  <p class="metadata">最新100件。以前の変更案は移行時点の状態のみ記録しています。</p>
  {#if actionError}<p role="alert">{actionError}</p>{/if}
  {#each actions as action}
    <p class="metadata">{new Date(action.occurredAt).toLocaleString('ja-JP')} · {action.state.startsWith('snapshot:') ? '移行時の状態：' : ''}{planStates[action.state.replace('snapshot:', '') as ExecutionPlan['state']] ?? action.state} · 記録ID：{action.planId}</p>
  {/each}
</section>
<style>
  .steps { display: flex; flex-wrap: wrap; gap: 12px; padding: 0; list-style: none; font-size: 13px; }
  .steps li { padding: 10px; border: 1px solid #cbd5e1; border-radius: 5px; }
  .steps [aria-current='step'] { background: #dbeafe; border-color: #2563eb; font-weight: bold; }
  .recovery { margin: 16px 0; padding: 12px; border: 1px solid #cbd5e1; border-radius: 5px; }
  summary { cursor: pointer; font-size: 13px; }
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
