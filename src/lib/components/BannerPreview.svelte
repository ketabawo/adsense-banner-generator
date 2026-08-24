<script lang="ts">
  import { tick } from 'svelte';
  import { drawBanner } from '$lib/banner/drawBanner';
  import { downloadBanner } from '$lib/banner/downloadBanner';
  import type { BannerState } from '$lib/types/banner';

  let { banner, backgroundImage }: { banner: BannerState; backgroundImage?: HTMLImageElement } = $props();
  let canvas: HTMLCanvasElement;
  let textOverflow = $state(false);

  $effect(() => {
    JSON.stringify(banner);
    backgroundImage;
    void render();
  });

  async function render() {
    await tick();
    if (!canvas) return;
    canvas.width = banner.size.width;
    canvas.height = banner.size.height;
    const ctx = canvas.getContext('2d');
    if (ctx) textOverflow = drawBanner(ctx, banner, backgroundImage).textOverflow;
  }

  function download() {
    if (!banner.headline.text.trim()) return;
    downloadBanner(canvas, banner.size.width, banner.size.height);
  }
</script>

<div class="preview-card">
  <div class="preview-head">
    <div><span>ライブプレビュー</span><small>{banner.size.width} × {banner.size.height}px</small></div>
    <span class="live"><i></i>リアルタイム</span>
  </div>
  <div class="stage">
    <canvas bind:this={canvas} aria-label="バナープレビュー"></canvas>
  </div>
  <div class="status">
    {#if !banner.headline.text.trim()}<p class="warning">メインコピーを入力してください。</p>{/if}
    {#if banner.cta.enabled && !banner.cta.text.trim()}<p class="warning">CTAテキストを入力してください。</p>{/if}
    {#if textOverflow}<p class="warning">テキストが表示領域を超えています。文字数かサイズを調整してください。</p>{/if}
  </div>
  <button class="download" disabled={!banner.headline.text.trim()} onclick={download}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 5-5m-5 5-5-5M5 20h14" /></svg>
    PNGをダウンロード
  </button>
  <p class="note">画像はブラウザ内で処理され、サーバーには送信されません</p>
</div>

<style>
  .preview-card { position: sticky; top: 24px; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 16px; background: white; box-shadow: 0 12px 35px #0f172a0d; }
  .preview-head { display: flex; align-items: center; justify-content: space-between; padding: 17px 20px; border-bottom: 1px solid #e2e8f0; }
  .preview-head div { display: flex; align-items: baseline; gap: 10px; }
  .preview-head span { color: #172033; font-size: 14px; font-weight: 750; }
  .preview-head small { color: #94a3b8; font-size: 11px; }
  .live { display: flex; align-items: center; gap: 6px; padding: 5px 9px; border-radius: 20px; background: #ecfdf5; color: #059669 !important; font-size: 10px !important; }
  .live i { width: 6px; height: 6px; border-radius: 50%; background: #10b981; box-shadow: 0 0 0 3px #a7f3d0; }
  .stage { display: grid; min-height: 410px; padding: 44px 32px; place-items: center; overflow: auto; background-color: #f8fafc; background-image: linear-gradient(45deg,#e2e8f0 25%,transparent 25%),linear-gradient(-45deg,#e2e8f0 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e2e8f0 75%),linear-gradient(-45deg,transparent 75%,#e2e8f0 75%); background-position: 0 0,0 8px,8px -8px,-8px 0; background-size: 16px 16px; }
  canvas { display: block; max-width: 100%; height: auto; box-shadow: 0 12px 28px #0f172a2b; }
  .status { padding: 0 20px; }
  .warning { margin: 12px 0 0; padding: 9px 11px; border-radius: 7px; background: #fff7ed; color: #c2410c; font-size: 11px; }
  .download { display: flex; width: calc(100% - 40px); margin: 20px; margin-bottom: 10px; align-items: center; justify-content: center; gap: 9px; border: 0; border-radius: 10px; padding: 13px; background: #2563eb; color: white; cursor: pointer; font: inherit; font-size: 14px; font-weight: 750; box-shadow: 0 5px 12px #2563eb36; }
  .download:hover { background: #1d4ed8; }
  .download:disabled { opacity: .45; cursor: not-allowed; }
  .download svg { width: 18px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .note { margin: 0 20px 18px; color: #94a3b8; font-size: 10px; text-align: center; }
  @media (max-width: 900px) { .preview-card { position: static; } .stage { min-height: 330px; } }
</style>
