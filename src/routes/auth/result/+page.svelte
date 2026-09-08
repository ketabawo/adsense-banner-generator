<script lang="ts">
  import { onMount } from 'svelte';
  let result = $state('');
  onMount(() => { result = new URL(window.location.href).searchParams.get('result') ?? 'failed'; });
  const messages: Record<string, string> = {
    'ads-success': 'Google Adsの権限を取得しました。元のタブでアカウント一覧を取得してください。',
    success: 'Googleログインが完了しました。',
    cancelled: 'Googleログインをキャンセルしました。',
    failed: 'ログインできませんでした。許可されたGoogleアカウントで、元の画面からもう一度お試しください。'
  };
  let message = $derived(result ? (messages[result] ?? messages.failed) : '確認中…');
</script>
<svelte:head><title>Googleログイン | studio.ketabawo.asia</title><meta name="referrer" content="no-referrer" /></svelte:head>
<main>
  <h1>Googleログイン</h1>
  <p role="status">{message}</p>
  <p>このタブを閉じて、編集していたタブへ戻ってください。ログイン状態は戻ったときに更新されます。</p>
  <a href="/">編集画面を開く</a>
</main>
<style>
  main { max-width: 560px; margin: 60px auto; padding: 24px; font-family: system-ui, sans-serif; color: #172033; line-height: 1.8; }
  h1 { font-size: 24px; } a { color: #2563eb; }
</style>
