<script lang="ts">
  import { tick } from 'svelte';
  import { drawBanner } from '$lib/banner/drawBanner';
  import type { CreativeSource } from '$lib/types/creative';

  let { source }: { source: CreativeSource } = $props();
  let canvas = $state<HTMLCanvasElement>();

  $effect(() => {
    JSON.stringify(source);
    void renderThumbnail();
  });

  async function renderThumbnail() {
    await tick();
    if (!canvas || source.type !== 'studio') return;
    canvas.width = source.state.size.width;
    canvas.height = source.state.size.height;
    const context = canvas.getContext('2d');
    if (!context) return;
    const imageUrl = source.state.background.image;
    if (source.state.background.type === 'image' && imageUrl) {
      const image = new Image();
      image.onload = () => drawBanner(context, source.state, image);
      image.src = imageUrl;
    } else {
      drawBanner(context, source.state);
    }
  }
</script>

{#if source.type === 'studio'}
  <canvas bind:this={canvas} aria-label="studio Creativeプレビュー"></canvas>
{:else}
  <img src={source.asset.url} alt="アップロードCreativeプレビュー" />
{/if}

<style>
  canvas, img { display: block; max-width: 100%; max-height: 145px; width: auto; height: auto; object-fit: contain; box-shadow: 0 5px 14px #0f172a24; }
</style>
