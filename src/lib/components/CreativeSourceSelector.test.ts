import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import CreativeSourceSelector from './CreativeSourceSelector.svelte';

describe('Creative方式選択', () => {
  it('studio制作を選択できる', async () => {
    const onSelect = vi.fn();
    render(CreativeSourceSelector, { mode: 'upload', onSelect });
    await fireEvent.click(screen.getByText('studioで作成'));
    expect(onSelect).toHaveBeenCalledWith('studio');
  });

  it('完成画像アップロードを選択できる', async () => {
    const onSelect = vi.fn();
    render(CreativeSourceSelector, { mode: 'studio', onSelect });
    await fireEvent.click(screen.getByText('完成画像を登録'));
    expect(onSelect).toHaveBeenCalledWith('upload');
  });

  it('保存済みCreativeを選択できる', async () => {
    const onSelect = vi.fn();
    render(CreativeSourceSelector, { mode: 'studio', onSelect });
    await fireEvent.click(screen.getByText('保存済みから選択'));
    expect(onSelect).toHaveBeenCalledWith('library');
  });
});
