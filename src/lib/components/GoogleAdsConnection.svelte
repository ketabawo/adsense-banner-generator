<script lang="ts">
  import { onMount } from 'svelte';
  import type { AdsAccount, AdsConnectionStatus } from '$lib/types/google-ads';
  let { onConnectionChange }: { onConnectionChange?: (key: string) => void } = $props();
  let status = $state<AdsConnectionStatus>();
  let accounts = $state<AdsAccount[]>([]);
  let message = $state('');
  let warning = $state('');
  let busy = $state(false);
  let listed = $state(false);

  async function refresh() {
    try {
      const response = await fetch('/api/google-ads/status', { cache: 'no-store' });
      if (!response.ok) throw new Error();
      status = await response.json();
      onConnectionChange?.(`${status?.customerId ?? ""}:${status?.loginCustomerId ?? ""}:${status?.authorized ?? false}`);
    } catch { message = 'Google Adsの接続状態を確認できませんでした。'; }
  }
  async function listAccounts() {
    busy = true; message = ''; warning = ''; listed = false;
    try {
      const response = await fetch('/api/google-ads/accounts', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) { message = data.message ?? 'アカウントを取得できませんでした。'; accounts = []; return; }
      accounts = data.accounts; listed = true;
      if (data.skipped || data.truncated) warning = '一部のアカウントは取得対象外、または取得できませんでした。目的のアカウントがない場合は、テスト用マネージャーへのアクセス権限を確認してください。';
    } catch { message = 'アカウントを取得できませんでした。接続を確認して再度お試しください。'; }
    finally { busy = false; }
  }
  async function select(account: AdsAccount) {
    busy = true; message = '';
    try {
      const response = await fetch('/api/google-ads/selection', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ customerId: account.customerId, loginCustomerId: account.loginCustomerId })
      });
      const data = await response.json();
      if (!response.ok) { message = data.message ?? '接続先を保存できませんでした。'; return; }
      await refresh();
      message = 'テスト用広告アカウントへの接続を確認し、接続先を保存しました。';
    } catch { message = '接続先を保存できませんでした。'; }
    finally { busy = false; }
  }
  onMount(() => {
    void refresh();
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  });
</script>
<section class="ads-connection" aria-label="Google Ads接続">
  <h2>Google Ads接続 <span>テスト環境</span></h2>
  {#if !status}
    <p>接続状態を確認中…</p>
  {:else if !status.configured}
    <p>Google Ads接続は準備中です。</p>
  {:else}
    <p>{status.authorized ? 'Google Adsの権限を取得済みです。テスト用広告アカウントを選択してください。' : 'ログイン中と同じGoogleアカウントで、Google Adsへのアクセスを許可してください。'}</p>
    <p>この画面では接続確認と接続先の保存を行います。広告の作成・配信は行いません。</p>
    {#if status.customerId}<p class="selected">保存済みの接続先：{status.customerId}{status.loginCustomerId ? `（マネージャー：${status.loginCustomerId}）` : ''}</p>{/if}
    <p>許可すると、広告アカウント情報を取得し、接続を維持するための認証情報を暗号化して保存します。<a href="/privacy" target="_blank" rel="noopener">データの扱い（別タブ）</a></p>
    <div class="actions">
      <form method="POST" action="/auth/google/ads" target="_blank" rel="noopener">
        <button type="submit" disabled={busy}>{status.authorized ? '権限を再取得（別タブ）' : 'Google Adsへのアクセスを許可（別タブ）'}</button>
      </form>
      {#if status.authorized}<button onclick={listAccounts} disabled={busy}>{busy ? '確認中…' : 'テストアカウント一覧を取得'}</button>{/if}
    </div>
    {#if listed && !accounts.length}<p>利用できるテスト用広告アカウントが見つかりません。ログイン中のGoogleアカウントがテスト用マネージャーにアクセスできるか確認してください。</p>{/if}
    {#if accounts.length}
      <ul>{#each accounts as account}
        <li><div><strong>{account.name}</strong><p>{account.customerId} ・ {account.currencyCode} ・ {account.timeZone}</p><p>{account.loginCustomerId ? `マネージャー：${account.loginCustomerId}` : '直接アクセス'}</p></div>
          <button disabled={busy} onclick={() => select(account)}>{status.customerId === account.customerId && status.loginCustomerId === account.loginCustomerId ? '再確認' : 'このアカウントに接続'}</button></li>
      {/each}</ul>
    {/if}
  {/if}
  {#if warning}<p role="status">{warning}</p>{/if}
  {#if message}<p role="status">{message}</p>{/if}
</section>
<style>
  .ads-connection { margin-bottom: 22px; padding: 18px; border: 1px solid #bfdbfe; border-radius: 5px; background: #f8fbff; }
  h2 { margin: 0 0 10px; font-size: 14px; } h2 span { margin-left: 10px; padding: 3px 7px; border-radius: 5px; background: #fff7ed; color: #9a3412; font-size: 11px; }
  p { margin: 6px 0; color: #64748b; font-size: 12px; overflow-wrap: anywhere; } .selected { color: #047857; font-weight: 650; }
  .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; }
  button { border: 0; border-radius: 5px; padding: 10px 14px; color: white; background: #2563eb; cursor: pointer; font: inherit; font-size: 12px; }
  button:disabled { opacity: .5; cursor: wait; } button:focus-visible { outline: 3px solid #93c5fd; outline-offset: 3px; }
  ul { padding: 0; list-style: none; } li { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-top: 10px; padding: 12px; border: 1px solid #dbe3ef; background: white; border-radius: 5px; } strong { font-size: 13px; }
  @media (max-width: 600px) { li { flex-direction: column; align-items: flex-start; } }
</style>
