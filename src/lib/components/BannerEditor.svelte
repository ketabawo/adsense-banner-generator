<script lang="ts">
  import Field from './Field.svelte';
  import type { CreativeState, TextAlign } from '$lib/types/creative';

  let { creativeState, onImageUpload, onGenerateImage, imageGenerating, imageError }: {
    creativeState: CreativeState;
    onImageUpload: (event: Event) => void;
    onGenerateImage: (prompt: string) => void;
    imageGenerating: boolean;
    imageError: string;
  } = $props();
  let imagePrompt = $state('');
</script>

<div class="editor">
  <section>
    <h2><span>1</span> 基本設定</h2>
    <p class="current-size">編集中：<strong>{creativeState.size.label}</strong><br />サイズの切替・追加は上の「サイズ別の画像」で行います。</p>
    <div class="template-row"><span>テンプレート</span><strong>Simple</strong></div>
  </section>

  <section>
    <h2><span>2</span> 背景</h2>
    <div class="segmented">
      <button class:active={creativeState.background.type === 'color'} onclick={() => creativeState.background.type = 'color'}>単色</button>
      <button class:active={creativeState.background.type === 'image'} onclick={() => creativeState.background.type = 'image'}>画像</button>
    </div>
    {#if creativeState.background.type === 'color'}
      <Field label="背景色">
        <div class="color-row"><input type="color" bind:value={creativeState.background.color} /><input class="color-code" bind:value={creativeState.background.color} /></div>
      </Field>
    {:else}
      <Field label="背景画像" hint="PNG・JPEG・WebP（中央にcover表示）">
        <input class="file" type="file" accept="image/png,image/jpeg,image/webp" onchange={onImageUpload} />
      </Field>
      <div class="image-generation">
        <label for="image-prompt">AIで背景画像を生成</label>
        <textarea id="image-prompt" rows="3" maxlength="2000" bind:value={imagePrompt} placeholder="例：秋の森の中で温かいコーヒー。中央は文字を置ける余白に"></textarea>
        <button disabled={imageGenerating || !imagePrompt.trim()} onclick={() => onGenerateImage(imagePrompt.trim())}>{imageGenerating ? '生成中…' : '背景画像を生成'}</button>
        <p>OpenAIへ説明文を送信します。生成には時間がかかり、API利用料が発生します。生成後、コピーやCTAを編集できます。</p>
      </div>
      <Field label={`黒オーバーレイ ${Math.round(creativeState.background.overlayOpacity * 100)}%`}>
        <input type="range" min="0" max="0.8" step="0.01" bind:value={creativeState.background.overlayOpacity} />
      </Field>
      {#if imageError}<p class="error">{imageError}</p>{/if}
    {/if}
  </section>

  <section>
    <h2><span>3</span> メインコピー</h2>
    <Field label="テキスト" hint="改行できます">
      <textarea rows="3" bind:value={creativeState.headline.text}></textarea>
    </Field>
    <div class="grid-2">
      <Field label="文字サイズ"><input type="number" min="10" max="100" bind:value={creativeState.headline.fontSize} /></Field>
      <Field label="文字色"><input type="color" bind:value={creativeState.headline.color} /></Field>
    </div>
    <div class="option-row">
      <label class="check"><input type="checkbox" bind:checked={creativeState.headline.bold} /> 太字</label>
      <div class="align-buttons" aria-label="文字揃え">
        {#each [['left','左'], ['center','中'], ['right','右']] as option}
          <button class:active={creativeState.headline.align === option[0]} onclick={() => creativeState.headline.align = option[0] as TextAlign}>{option[1]}</button>
        {/each}
      </div>
    </div>
  </section>

  <section>
    <h2><span>4</span> サブコピー <label class="switch"><input type="checkbox" bind:checked={creativeState.subText.enabled} /><i></i></label></h2>
    {#if creativeState.subText.enabled}
      <Field label="テキスト"><input bind:value={creativeState.subText.text} /></Field>
      <div class="grid-2">
        <Field label="文字サイズ"><input type="number" min="8" max="60" bind:value={creativeState.subText.fontSize} /></Field>
        <Field label="文字色"><input type="color" bind:value={creativeState.subText.color} /></Field>
      </div>
    {/if}
  </section>

  <section>
    <h2><span>5</span> CTAボタン <label class="switch"><input type="checkbox" bind:checked={creativeState.cta.enabled} /><i></i></label></h2>
    {#if creativeState.cta.enabled}
      <Field label="ボタンテキスト"><input bind:value={creativeState.cta.text} /></Field>
      <div class="grid-2">
        <Field label="背景色"><input type="color" bind:value={creativeState.cta.backgroundColor} /></Field>
        <Field label="文字色"><input type="color" bind:value={creativeState.cta.color} /></Field>
      </div>
      <Field label={`角丸 ${creativeState.cta.borderRadius}px`}><input type="range" min="0" max="24" bind:value={creativeState.cta.borderRadius} /></Field>
    {/if}
  </section>
</div>

<style>
  .editor { display: grid; gap: 14px; }
  section { padding: 20px; border: 1px solid #e2e8f0; border-radius: 5px; background: white; display: grid; gap: 15px; }
  h2 { margin: 0; display: flex; align-items: center; gap: 9px; color: #172033; font-size: 14px; }
  h2 > span { display: grid; width: 23px; height: 23px; place-items: center; border-radius: 5px; background: #eff6ff; color: #2563eb; font-size: 12px; }
  textarea, input:not([type='color']):not([type='checkbox']):not([type='range']):not([type='file']) { box-sizing: border-box; width: 100%; border: 1px solid #cbd5e1; border-radius: 5px; background: white; padding: 10px 11px; color: #172033; font: inherit; font-weight: 450; outline: none; }
  textarea:focus, input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px #dbeafe; }
  textarea { resize: vertical; line-height: 1.5; }
  .template-row { display: flex; justify-content: space-between; color: #64748b; font-size: 13px; }
  .current-size { margin: 0; padding: 10px; border-radius: 5px; background: #eff6ff; color: #475569; font-size: 12px; line-height: 1.6; }
  .template-row strong { color: #2563eb; }
  .segmented { display: grid; grid-template-columns: 1fr 1fr; padding: 3px; border-radius: 5px; background: #f1f5f9; }
  button { border: 0; border-radius: 5px; padding: 8px; background: transparent; color: #64748b; cursor: pointer; font: inherit; font-size: 12px; }
  button.active { background: white; color: #2563eb; box-shadow: 0 1px 3px #94a3b84d; font-weight: 700; }
  .color-row { display: flex; gap: 9px; }
  input[type='color'] { width: 42px; min-width: 42px; height: 40px; padding: 3px; border: 1px solid #cbd5e1; border-radius: 5px; background: white; cursor: pointer; }
  .color-code { text-transform: uppercase; }
  input[type='range'] { width: 100%; accent-color: #2563eb; }
  .file { box-sizing: border-box; width: 100%; padding: 9px; border: 1px dashed #93c5fd; border-radius: 5px; background: #eff6ff; color: #475569; font-size: 12px; }
  .image-generation { display: grid; gap: 8px; padding: 12px; border: 1px solid #dbe3ef; border-radius: 5px; background: #f8fafc; }
  .image-generation label { color: #334155; font-size: 13px; font-weight: 650; }
  .image-generation button { justify-self: start; padding: 10px 14px; background: #2563eb; color: white; }
  .image-generation button:disabled { opacity: .5; cursor: default; }
  .image-generation p { margin: 0; color: #64748b; font-size: 11px; line-height: 1.6; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .option-row { display: flex; align-items: center; justify-content: space-between; }
  .check { color: #475569; font-size: 13px; }
  .check input { accent-color: #2563eb; }
  .align-buttons { display: flex; padding: 3px; border-radius: 5px; background: #f1f5f9; }
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
