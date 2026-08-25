<script lang="ts">
  import BannerEditor from '$lib/components/BannerEditor.svelte';
  import BannerPreview from '$lib/components/BannerPreview.svelte';
  import { createDefaultCreativeState } from '$lib/banner/defaultState';

  // Manual controls and future AI commands must update this same state object.
  let creative = $state(createDefaultCreativeState());
  let backgroundImage = $state<HTMLImageElement | undefined>();
  let imageError = $state('');

  function handleImageUpload(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    imageError = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      imageError = 'PNG・JPEG・WebP形式の画像を選択してください。';
      input.value = '';
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      backgroundImage = image;
      creative.background.image = objectUrl;
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      imageError = '画像を読み込めませんでした。別の画像をお試しください。';
    };
    image.src = objectUrl;
  }
</script>

<svelte:head><title>studio.ketabawo.asia | Creative制作</title></svelte:head>

<header>
  <div class="brand"><span>AI</span><strong>studio.ketabawo.asia</strong><em>Creative MVP</em></div>
  <p>AI広告運用プラットフォーム</p>
</header>

<main>
  <div class="intro">
    <div><h1>Creativeを作成</h1><p>広告運用に使うCreativeを、項目を設定して作成できます。</p></div>
    <div class="privacy"><span>✓</span><div><strong>ブラウザだけで完結</strong><small>アップロード画像は外部へ送信されません</small></div></div>
  </div>
  <div class="workspace">
    <BannerEditor state={creative} {imageError} onImageUpload={handleImageUpload} />
    <BannerPreview {creative} {backgroundImage} />
  </div>
</main>

<footer>studio.ketabawo.asia <span>•</span> Creative制作モジュール</footer>

<style>
  :global(*) { box-sizing: border-box; }
  :global(html) { background: #f6f8fb; }
  :global(body) { margin: 0; color: #172033; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans JP", sans-serif; -webkit-font-smoothing: antialiased; }
  header { display: flex; height: 62px; padding: 0 max(24px, calc((100% - 1180px) / 2)); align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; background: #ffffffeb; }
  .brand { display: flex; align-items: center; gap: 8px; }
  .brand > span { display: grid; width: 31px; height: 31px; place-items: center; border-radius: 8px; background: #2563eb; color: white; font-size: 12px; font-weight: 800; }
  .brand strong { font-size: 15px; letter-spacing: -.2px; }
  .brand em { padding: 3px 6px; border-radius: 4px; background: #eff6ff; color: #2563eb; font-size: 9px; font-style: normal; font-weight: 750; }
  header p { color: #94a3b8; font-size: 11px; }
  main { width: min(1180px, calc(100% - 48px)); margin: 0 auto; padding: 34px 0 60px; }
  .intro { display: flex; margin-bottom: 25px; align-items: center; justify-content: space-between; }
  h1 { margin: 0 0 6px; font-size: 24px; letter-spacing: -.5px; }
  .intro p { margin: 0; color: #64748b; font-size: 12px; }
  .privacy { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border: 1px solid #d1fae5; border-radius: 10px; background: #f0fdf4; }
  .privacy > span { display: grid; width: 22px; height: 22px; place-items: center; border-radius: 50%; background: #10b981; color: white; font-size: 11px; }
  .privacy div { display: grid; gap: 2px; }
  .privacy strong { color: #047857; font-size: 10px; }
  .privacy small { color: #6b9a86; font-size: 9px; }
  .workspace { display: grid; grid-template-columns: 340px minmax(0, 1fr); gap: 24px; align-items: start; }
  footer { padding: 22px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 10px; text-align: center; }
  footer span { margin: 0 7px; color: #cbd5e1; }
  @media (max-width: 900px) { .workspace { grid-template-columns: 1fr; } .intro { gap: 18px; } }
  @media (max-width: 600px) { header { padding: 0 16px; } header p { display: none; } main { width: calc(100% - 28px); padding-top: 24px; } .intro { align-items: flex-start; flex-direction: column; } .privacy { width: 100%; } }
</style>
