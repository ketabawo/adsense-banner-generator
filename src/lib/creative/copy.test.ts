import { expect, it } from 'vitest';
import { createDefaultCreativeState } from '$lib/banner/defaultState';
import { applyCopyProposal, copyContext } from './copy';
const proposal = { reason: '短くしました', copy: { headline: '短いコピー', subText: 'サブ', cta: '見る' } };
it('applies only copy to the same editor state, preserving layout and hidden text', () => {
  const state = createDefaultCreativeState();
  state.subText.enabled = false;
  state.background.image = 'data:image/png;base64,original';
  const original = structuredClone(state);
  expect(applyCopyProposal(state, copyContext(state), proposal)).toBe(true);
  expect(state).toEqual({ ...original, headline: { ...original.headline, text: '短いコピー' }, cta: { ...original.cta, text: '見る' } });
});
it.each(['copy', 'size', 'enabled'])('rejects stale proposals after %s edits', change => {
  const state = createDefaultCreativeState(); const before = copyContext(state);
  if (change === 'copy') state.headline.text = '手動変更';
  if (change === 'size') state.size = { ...state.size, width: 336 };
  if (change === 'enabled') state.cta.enabled = false;
  const edited = structuredClone(state);
  expect(applyCopyProposal(state, before, proposal)).toBe(false);
  expect(state).toEqual(edited);
});
