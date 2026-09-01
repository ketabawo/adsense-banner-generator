<script lang="ts">
  import type { CreativeMode } from '$lib/types/creative';

  let { mode, onSelect }: { mode: CreativeMode; onSelect: (mode: CreativeMode) => void } = $props();
</script>

<div class="source-selector" aria-label="Creativeの作成方法">
  <button class:active={mode === 'studio'} onclick={() => onSelect('studio')}>
    <span class="icon">✦</span>
    <span><strong>studioで作成</strong><small>コピーやCTAを編集できるバナー</small></span>
    <i>{mode === 'studio' ? '選択中' : '選択'}</i>
  </button>
  <button class:active={mode === 'upload'} onclick={() => onSelect('upload')}>
    <span class="icon">↑</span>
    <span><strong>完成画像を登録</strong><small>Photoshop・Canva・生成AIなどの画像</small></span>
    <i>{mode === 'upload' ? '選択中' : '選択'}</i>
  </button>
  <button class:active={mode === 'library'} onclick={() => onSelect('library')}>
    <span class="icon">▦</span>
    <span><strong>保存済みから選択</strong><small>Creativeライブラリから再利用</small></span>
    <i>{mode === 'library' ? '選択中' : '選択'}</i>
  </button>
</div>

<style>
  .source-selector { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 18px; }
  button { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 12px; border: 1px solid #dbe3ef; border-radius: 12px; padding: 14px; background: #f8fafc; color: #172033; cursor: pointer; font: inherit; text-align: left; }
  button:hover { border-color: #93c5fd; background: #f8fbff; }
  button.active { border-color: #3b82f6; background: #eff6ff; box-shadow: inset 0 0 0 1px #3b82f6; }
  .icon { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 9px; background: white; color: #2563eb; font-size: 16px; font-weight: 800; box-shadow: 0 1px 4px #0f172a12; }
  button > span:nth-child(2) { display: grid; gap: 3px; }
  strong { font-size: 12px; }
  small { color: #64748b; font-size: 10px; }
  i { padding: 4px 7px; border-radius: 10px; background: white; color: #64748b; font-size: 9px; font-style: normal; font-weight: 700; }
  button.active i { background: #2563eb; color: white; }
  @media (max-width: 900px) { .source-selector { grid-template-columns: 1fr; } }
</style>
