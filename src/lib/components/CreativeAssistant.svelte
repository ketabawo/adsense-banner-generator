<script lang="ts">
  import { onMount } from 'svelte';
  import { copyContext, copyFields, parseCopyProposal, type CopyContext, type CopyProposal } from '$lib/creative/copy';
  import type { CreativeState } from '$lib/types/creative';

  let { creative, signedIn, onApply }: {
    creative: CreativeState;
    signedIn: boolean;
    onApply: (before: CopyContext, proposal: CopyProposal) => boolean;
  } = $props();
  let configured = $state(false), checking = $state(false), busy = $state(false);
  let question = $state(''), message = $state(''), applied = $state(false);
  let result = $state<{ question: string; before: CopyContext; proposal: CopyProposal } | null>(null);
  let alive = true;
  const controller = new AbortController();
  const stale = $derived(result !== null && JSON.stringify(copyContext(creative)) !== JSON.stringify(result.before));
  const changed = $derived(result !== null && copyFields.some(({ key }) => result!.before.copy[key] !== result!.proposal.copy[key]));

  async function checkConfig() {
    if (!signedIn || checking) return;
    checking = true; message = '';
    try {
      const response = await fetch('/api/creative-assistant', { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (alive) configured = data.configured === true;
    } catch { if (alive) message = 'AIの接続設定を確認できませんでした。ログイン状態を確認して再試行してください。'; }
    finally { if (alive) checking = false; }
  }
  onMount(() => {
    void checkConfig();
    return () => { alive = false; controller.abort(); };
  });

  async function ask() {
    const text = question.trim();
    if (!configured || busy || !text || text.length > 2000) return;
    const before = copyContext(creative);
    busy = true; message = ''; result = null; applied = false;
    try {
      const response = await fetch('/api/creative-assistant', {
        method: 'POST', headers: { 'content-type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ question: text, context: before })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(response.status === 401 ? 'ログインしてから再度お試しください。' : data?.message || '修正案を取得できませんでした。');
      }
      const proposal = parseCopyProposal(await response.json());
      if (alive) result = { question: text, before, proposal };
    } catch (error) { if (alive) message = error instanceof Error ? error.message : '修正案を取得できませんでした。'; }
    finally { if (alive) busy = false; }
  }
  function apply() {
    if (!result || stale || applied || busy || !changed) return;
    if (onApply(result.before, result.proposal)) { applied = true; message = ''; }
    else message = '編集中の内容が変わりました。もう一度相談してください。';
  }
</script>

<section class="assistant" aria-label="AI Creative Assistant">
  <div class="heading"><h3>AIとコピーを改善</h3><span>{creative.size.label}</span></div>
  <p>「コピーを短く」「CTAを強く」など、希望を伝えてください。修正案を確認して、編集中のサイズに適用できます。</p>
  {#if !signedIn}
    <p>AI相談を使うには、ページ上部からGoogleでログインしてください。</p>
  {:else if checking}
    <p role="status">AIの接続設定を確認中…</p>
  {:else if !configured}
    <p>AI相談の接続設定が必要です。サーバーのAPIキーとログイン状態を確認してください。</p>
    <button class="secondary" onclick={checkConfig}>設定を再確認</button>
  {:else}
    <form onsubmit={(event) => { event.preventDefault(); void ask(); }}>
      <label for="creative-question">コピーの相談内容</label>
      <textarea id="creative-question" bind:value={question} maxlength="2000" rows="3" disabled={busy} required placeholder="例：メインコピーを短くして、CTAを分かりやすくして"></textarea>
      <div class="examples">
        {#each ['メインコピーを短くして', 'CTAを分かりやすくして', '親しみやすい表現にして'] as example}
          <button class="secondary" type="button" disabled={busy} onclick={() => question = example}>{example}</button>
        {/each}
      </div>
      <p class="note">相談内容と現在のコピー・表示状態・サイズをOpenAIへ送信します。API利用料が発生します。画像や広告実績は参照しません。<a href="/privacy" target="_blank" rel="noopener">データの扱い（別タブ）</a></p>
      <button type="submit" disabled={busy || !question.trim()}>{busy ? '修正案を作成中…' : 'コピーの修正案を作る'}</button>
    </form>
  {/if}
  {#if busy}<p role="status">現在のコピーから修正案を作成しています…</p>{/if}
  {#if result}
    <div class="proposal">
      <h4>修正案</h4>
      <p class="request">相談：{result.question}</p>
      <p>{result.proposal.reason}</p>
      {#each copyFields as field}
        <div class="comparison">
          <h5>{field.label}{field.key !== 'headline' && !result.before.enabled[field.key] ? '（非表示・変更しません）' : ''}</h5>
          <div class="values">
            <div><span>変更前</span><p>{result.before.copy[field.key] || '（空欄）'}</p></div>
            <div class:edited={result.before.copy[field.key] !== result.proposal.copy[field.key]}><span>変更後{result.before.copy[field.key] === result.proposal.copy[field.key] ? '（変更なし）' : ''}</span><p>{result.proposal.copy[field.key] || '（空欄）'}</p></div>
          </div>
        </div>
      {/each}
      {#if applied}
        <p class="success" role="status">編集中のサイズに適用しました。プレビューで文字の収まりを確認し、Campaign下書きを保存してください。</p>
      {:else if stale}
        <p role="status">相談後にコピー・表示状態・サイズが変わったため、この案は適用できません。現在の内容でもう一度相談してください。</p>
      {:else if !changed}
        <p role="status">コピーの変更はありません。相談内容を補足して再度お試しください。</p>
      {/if}
      <div class="actions">
        <button disabled={busy || stale || applied || !changed} onclick={apply}>{applied ? '適用済み' : 'この修正案を適用'}</button>
        <button class="secondary" disabled={busy} onclick={() => { result = null; message = ''; }}>修正案を閉じる</button>
      </div>
      <p class="note">適用すると選択中のサイズのコピーが変わります。保存・入稿は、内容を確認した後に行ってください。</p>
    </div>
  {/if}
  {#if message}<p class="error" role="alert">{message}</p>{/if}
</section>

<style>
  .assistant { border: 1px solid #dbe3ed; border-radius: 5px; padding: 20px; margin: 16px 0; background: white; color: #172033; }
  .heading, .examples, .actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .heading { justify-content: space-between; } h3 { font-size: 16px; margin: 0; } h4 { font-size: 15px; margin: 0; } h5 { font-size: 13px; margin: 0 0 8px; }
  p { font-size: 13px; line-height: 1.7; white-space: pre-wrap; overflow-wrap: anywhere; }
  .heading span, .note, .values span { font-size: 12px; color: #64748b; }
  form { display: grid; gap: 10px; } label { font-size: 13px; font-weight: 600; }
  textarea { box-sizing: border-box; width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 5px; resize: vertical; font: inherit; font-size: 14px; color: #172033; background: white; }
  button { border: 1px solid transparent; border-radius: 5px; background: #2563eb; color: white; padding: 10px 14px; font: inherit; font-size: 12px; cursor: pointer; justify-self: start; }
  button.secondary { background: white; color: #334155; border-color: #cbd5e1; }
  button:disabled { opacity: .5; cursor: default; }
  button:focus-visible, textarea:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
  .note { margin: 0; } a { color: #1d4ed8; }
  .proposal { margin-top: 20px; padding-top: 20px; border-top: 1px solid #dbe3ed; }
  .request { color: #475569; } .comparison { margin: 16px 0; }
  .values { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 10px; }
  .values > div { padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 5px; }
  .values > div.edited { background: #eff6ff; border-color: #bfdbfe; } .values p { margin: 6px 0 0; }
  .actions { margin: 14px 0; } .success { color: #047857; } .error { color: #b91c1c; }
  @media (max-width: 600px) { .assistant { padding: 16px; } .values { grid-template-columns: 1fr; } }
</style>
