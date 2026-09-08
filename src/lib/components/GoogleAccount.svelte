<script lang="ts">
  import GoogleAdsConnection from './GoogleAdsConnection.svelte';
  import { onMount } from 'svelte';
  let configured = $state(false);
  let email = $state('');
  let loading = $state(true);
  let message = $state('');
  let busy = $state(false);

  async function refresh() {
    try {
      const response = await fetch('/api/auth/session', { cache: 'no-store' });
      if (response.status === 404) { configured = false; return; }
      if (!response.ok) throw new Error();
      const data = await response.json();
      configured = data.configured === true;
      email = data.user?.email ?? '';
      message = '';
    } catch { email = ''; message = 'ログイン状態を確認できませんでした。'; }
    finally { loading = false; }
  }
  async function logout() {
    busy = true;
    try {
      const response = await fetch('/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error();
      email = ''; message = '';
    } catch { message = 'ログアウトできませんでした。もう一度お試しください。'; }
    finally { busy = false; }
  }
  onMount(() => {
    void refresh();
    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  });
</script>
<section aria-label="Googleアカウント" class="account">
  <div><strong>Googleアカウント</strong>
    <p>{loading ? '確認中…' : email ? `${email} でログイン中` : configured ? 'Googleアカウントでログインできます。' : 'Googleログインは準備中です。Creativeの作成・保存は利用できます。'}</p>
    {#if message}<p role="alert">{message}</p>{/if}
  </div>
  {#if email}
    <button onclick={logout} disabled={busy}>ログアウト</button>
  {:else if configured}
    <form method="POST" action="/auth/google/start" target="_blank" rel="noopener">
      <button type="submit">Googleでログイン（別タブ）</button>
    </form>
  {/if}
</section>
{#if email}{#key email}<GoogleAdsConnection />{/key}{/if}
<style>
  .account { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 22px; padding: 18px; border: 1px solid #dbe3ef; border-radius: 14px; background: white; }
  strong { font-size: 14px; } p { margin: 5px 0 0; color: #64748b; font-size: 12px; overflow-wrap: anywhere; }
  button { border: 0; border-radius: 8px; padding: 10px 14px; color: white; background: #2563eb; cursor: pointer; font: inherit; font-size: 12px; white-space: nowrap; }
  button:disabled { opacity: .5; } button:focus-visible { outline: 3px solid #93c5fd; outline-offset: 3px; }
  @media (max-width: 600px) { .account { align-items: flex-start; flex-direction: column; } }
</style>
