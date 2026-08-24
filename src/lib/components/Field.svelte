<script lang="ts">
  import type { Snippet } from 'svelte';

  let { label, hint = '', children }: { label: string; hint?: string; children: Snippet } = $props();
</script>

<label class="field">
  <span>{label}</span>
  {@render children()}
  {#if hint}<small>{hint}</small>{/if}
</label>

<style>
  .field { display: grid; gap: 7px; color: #334155; font-size: 13px; font-weight: 650; }
  small { color: #94a3b8; font-size: 11px; font-weight: 400; }
</style>
