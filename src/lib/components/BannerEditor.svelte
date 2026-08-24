<script lang="ts">
  import Field from './Field.svelte';
  import { BANNER_SIZES } from '$lib/banner/sizes';
  import type { BannerState, TextAlign } from '$lib/types/banner';

  let { state, onImageUpload, imageError }: {
    state: BannerState;
    onImageUpload: (event: Event) => void;
    imageError: string;
  } = $props();

  function chooseSize(event: Event) {
    const size = BANNER_SIZES.find((item) => item.id === (event.currentTarget as HTMLSelectElement).value);
    if (size) state.size = size;
  }
</script>

<div class="editor">
  <section>
    <h2><span>1</span> 基本設定</h2>
    <Field label="バナーサイズ">
      <select value={state.size.id} onchange={chooseSize}>
        {#each BANNER_SIZES as size}<option value={size.id}>{size.label}</option>{/each}
      </select>
    </Field>
    <div class="template-row"><span>テンプレート</span><strong>Simple</strong></div>
  </section>

  <section>
    <h2><span>2</span> 背景</h2>
    <div class="segmented">
      <button class:active={state.background.type === 'color'} onclick={() => state.background.type = 'color'}>単色</button>
      <button class:active={state.background.type === 'image'} onclick={() => state.background.type = 'image'}>画像</button>
    </div>
    {#if state.background.type === 'color'}
      <Field label="背景色">
        <div class="color-row"><input type="color" bind:value={state.background.color} /><input class="color-code" bind:value={state.background.color} /></div>
      </Field>
    {:else}
      <Field label="背景画像" hint="PNG・JPEG・WebP（中央にcover表示）">
        <input class="file" type="file" accept="image/png,image/jpeg,image/webp" onchange={onImageUpload} />
      </Field>
      <Field label={`黒オーバーレイ ${Math.round(state.background.overlayOpacity * 100)}%`}>
        <input type="range" min="0" max="0.8" step="0.01" bind:value={state.background.overlayOpacity} />
      </Field>
      {#if imageError}<p class="error">{imageError}</p>{/if}
    {/if}
  </section>

  <section>
    <h2><span>3</span> メインコピー</h2>
    <Field label="テキスト" hint="改行できます">
      <textarea rows="3" bind:value={state.headline.text}></textarea>
    </Field>
    <div class="grid-2">
      <Field label="文字サイズ"><input type="number" min="10" max="100" bind:value={state.headline.fontSize} /></Field>
      <Field label="文字色"><input type="color" bind:value={state.headline.color} /></Field>
    </div>
    <div class="option-row">
      <label class="check"><input type="checkbox" bind:checked={state.headline.bold} /> 太字</label>
      <div class="align-buttons" aria-label="文字揃え">
        {#each [['left','左'], ['center','中'], ['right','右']] as option}
          <button class:active={state.headline.align === option[0]} onclick={() => state.headline.align = option[0] as TextAlign}>{option[1]}</button>
        {/each}
      </div>
    </div>
  </section>

  <section>
    <h2><span>4</span> サブコピー <label class="switch"><input type="checkbox" bind:checked={state.subText.enabled} /><i></i></label></h2>
    {#if state.subText.enabled}
      <Field label="テキスト"><input bind:value={state.subText.text} /></Field>
      <div class="grid-2">
        <Field label="文字サイズ"><input type="number" min="8" max="60" bind:value={state.subText.fontSize} /></Field>
        <Field label="文字色"><input type="color" bind:value={state.subText.color} /></Field>
      </div>
    {/if}
  </section>

  <section>
    <h2><span>5</span> CTAボタン <label class="switch"><input type="checkbox" bind:checked={state.cta.enabled} /><i></i></label></h2>
    {#if state.cta.enabled}
      <Field label="ボタンテキスト"><input bind:value={state.cta.text} /></Field>
      <div class="grid-2">
        <Field label="背景色"><input type="color" bind:value={state.cta.backgroundColor} /></Field>
        <Field label="文字色"><input type="color" bind:value={state.cta.color} /></Field>
      </div>
      <Field label={`角丸 ${state.cta.borderRadius}px`}><input type="range" min="0" max="24" bind:value={state.cta.borderRadius} /></Field>
    {/if}
  </section>
</div>

<style>
  .editor { display: grid; gap: 14px; }
  section { padding: 20px; border: 1px solid #e2e8f0; border-radius: 14px; background: white; display: grid; gap: 15px; }
  h2 { margin: 0; display: flex; align-items: center; gap: 9px; color: #172033; font-size: 14px; }
  h2 > span { display: grid; width: 23px; height: 23px; place-items: center; border-radius: 7px; background: #eff6ff; color: #2563eb; font-size: 12px; }
  select, textarea, input:not([type='color']):not([type='checkbox']):not([type='range']):not([type='file']) { box-sizing: border-box; width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; background: white; padding: 10px 11px; color: #172033; font: inherit; font-weight: 450; outline: none; }
  select:focus, textarea:focus, input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px #dbeafe; }
  textarea { resize: vertical; line-height: 1.5; }
  .template-row { display: flex; justify-content: space-between; color: #64748b; font-size: 13px; }
  .template-row strong { color: #2563eb; }
  .segmented { display: grid; grid-template-columns: 1fr 1fr; padding: 3px; border-radius: 9px; background: #f1f5f9; }
  button { border: 0; border-radius: 7px; padding: 8px; background: transparent; color: #64748b; cursor: pointer; font: inherit; font-size: 12px; }
  button.active { background: white; color: #2563eb; box-shadow: 0 1px 3px #94a3b84d; font-weight: 700; }
  .color-row { display: flex; gap: 9px; }
  input[type='color'] { width: 42px; min-width: 42px; height: 40px; padding: 3px; border: 1px solid #cbd5e1; border-radius: 8px; background: white; cursor: pointer; }
  .color-code { text-transform: uppercase; }
  input[type='range'] { width: 100%; accent-color: #2563eb; }
  .file { box-sizing: border-box; width: 100%; padding: 9px; border: 1px dashed #93c5fd; border-radius: 8px; background: #eff6ff; color: #475569; font-size: 12px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .option-row { display: flex; align-items: center; justify-content: space-between; }
  .check { color: #475569; font-size: 13px; }
  .check input { accent-color: #2563eb; }
  .align-buttons { display: flex; padding: 3px; border-radius: 8px; background: #f1f5f9; }
  .align-buttons button { width: 38px; padding: 6px; }
  .switch { margin-left: auto; }
  .switch input { position: absolute; opacity: 0; pointer-events: none; }
  .switch i { display: block; width: 34px; height: 19px; border-radius: 10px; background: #cbd5e1; position: relative; cursor: pointer; transition: .2s; }
  .switch i::after { content: ''; position: absolute; width: 15px; height: 15px; top: 2px; left: 2px; border-radius: 50%; background: white; transition: .2s; }
  .switch input:checked + i { background: #2563eb; }
  .switch input:checked + i::after { transform: translateX(15px); }
  .error { margin: 0; color: #dc2626; font-size: 12px; }
  @media (max-width: 480px) { section { padding: 16px; } }
</style>
