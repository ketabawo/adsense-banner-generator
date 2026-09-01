<script lang="ts">
  import { tick } from 'svelte';
  import { drawBanner } from '$lib/banner/drawBanner';
  import type { CampaignDraft, GoogleAdsDraft } from '$lib/types/campaign';
  import type { CreativeSource } from '$lib/types/creative';

  let { draft, ads, creativeName, creativeSource, backgroundImage, onCancel, onConfirm }: {
    draft: CampaignDraft;
    ads: GoogleAdsDraft;
    creativeName: string;
    creativeSource: CreativeSource;
    backgroundImage?: HTMLImageElement;
    onCancel: () => void;
    onConfirm: () => void;
  } = $props();
  const yen = new Intl.NumberFormat('ja-JP');
  let canvas = $state<HTMLCanvasElement>();

  $effect(() => {
    JSON.stringify(creativeSource);
    backgroundImage;
    void renderPreview();
  });

  async function renderPreview() {
    await tick();
    if (!canvas || creativeSource.type !== 'studio') return;
    canvas.width = creativeSource.state.size.width;
    canvas.height = creativeSource.state.size.height;
    const context = canvas.getContext('2d');
    if (context) drawBanner(context, creativeSource.state, backgroundImage);
  }
</script>

<section class="review" aria-live="polite">
  <div class="title"><span>4</span><div><h2>入稿前Review</h2><p>まだGoogle Adsには送信されません。内容を確認して下書き保存します。</p></div></div>
  <div class="creative-review">
    <div class="creative-heading"><strong>{creativeName}</strong><span>{creativeSource.type === 'studio' ? creativeSource.state.size.width : creativeSource.asset.width} × {creativeSource.type === 'studio' ? creativeSource.state.size.height : creativeSource.asset.height}px</span></div>
    <div class="creative-stage">
      {#if creativeSource.type === 'studio'}
        <canvas bind:this={canvas} aria-label="入稿するCreativeのプレビュー"></canvas>
      {:else}
        <img src={creativeSource.asset.url} alt="入稿するCreativeのプレビュー" />
      {/if}
    </div>
    <div class="creative-copy">
      {#if creativeSource.type === 'studio'}
        <div><span>作成方法</span><strong>studio制作</strong></div>
        <div><span>メインコピー</span><strong>{creativeSource.state.headline.text}</strong></div>
        <div><span>CTA</span><strong>{creativeSource.state.cta.enabled ? creativeSource.state.cta.text : 'なし'}</strong></div>
      {:else}
        <div><span>作成方法</span><strong>完成画像アップロード</strong></div>
        <div><span>形式</span><strong>{creativeSource.asset.mimeType.replace('image/', '').toUpperCase()}</strong></div>
      {/if}
    </div>
  </div>
  <div class="review-grid">
    <dl>
      <div><dt>Campaign</dt><dd>{draft.name}</dd></div>
      <div><dt>Landing Page</dt><dd class="url">{draft.landingPageUrl}</dd></div>
      <div><dt>目的</dt><dd>{draft.objective === 'traffic' ? 'サイトへのアクセス' : 'コンバージョン獲得'}</dd></div>
      <div><dt>1日の予算</dt><dd>¥{yen.format(draft.dailyBudget ?? 0)}</dd></div>
      <div><dt>目標{draft.targetKpi.type.toUpperCase()}</dt><dd>¥{yen.format(draft.targetKpi.value ?? 0)}</dd></div>
    </dl>
    <dl>
      <div><dt>広告</dt><dd>{ads.adName}</dd></div>
      <div><dt>配信先</dt><dd>Google Ads / ディスプレイ</dd></div>
      <div><dt>地域・言語</dt><dd>{ads.location}・日本語</dd></div>
    </dl>
  </div>
  <div class="notice">安全のため、実際のAPI入稿時も一時停止状態で作成します。</div>
  <div class="actions"><button class="cancel" onclick={onCancel}>戻って修正</button><button class="confirm" onclick={onConfirm}>下書きを保存</button></div>
</section>

<style>
  .review { margin-top: 24px; padding: 22px; border: 2px solid #93c5fd; border-radius: 16px; background: white; box-shadow: 0 12px 30px #2563eb12; }
  .title { display: flex; align-items: center; gap: 11px; margin-bottom: 18px; }
  .title > span { display: grid; width: 30px; height: 30px; place-items: center; border-radius: 9px; background: #2563eb; color: white; font-size: 13px; font-weight: 800; }
  h2, p { margin: 0; }
  h2 { font-size: 16px; }
  p { margin-top: 3px; color: #64748b; font-size: 11px; }
  .creative-review { margin-bottom: 20px; overflow: hidden; border: 1px solid #bfdbfe; border-radius: 12px; background: #f8fafc; }
  .creative-heading { display: flex; align-items: center; justify-content: space-between; padding: 11px 14px; border-bottom: 1px solid #dbeafe; background: #eff6ff; }
  .creative-heading strong { font-size: 12px; }
  .creative-heading span { color: #64748b; font-size: 10px; }
  .creative-stage { display: grid; min-height: 250px; padding: 24px; place-items: center; overflow: auto; background-color: #f8fafc; background-image: linear-gradient(45deg,#e2e8f0 25%,transparent 25%),linear-gradient(-45deg,#e2e8f0 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e2e8f0 75%),linear-gradient(-45deg,transparent 75%,#e2e8f0 75%); background-position: 0 0,0 8px,8px -8px,-8px 0; background-size: 16px 16px; }
  canvas, img { display: block; max-width: 100%; height: auto; box-shadow: 0 10px 24px #0f172a30; }
  .creative-copy { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; border-top: 1px solid #e2e8f0; background: #e2e8f0; }
  .creative-copy div { display: grid; gap: 4px; padding: 10px 13px; background: white; }
  .creative-copy span { color: #64748b; font-size: 9px; }
  .creative-copy strong { white-space: pre-line; font-size: 11px; }
  .review-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; align-items: start; }
  dl { margin: 0; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 10px; }
  dl div { display: grid; grid-template-columns: 120px 1fr; border-bottom: 1px solid #e2e8f0; }
  dl div:last-child { border-bottom: 0; }
  dt, dd { margin: 0; padding: 10px 12px; font-size: 11px; }
  dt { background: #f8fafc; color: #64748b; }
  dd { color: #172033; font-weight: 650; }
  dd.url { overflow-wrap: anywhere; }
  .notice { margin-top: 15px; padding: 10px 12px; border-radius: 8px; background: #fff7ed; color: #9a3412; font-size: 11px; }
  .actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; }
  button { border: 0; border-radius: 9px; padding: 11px 16px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 750; }
  .cancel { background: #f1f5f9; color: #475569; }
  .confirm { background: #2563eb; color: white; }
  @media (max-width: 700px) { .review-grid { grid-template-columns: 1fr; } dl div { grid-template-columns: 100px 1fr; } .creative-copy { grid-template-columns: 1fr; } .creative-stage { min-height: 200px; padding: 16px; } }
</style>
