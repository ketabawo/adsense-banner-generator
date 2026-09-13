import { fireEvent, render, screen } from '@testing-library/svelte';
import { beforeAll, expect, it, vi } from 'vitest';
import { createDefaultCreativeState } from '$lib/banner/defaultState';
import CreativeVariants from './CreativeVariants.svelte';

beforeAll(() => vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null));

it('switches, adds and removes independent size variants', async () => {
  const first = createDefaultCreativeState();
  const square = { ...createDefaultCreativeState(), size: { id: '1200x1200', width: 1200, height: 1200, label: 'Square 1200 × 1200' } };
  const onSelect = vi.fn(), onAdd = vi.fn(), onRemove = vi.fn();
  render(CreativeVariants, { variants: [{ id: 'base', state: first }, { id: 'square', state: square }], activeId: 'base', currentState: first, savedCreatives: [], onSelect, onAdd, onImport: vi.fn(), onRemove });
  await fireEvent.click(screen.getByRole('button', { name: /Square 1200 × 1200 · 背景画像なし/ }));
  expect(onSelect).toHaveBeenCalledWith('square');
  await fireEvent.click(screen.getByRole('button', { name: 'Square 1200 × 1200を削除' }));
  expect(onRemove).toHaveBeenCalledWith('square');
  await fireEvent.change(screen.getByLabelText('別のサイズを作る'), { target: { value: '960x1200' } });
  await fireEvent.click(screen.getByRole('button', { name: 'サイズを追加' }));
  expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ width: 960, height: 1200 }));
});

it('imports a saved studio image without changing its source record', async () => {
  const original = createDefaultCreativeState();
  original.background.type = 'image';
  original.background.image = 'data:image/webp;base64,b3JpZ2luYWw=';
  const onImport = vi.fn();
  render(CreativeVariants, { variants: [], activeId: 'base', currentState: original,
    savedCreatives: [{ id: 'original', name: '元画像', source: { type: 'studio', state: original }, createdAt: '2026-09-13', updatedAt: '2026-09-13' }],
    onSelect: vi.fn(), onAdd: vi.fn(), onImport, onRemove: vi.fn() });
  await fireEvent.change(screen.getByLabelText('保存済みCreative'), { target: { value: 'original:base' } });
  expect(onImport).toHaveBeenCalledWith(original, '元画像');
  expect(screen.getByRole('status')).toHaveTextContent('追加して編集中です');
  expect(original.background.image).toBe('data:image/webp;base64,b3JpZ2luYWw=');
});
