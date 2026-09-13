<script lang="ts">
  import { VARIANT_SIZES } from '$lib/banner/variantSizes';
  import { BANNER_SIZES } from '$lib/banner/sizes';
  import CreativeThumbnail from './CreativeThumbnail.svelte';
  import type { CreativeSize, CreativeState, CreativeVariant, LibraryCreative } from '$lib/types/creative';

  let { variants, activeId, currentState, savedCreatives, onSelect, onAdd, onImport, onRemove }: {
    variants: CreativeVariant[];
    activeId: string;
    currentState: CreativeState;
    savedCreatives: LibraryCreative[];
    onSelect: (id: string) => void;
    onAdd: (size: CreativeSize) => void;
    onImport: (state: CreativeState, name: string) => void;
    onRemove: (id: string) => void;
  } = $props();
  let selectedSize = $state(VARIANT_SIZES[0].id);
  const availableSizes = [...BANNER_SIZES, ...VARIANT_SIZES];
  let savedSelection = $state('');
  let restoreStatus = $state('');
  const visible = $derived((variants.length ? variants : [{ id: activeId, state: currentState }]).map(variant =>
    variant.id === activeId ? { ...variant, state: currentState } : variant
  ));
  const savedOptions = $derived(savedCreatives.flatMap(creative => creative.source.type === 'studio'
    ? (creative.variants?.length ? creative.variants : [{ id: 'base', state: creative.source.state }]).map(variant => ({
      key: `${creative.id}:${variant.id}`,
      label: `${creative.name} · ${variant.state.size.width} × ${variant.state.size.height}`,
      state: variant.state,
      name: creative.name
    })) : []));

  function importSavedVariant(key: string) {
    const selected = savedOptions.find(option => option.key === key);
    if (!selected) return;
    onImport(selected.state, selected.name);
    savedSelection = key;
    restoreStatus = `「${selected.label}」を追加して編集中です。`;
  }
</script>

<section class="variants" aria-label="Creativeのサイズ別Variant">
  <div class="intro"><strong>サイズ別の画像</strong><p>カードを選ぶと、そのサイズの画像を編集できます。サイズごとに画像と文字は別々に保存されます。</p></div>
  <div class="list">
    {#each visible as variant}
      {@const size = variant.state.size}
      {@const hasImage = variant.state.background.type === 'image' && !!variant.state.background.image}
      <div class:active={variant.id === activeId} class="variant">
        <button class="select" aria-label={`${size.label || `${size.width} × ${size.height}`} · ${hasImage ? '背景画像あり' : '背景画像なし'}${variant.id === activeId ? ' · 編集中' : ''}`} aria-current={variant.id === activeId ? 'true' : undefined} onclick={() => onSelect(variant.id)}>
          <span class="thumbnail"><CreativeThumbnail source={{ type: 'studio', state: variant.state }} /></span>
          <span class="details"><strong>{size.label || `${size.width} × ${size.height}`}</strong><small>{hasImage ? '背景画像あり' : '背景画像なし'}</small>{#if variant.name}<small>{variant.name}</small>{/if}</span>
          {#if variant.id === activeId}<span class="editing">編集中</span>{/if}
        </button>
        {#if visible.length > 1}<button class="remove" aria-label={`${size.label}を削除`} onclick={() => { if (window.confirm(`「${size.label}」をサイズ別の画像から削除しますか？`)) onRemove(variant.id); }}>削除</button>{/if}
      </div>
    {/each}
  </div>
  <div class="actions"><label for="variant-size">別のサイズを作る</label><select id="variant-size" bind:value={selectedSize}><optgroup label="固定サイズ画像広告に入稿可能">{#each BANNER_SIZES as size}<option value={size.id}>{size.label}</option>{/each}</optgroup><optgroup label="制作・保存用">{#each VARIANT_SIZES as size}<option value={size.id}>{size.label}</option>{/each}</optgroup></select><button class="primary" onclick={() => { const size = availableSizes.find(item => item.id === selectedSize); if (size) onAdd(size); }}>サイズを追加</button></div>
  <p class="hint">追加したサイズは背景画像なしで始まります。元の画像は上のカードに残ります。</p>
  {#if savedOptions.length}
    <div class="restore"><strong>以前の画像をサイズ別編集に戻す</strong><p>元の画像をここへ追加して、サイズごとに編集したい場合はこちらを使います。選ぶと一覧に追加して編集を開始します。</p><div class="actions"><label for="saved-variant">保存済みCreative</label><select id="saved-variant" value={savedSelection} onchange={(event) => importSavedVariant(event.currentTarget.value)}><option value="">Creativeを選択</option>{#each savedOptions as option}<option value={option.key}>{option.label}</option>{/each}</select></div>{#if restoreStatus}<p class="restore-status" role="status">{restoreStatus}</p>{/if}</div>
  {/if}
  <p class="note">固定サイズ画像広告に入稿できるサイズと、制作・保存用のサイズがあります。Reviewで入稿対象を選べます。</p>
</section>

<style>
  .variants { margin-bottom: 16px; padding: 16px; border: 1px solid #dbe3ef; border-radius: 5px; background: white; }
  .intro strong, .restore strong { font-size: 14px; color: #172033; }
  p { margin: 6px 0 12px; color: #64748b; font-size: 12px; line-height: 1.6; }
  .list { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 10px; }
  .variant { display: flex; flex-direction: column; border: 1px solid #cbd5e1; border-radius: 5px; overflow: hidden; background: #f8fafc; }
  .variant.active { border-color: #2563eb; box-shadow: 0 0 0 1px #2563eb; }
  button, select { border-radius: 5px; color: #334155; font: inherit; font-size: 12px; cursor: pointer; }
  .select { flex: 1; width: 100%; min-height: 142px; padding: 10px; border: 0; background: transparent; text-align: left; }
  .thumbnail { display: flex; height: 76px; align-items: center; justify-content: center; overflow: hidden; }
  .thumbnail :global(canvas) { max-height: 76px; box-shadow: none; }
  .details { display: flex; flex-direction: column; gap: 2px; margin-top: 8px; }
  .details small { color: #64748b; }
  .editing { display: inline-block; margin-top: 6px; color: #1d4ed8; font-weight: 700; }
  .remove { align-self: flex-end; width: auto; margin: 0 10px 10px; padding: 5px 9px; border: 1px solid #cbd5e1; background: white; color: #64748b; }
  .actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 14px; }
  .actions label { font-size: 12px; font-weight: 650; }
  .actions select { max-width: 100%; padding: 9px 11px; border: 1px solid #cbd5e1; background: white; }
  .primary { padding: 9px 11px; border: 0; background: #2563eb; color: white; }
  .primary:disabled { opacity: .5; cursor: default; }
  button:focus-visible, select:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
  .hint { margin-bottom: 0; }
  .restore { margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
  .restore p { margin-bottom: 0; }
  .restore .restore-status { margin-top: 8px; color: #166534; font-weight: 650; }
  .note { margin: 16px 0 0; font-size: 11px; }
</style>
