import { expect, it } from 'vitest';
import { createDefaultCreativeState } from '$lib/banner/defaultState';
import { collectVariants, createVariant } from './variants';

it('keeps independent edits when switching back to an existing Variant', () => {
  const base = createDefaultCreativeState();
  const square = createVariant(base, { id: '1200x1200', width: 1200, height: 1200, label: 'Square' }, 'square');
  const edited = structuredClone(square.state);
  edited.headline.text = 'Square only';
  const all = collectVariants([{ id: 'base', state: base }, square], 'square', edited);
  expect(all[1].state.headline.text).toBe('Square only');
  expect(all[0].state.headline.text).toBe(base.headline.text);
  expect(all[1].state).not.toBe(edited);
});

it('starts a new aspect ratio with its own empty background image', () => {
  const base = createDefaultCreativeState();
  base.background.type = 'image';
  base.background.image = 'data:image/webp;base64,old';
  const vertical = createVariant(base, { id: '900x1600', width: 900, height: 1600, label: 'Vertical' }, 'vertical');
  const all = [...collectVariants([], 'base', base), vertical];
  vertical.state.headline.text = 'Vertical only';
  expect(all.map(variant => variant.id)).toEqual(['base', 'vertical']);
  expect(all[0].state.background.image).toBe('data:image/webp;base64,old');
  expect(vertical.state.background).toMatchObject({ type: 'color', image: undefined });
  expect(vertical.state.size).toMatchObject({ width: 900, height: 1600 });
  expect(base.background.image).toBe('data:image/webp;base64,old');
  expect(base.headline.text).not.toBe('Vertical only');
});
