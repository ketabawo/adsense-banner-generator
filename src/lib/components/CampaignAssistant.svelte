<script lang="ts">
  import { onMount } from 'svelte';
  import type { AssistantMessage, AssistantReply } from '$lib/types/assistant';
  let { customerId, campaignId, days, start, end }: { customerId: string; campaignId: string; days: number; start: string; end: string } = $props();
  let configured = $state<boolean | null>(null);
  let checking = $state(true), busy = $state(false), message = $state(''), question = $state('');
  let turns = $state<{ question: string; reply: AssistantReply }[]>([]);
  let alive = true;
  let controller: AbortController | undefined;
  async function checkConfig() {
    checking = true; message = ''; configured = null;
    try {
      const response = await fetch('/api/assistant', { cache: 'no-store' });
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (alive) configured = data.configured === true;
    } catch { if (alive) message = 'AIの接続設定を確認できませんでした。ログイン状態を確認して再試行してください。'; }
    finally { if (alive) checking = false; }
  }
  onMount(() => {
    void checkConfig();
    return () => { alive = false; controller?.abort(); };
  });
  async function ask() {
    const text = question.trim();
    if (!configured || busy || !text || text.length > 2000) return;
    busy = true; message = '';
    controller = new AbortController();
    const history: AssistantMessage[] = turns.slice(-3).flatMap(turn => [
      { role: 'user' as const, content: turn.question },
      { role: 'assistant' as const, content: JSON.stringify(turn.reply.advice).slice(0, 4000) }
    ]);
    try {
      const response = await fetch('/api/assistant', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ customerId, campaignId, days, start, end, question: text, history }), signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || '相談できませんでした。ログイン状態を確認してください。');
      if (!alive) return;
      turns = [...turns, { question: text, reply: data }].slice(-10);
      question = '';
    } catch (error) { if (alive) message = error instanceof Error ? error.message : 'AIから回答を取得できませんでした。'; }
    finally { if (alive) busy = false; }
  }
</script>
<section class="assistant" aria-label="AI Campaign Assistant">
  <div class="heading"><div><h3>AI Campaign Assistant</h3><p>このCampaignについて、状況の説明や次に確認することを相談できます。</p></div>
    {#if turns.length}<button class="secondary" disabled={busy} onclick={() => { turns = []; message = ''; }}>会話をクリア</button>{/if}
  </div>
  <p class="notice">テスト環境のため成果の良し悪しは判断できません。AIの回答は確認用の提案です。広告の配信・設定は変更されません。</p>
  {#if checking}<p role="status">AIの接続設定を確認中…</p>
  {:else if configured !== true}
    {#if configured === false}<p>AI相談は未設定です。サーバーにAPIキーを設定すると利用できます。</p>{/if}
    <button class="secondary" onclick={checkConfig}>設定を再確認</button>
  {/if}
  {#if configured}
    <div class="conversation" aria-live="polite" aria-relevant="additions">
      {#each turns as turn}
        <article>
          <p class="question"><strong>あなた</strong><span>{turn.question}</span></p>
          <div class="answer"><h4>AIの回答</h4><p>{turn.reply.advice.summary}</p>
            {#if turn.reply.advice.observations.length}<h4>実績から分かること</h4><ul>{#each turn.reply.advice.observations as text}<li>{text}</li>{/each}</ul>{/if}
            {#if turn.reply.advice.limitations.length}<h4>判断の限界・不足データ</h4><ul>{#each turn.reply.advice.limitations as text}<li>{text}</li>{/each}</ul>{/if}
            {#if turn.reply.advice.recommendations.length}<h4>確認事項・改善案</h4><div class="recommendations">{#each turn.reply.advice.recommendations as item}
              <div class="recommendation"><strong>{item.title}</strong><p>根拠：{item.reason}</p><p>次の確認：{item.nextStep}</p></div>
            {/each}</div>{/if}
            <p class="metadata">参照期間：{turn.reply.context.start} ～ {turn.reply.context.end} ／ 実績の再取得：{new Date(turn.reply.context.fetchedAt).toLocaleString('ja-JP')}</p>
          </div>
        </article>
      {/each}
    </div>
    <form onsubmit={(event) => { event.preventDefault(); void ask(); }}>
      <label for="campaign-question">相談内容</label>
      <textarea id="campaign-question" bind:value={question} maxlength="2000" rows="3" disabled={busy} placeholder="例：今の状況と、次に確認することを教えて" required></textarea>
      <div class="suggestions">{#each ['今の状況を説明して', '配信前に何を確認すればいい？', '改善を判断するには何のデータが必要？'] as example}<button class="secondary" type="button" disabled={busy} onclick={() => question = example}>{example}</button>{/each}</div>
      <p class="metadata">送信するとCampaign名・状態・期間・実績と質問・直近3往復の会話をOpenAIへ送ります。実績は相談ごとに再取得します。画像・認証情報は送信しません。<a href="/privacy" target="_blank" rel="noopener">データの扱い（別タブ）</a></p>
      <div class="send"><span>{question.length}/2000</span><button type="submit" disabled={busy || !question.trim()}>{busy ? 'AIに相談中…' : 'AIに相談する'}</button></div>
      <p class="metadata">会話はこの画面に最大10往復表示します。Campaign・期間の切替、実績更新、ページ再読み込みで消えます。</p>
    </form>
  {/if}
  {#if busy}<p role="status">実績を確認し、回答を作成しています…</p>{/if}
  {#if message}<p role="alert">{message}</p>{/if}
</section>
<style>
  .assistant { margin-top: 24px; border-top: 1px solid #dbe3ed; padding-top: 22px; }
  .heading, .send { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  h3 { font-size: 18px; margin: 0; } h4 { font-size: 13px; margin: 14px 0 8px; }
  p, li { font-size: 13px; line-height: 1.8; overflow-wrap: anywhere; white-space: pre-wrap; } ul { padding-left: 20px; }
  .notice { background: #eff6ff; border-radius: 5px; padding: 12px; }
  article { margin-top: 18px; } .question { padding: 12px; background: #f1f5f9; border-radius: 5px; display: grid; gap: 6px; }
  .answer { border: 1px solid #dbe3ed; border-radius: 5px; padding: 16px; }
  .recommendations { display: grid; gap: 10px; } .recommendation { border: 1px solid #dbe3ed; border-radius: 5px; padding: 12px; font-size: 13px; }
  .recommendation p { margin: 6px 0 0; }
  form { margin-top: 18px; } label { display: block; font-size: 13px; margin-bottom: 8px; }
  textarea { box-sizing: border-box; width: 100%; resize: vertical; padding: 12px; font: inherit; font-size: 14px; border: 1px solid #cbd5e1; border-radius: 5px; color: #1e293b; background: white; }
  button { border: 0; border-radius: 5px; background: #2563eb; color: white; padding: 10px 14px; cursor: pointer; font: inherit; font-size: 12px; }
  button.secondary { border: 1px solid #cbd5e1; background: white; color: #334155; }
  button:disabled { opacity: .5; cursor: default; } button:focus-visible, textarea:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
  .suggestions { display: flex; gap: 8px; flex-wrap: wrap; margin: 10px 0; }
  .metadata, .send span { font-size: 12px; color: #64748b; } a { color: #1d4ed8; }
</style>
