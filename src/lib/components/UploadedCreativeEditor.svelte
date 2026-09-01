<script lang="ts">
  import type { UploadedCreativeAsset } from '$lib/types/creative';

  let { name, asset, error, onNameInput, onUpload }: {
    name: string;
    asset?: UploadedCreativeAsset;
    error: string;
    onNameInput: (name: string) => void;
    onUpload: (event: Event) => void;
  } = $props();
</script>

<div class="upload-workspace">
  <div class="upload-fields">
    <label><span>Creative名</span><input value={name} oninput={(event) => onNameInput(event.currentTarget.value)} placeholder="例：秋キャンペーン 完成バナー" /></label>
    <label><span>完成画像</span><input class="file" type="file" accept="image/png,image/jpeg,image/webp" onchange={onUpload} /></label>
    <p>PNG・JPEG・WebP、8MB以下。容量が大きい画像はピクセル寸法を保ったままWebPへ自動最適化します。</p>
    {#if error}<p class="error" role="alert">{error}</p>{/if}
    {#if asset}
      <dl><div><dt>画像サイズ</dt><dd>{asset.width} × {asset.height}px</dd></div><div><dt>形式</dt><dd>{asset.mimeType.replace('image/', '').toUpperCase()}</dd></div></dl>
    {/if}
  </div>
  <div class="uploaded-preview">
    <div class="preview-head"><strong>完成Creativeプレビュー</strong>{#if asset}<span>{asset.width} × {asset.height}px</span>{/if}</div>
    <div class="stage">
      {#if asset}<img src={asset.url} alt="アップロードした完成Creative" />{:else}<div class="empty"><strong>画像を選択してください</strong><span>画像そのものが広告Creativeとして登録されます</span></div>{/if}
    </div>
  </div>
</div>

<style>
  .upload-workspace { display: grid; grid-template-columns: 340px minmax(0, 1fr); gap: 24px; align-items: start; }
  .upload-fields, .uploaded-preview { overflow: hidden; border: 1px solid #e2e8f0; border-radius: 14px; background: white; }
  .upload-fields { display: grid; gap: 15px; padding: 20px; }
  label { display: grid; gap: 7px; color: #334155; font-size: 13px; font-weight: 650; }
  input { width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 11px; color: #172033; font: inherit; font-size: 12px; }
  input:focus { border-color: #3b82f6; outline: none; box-shadow: 0 0 0 3px #dbeafe; }
  .file { border-style: dashed; border-color: #93c5fd; background: #eff6ff; }
  p { margin: 0; color: #64748b; font-size: 10px; line-height: 1.6; }
  p.error { color: #dc2626; font-size: 12px; }
  dl { margin: 0; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 8px; }
  dl div { display: grid; grid-template-columns: 90px 1fr; border-bottom: 1px solid #e2e8f0; }
  dl div:last-child { border-bottom: 0; }
  dt, dd { margin: 0; padding: 9px 10px; font-size: 10px; }
  dt { background: #f8fafc; color: #64748b; }
  dd { font-weight: 700; }
  .preview-head { display: flex; align-items: center; justify-content: space-between; padding: 17px 20px; border-bottom: 1px solid #e2e8f0; }
  .preview-head strong { font-size: 14px; }
  .preview-head span { color: #64748b; font-size: 10px; }
  .stage { display: grid; min-height: 410px; padding: 32px; place-items: center; overflow: auto; background-color: #f8fafc; background-image: linear-gradient(45deg,#e2e8f0 25%,transparent 25%),linear-gradient(-45deg,#e2e8f0 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e2e8f0 75%),linear-gradient(-45deg,transparent 75%,#e2e8f0 75%); background-position: 0 0,0 8px,8px -8px,-8px 0; background-size: 16px 16px; }
  img { display: block; max-width: 100%; height: auto; box-shadow: 0 12px 28px #0f172a2b; }
  .empty { display: grid; justify-items: center; gap: 7px; color: #94a3b8; text-align: center; }
  .empty strong { font-size: 13px; }
  .empty span { font-size: 10px; }
  @media (max-width: 900px) { .upload-workspace { grid-template-columns: 1fr; } .stage { min-height: 330px; } }
</style>
