<script lang="ts">
  import { targetingFor, locationLabel } from '$lib/targeting/rules';
  import AdsSubmission from './AdsSubmission.svelte';
  import CreativeThumbnail from './CreativeThumbnail.svelte';
  import { tick } from 'svelte';
  import { drawBanner } from '$lib/banner/drawBanner';
  import { isSupportedBannerSize } from '$lib/banner/imageUpload';
  import type { CampaignDraft, GoogleAdsDraft } from '$lib/types/campaign';
  import type { CreativeSource, CreativeVariant } from '$lib/types/creative';

  let { draft, ads, creativeName, creativeSource, variants = [], activeVariantId, backgroundImage, onCancel, onConfirm }: {
    draft: CampaignDraft;
    ads: GoogleAdsDraft;
    creativeName: string;
    creativeSource: CreativeSource;
    variants?: CreativeVariant[];
    activeVariantId?: string;
    backgroundImage?: HTMLImageElement;
    onCancel: () => void;
    onConfirm: () => void;
  } = $props();
  const yen = new Intl.NumberFormat('ja-JP');
  let canvas = $state<HTMLCanvasElement>();
  let selectedIds = $state<string[]>([]);
  let selectionInitialized = $state(false);
  const reviewVariants = $derived(creativeSource.type === 'studio'
    ? (variants.length ? variants : [{ id: activeVariantId ?? 'base', state: creativeSource.state }])
    : []);
  const eligibleVariants = $derived(reviewVariants.filter(variant => isSupportedBannerSize(variant.state.size.width, variant.state.size.height)));
  const selectedVariants = $derived(eligibleVariants.filter(variant => selectedIds.includes(variant.id)));

  $effect(() => {
    const ids = eligibleVariants.map(variant => variant.id);
    if (!selectionInitialized) { selectedIds = ids; selectionInitialized = true; }
    else if (selectedIds.some(id => !ids.includes(id))) selectedIds = selectedIds.filter(id => ids.includes(id));
  });

  function toggleVariant(id: string, checked: boolean) {
    selectedIds = checked ? [...selectedIds, id] : selectedIds.filter(item => item !== id);
  }

  async function renderVariantImage(variant: CreativeVariant): Promise<string> {
    const output = document.createElement('canvas');
    output.width = variant.state.size.width;
    output.height = variant.state.size.height;
    const context = output.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');
    const url = variant.state.background.type === 'image' ? variant.state.background.image : undefined;
    if (url) {
      const image = new Image();
      image.src = url;
      await image.decode();
      drawBanner(context, variant.state, image);
    } else drawBanner(context, variant.state);
    return output.toDataURL('image/png');
  }

  async function makeImages() {
    if (creativeSource.type !== 'studio') return [{ id: 'active', image: await makeImage() }];
    if (!selectedVariants.length) throw new Error('入稿する画像を選択してください。');
    return Promise.all(selectedVariants.map(async variant => ({ id: variant.id, image: await renderVariantImage(variant) })));
  }

  $effect(() => {
    JSON.stringify(creativeSource);
    backgroundImage;
    void renderPreview();
  });

  async function makeImage(): Promise<string> {
    if (creativeSource.type === 'studio') {
      await renderPreview();
      if (!canvas) throw new Error('Preview unavailable');
      return canvas.toDataURL('image/png');
    }
    const image = new Image();
    image.src = creativeSource.asset.url;
    await image.decode();
    const output = document.createElement('canvas');
    output.width = image.naturalWidth;
    output.height = image.naturalHeight;
    const context = output.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');
    context.drawImage(image, 0, 0);
    return output.toDataURL('image/png');
  }

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
  <div class="title"><span>4</span><div><h2>入稿前Review</h2><p>内容を確認して下書き保存、またはテストアカウントへ停止状態で入稿します。</p></div></div>
  <div class="creative-review">
    <div class="creative-heading"><strong>{creativeName}</strong><span>{creativeSource.type === 'studio' ? creativeSource.state.size.width : creativeSource.asset.width} × {creativeSource.type === 'studio' ? creativeSource.state.size.height : creativeSource.asset.height}px</span></div>
    <div class="creative-stage">
      {#if creativeSource.type === 'studio'}
        <canvas bind:this={canvas} aria-label="編集中のCreativeのプレビュー"></canvas>
      {:else}
        <img src={creativeSource.asset.url} alt="編集中のCreativeのプレビュー" />
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
  {#if reviewVariants.length > 1}
    <section class="variant-review" aria-label="作成したサイズ別バナー">
      <div><strong>作成したサイズ別バナー</strong><span>{reviewVariants.length}件</span></div>
      <p>対応サイズの画像は入稿対象を選べます。選択した画像ごとに、同じ広告グループ内へ停止状態の画像広告を作成します。</p>
      <div class="variant-grid">
        {#each reviewVariants as variant}
          {@const active = variant.id === activeVariantId}
          {@const eligible = isSupportedBannerSize(variant.state.size.width, variant.state.size.height)}
          <article class:active>
            <CreativeThumbnail source={{ type: 'studio', state: variant.state }} />
            <div><strong>{variant.state.size.label || `${variant.state.size.width} × ${variant.state.size.height}`}</strong><small>{active ? '編集中のサイズ' : ''}</small>{#if eligible}<label><input type="checkbox" checked={selectedIds.includes(variant.id)} onchange={(event) => toggleVariant(variant.id, event.currentTarget.checked)} /> Google Adsへ入稿</label>{:else}<small>この広告形式では入稿対象外・下書きのみ</small>{/if}</div>
          </article>
        {/each}
      </div>
    </section>
  {/if}
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
      <div><dt>掲載コンテンツKW</dt><dd>{targetingFor(ads).keywords.terms.filter(t => t.trim()).join("・") || "指定なし"}</dd></div>
      <div><dt>地域・言語</dt><dd>{locationLabel(targetingFor(ads))}・日本語</dd></div>
    </dl>
  </div>
  <div class="notice">安全のため、実際のAPI入稿時も一時停止状態で作成します。</div>
  <div class="actions"><button class="cancel" onclick={onCancel}>戻って修正</button><button class="confirm" onclick={onConfirm}>下書きを保存</button></div>
  {#if creativeSource.type === 'studio' ? eligibleVariants.length > 0 : isSupportedBannerSize(creativeSource.asset.width, creativeSource.asset.height)}
    <AdsSubmission {draft} {ads} {makeImages} selectedCount={creativeSource.type === 'studio' ? selectedVariants.length : 1} selectionKey={JSON.stringify(selectedIds)} />
  {:else}
    <p class="variant-notice">この画像は現在の固定サイズ画像広告への入稿対象外です。下書き保存はできます。</p>
  {/if}
</section>

<style>
  .review { margin-top: 24px; padding: 22px; border: 2px solid #93c5fd; border-radius: 5px; background: white; box-shadow: 0 12px 30px #2563eb12; }
  .title { display: flex; align-items: center; gap: 11px; margin-bottom: 18px; }
  .title > span { display: grid; width: 30px; height: 30px; place-items: center; border-radius: 5px; background: #2563eb; color: white; font-size: 13px; font-weight: 800; }
  h2, p { margin: 0; }
  h2 { font-size: 16px; }
  p { margin-top: 3px; color: #64748b; font-size: 11px; }
  .creative-review { margin-bottom: 20px; overflow: hidden; border: 1px solid #bfdbfe; border-radius: 5px; background: #f8fafc; }
  .creative-heading { display: flex; align-items: center; justify-content: space-between; padding: 11px 14px; border-bottom: 1px solid #dbeafe; background: #eff6ff; }
  .creative-heading strong { font-size: 12px; }
  .creative-heading span { color: #64748b; font-size: 10px; }
  .creative-stage { display: grid; min-height: 250px; padding: 24px; place-items: center; overflow: auto; background-color: #f8fafc; background-image: linear-gradient(45deg,#e2e8f0 25%,transparent 25%),linear-gradient(-45deg,#e2e8f0 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e2e8f0 75%),linear-gradient(-45deg,transparent 75%,#e2e8f0 75%); background-position: 0 0,0 8px,8px -8px,-8px 0; background-size: 16px 16px; }
  canvas, img { display: block; max-width: 100%; height: auto; box-shadow: 0 10px 24px #0f172a30; }
  .creative-copy { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; border-top: 1px solid #e2e8f0; background: #e2e8f0; }
  .creative-copy div { display: grid; gap: 4px; padding: 10px 13px; background: white; }
  .creative-copy span { color: #64748b; font-size: 9px; }
  .creative-copy strong { white-space: pre-line; font-size: 11px; }
  .variant-review { margin: 0 0 20px; padding: 14px; border: 1px solid #dbe3ef; border-radius: 5px; background: white; }
  .variant-review > div:first-child { display: flex; align-items: center; justify-content: space-between; }
  .variant-review > div:first-child strong { font-size: 12px; }
  .variant-review > div:first-child span { color: #64748b; font-size: 10px; }
  .variant-review p { margin: 5px 0 12px; }
  .variant-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
  .variant-grid article { overflow: hidden; border: 1px solid #cbd5e1; border-radius: 5px; background: #f8fafc; }
  .variant-grid article.active { border-color: #2563eb; box-shadow: 0 0 0 1px #2563eb; }
  .variant-grid article :global(canvas) { width: 100%; max-width: none; max-height: 110px; object-fit: contain; box-shadow: none; }
  .variant-grid article > div { display: grid; gap: 3px; padding: 8px; border-top: 1px solid #e2e8f0; }
  .variant-grid article strong { font-size: 10px; }
  .variant-grid article small { color: #64748b; font-size: 9px; }
  .variant-grid article label { display: flex; align-items: center; gap: 5px; font-size: 10px; }
  .review-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; align-items: start; }
  dl { margin: 0; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 5px; }
  dl div { display: grid; grid-template-columns: 120px 1fr; border-bottom: 1px solid #e2e8f0; }
  dl div:last-child { border-bottom: 0; }
  dt, dd { margin: 0; padding: 10px 12px; font-size: 11px; }
  dt { background: #f8fafc; color: #64748b; }
  dd { color: #172033; font-weight: 650; }
  dd.url { overflow-wrap: anywhere; }
  .notice { margin-top: 15px; padding: 10px 12px; border-radius: 5px; background: #fff7ed; color: #9a3412; font-size: 11px; }
  .variant-notice { margin-top: 16px; padding: 12px; border-radius: 5px; background: #eff6ff; color: #1e40af; font-size: 12px; }
  .actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; }
  button { border: 0; border-radius: 5px; padding: 11px 16px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 750; }
  .cancel { background: #f1f5f9; color: #475569; }
  .confirm { background: #2563eb; color: white; }
  @media (max-width: 700px) { .review-grid { grid-template-columns: 1fr; } dl div { grid-template-columns: 100px 1fr; } .creative-copy { grid-template-columns: 1fr; } .creative-stage { min-height: 200px; padding: 16px; } }
</style>
