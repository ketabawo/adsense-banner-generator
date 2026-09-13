<script lang="ts">
  import CreativeThumbnail from './CreativeThumbnail.svelte';
  import type { LibraryCreative } from '$lib/types/creative';

  let { creatives, selectedId, selectedVariantId, usageCount, onSelect, onSelectVariant, onDelete }: {
    creatives: LibraryCreative[];
    selectedId?: string;
    selectedVariantId?: string;
    usageCount: (id: string) => number;
    onSelect: (creative: LibraryCreative) => void;
    onSelectVariant: (creative: LibraryCreative, variantId: string) => void;
    onDelete: (creative: LibraryCreative) => void;
  } = $props();
</script>

{#if creatives.length === 0}
  <div class="empty"><strong>保存済みCreativeはありません</strong><p>studioで作成するか、完成画像を登録してCampaignを保存すると、ここから再利用できます。</p></div>
{:else}
  <div class="library">
    {#each creatives as creative}
      <article class:selected={selectedId === creative.id}>
        <button class="select" onclick={() => onSelect(creative)}>
          <div class="thumb"><CreativeThumbnail source={creative.source} /></div>
          <div class="info"><strong>{creative.name}</strong><span>{creative.source.type === 'studio' ? 'studio制作' : '完成画像'} ・ {creative.source.type === 'studio' ? creative.source.state.size.width : creative.source.asset.width} × {creative.source.type === 'studio' ? creative.source.state.size.height : creative.source.asset.height}px</span><small>{new Date(creative.updatedAt).toLocaleDateString('ja-JP')} ・ {usageCount(creative.id)} Campaignで使用</small></div>
        </button>
        {#if creative.variants?.length && creative.variants.length > 1}
          <div class="variant-options" aria-label={`${creative.name}のVariant`}>
            {#each creative.variants as variant}
              <button aria-pressed={selectedId === creative.id && selectedVariantId === variant.id} onclick={() => onSelectVariant(creative, variant.id)}>{variant.state.size.label || `${variant.state.size.width} × ${variant.state.size.height}`}</button>
            {/each}
          </div>
        {/if}
        <button class="delete" aria-label={`${creative.name}をライブラリから削除`} onclick={() => onDelete(creative)}>削除</button>
      </article>
    {/each}
  </div>
{/if}

<style>
  .library { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
  article { position: relative; overflow: hidden; border: 1px solid #dbe3ef; border-radius: 5px; background: white; }
  article:hover, article.selected { border-color: #3b82f6; box-shadow: 0 0 0 1px #3b82f6; }
  .select { display: grid; width: 100%; border: 0; padding: 0; background: transparent; color: #172033; cursor: pointer; font: inherit; text-align: left; }
  .thumb { display: grid; min-height: 175px; padding: 15px; place-items: center; background: #f1f5f9; }
  .info { display: grid; gap: 5px; padding: 13px 52px 13px 13px; }
  .info strong { overflow: hidden; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
  .info span { color: #475569; font-size: 10px; }
  .info small { color: #94a3b8; font-size: 9px; }
  .delete { position: absolute; right: 9px; bottom: 11px; border: 0; border-radius: 5px; padding: 6px 7px; background: #f8fafc; color: #94a3b8; cursor: pointer; font: inherit; font-size: 9px; }
  .delete:hover { background: #fee2e2; color: #dc2626; }
  .variant-options { display: flex; flex-wrap: wrap; gap: 5px; padding: 0 10px 42px; }
  .variant-options button { border: 1px solid #cbd5e1; border-radius: 5px; padding: 5px 7px; background: white; color: #334155; cursor: pointer; font: inherit; font-size: 10px; }
  .variant-options button[aria-pressed='true'] { border-color: #2563eb; background: #dbeafe; color: #1d4ed8; }
  .empty { padding: 28px; border: 1px dashed #cbd5e1; border-radius: 5px; background: #f8fafc; text-align: center; }
  .empty strong { font-size: 13px; }
  .empty p { margin: 7px 0 0; color: #64748b; font-size: 11px; }
  @media (max-width: 900px) { .library { grid-template-columns: 1fr 1fr; } }
  @media (max-width: 600px) { .library { grid-template-columns: 1fr; } }
</style>
