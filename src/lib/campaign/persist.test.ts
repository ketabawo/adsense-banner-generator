import { expect, it, vi } from 'vitest';
import { campaign } from '../../test/fixtures';
import { loadCampaigns, saveCampaigns } from './storage';
import { persistCampaignDraft } from './persist';
import { loadCreativeLibrary, removeLibraryCreative, toLibraryCreative } from '$lib/creative/library';
import type { LibraryCreative } from '$lib/types/creative';

it('複数Variantの保存に失敗したとき、Campaignの既存画像を上書きしない', async () => {
  const previous = campaign();
  saveCampaigns([previous]);
  const changed = campaign({ ...previous, creative: { ...previous.creative, id: 'new-creative' } });
  const creative = { ...changed.creative, createdAt: changed.createdAt, updatedAt: changed.updatedAt } as LibraryCreative;
  const save = vi.fn().mockRejectedValue(new Error('IndexedDB unavailable'));
  const load = vi.fn();

  await expect(persistCampaignDraft([changed], creative, { save, load })).rejects.toThrow('IndexedDB unavailable');
  expect(load).not.toHaveBeenCalled();
  expect(loadCampaigns()).toEqual([previous]);
});

it('Creativeライブラリの保存と読み直しが済んでからCampaignを更新する', async () => {
  const changed = campaign();
  const creative = { ...changed.creative, createdAt: changed.createdAt, updatedAt: changed.updatedAt } as LibraryCreative;
  const save = vi.fn(async () => { expect(loadCampaigns()).toEqual([]); });
  const load = vi.fn(async () => { expect(loadCampaigns()).toEqual([]); return [creative]; });

  await expect(persistCampaignDraft([changed], creative, { save, load })).resolves.toEqual([creative]);
  expect(loadCampaigns()).toEqual([changed]);
});

it('下書きを開き直しても入稿対象外の元画像と追加サイズの両方を取得できる', async () => {
  const previous = campaign();
  if (previous.creative.source.type !== 'studio') throw new Error('studio fixture expected');
  const original = structuredClone(previous.creative.source.state);
  original.size = { id: '1200x628', width: 1200, height: 628, label: 'Landscape' };
  original.background = { ...original.background, type: 'image', image: 'data:image/webp;base64,b3JpZ2luYWw=' };
  const added = structuredClone(original);
  added.size = { id: '300x250', width: 300, height: 250, label: '300 × 250' };
  added.background = { ...added.background, type: 'color', image: undefined };
  const changed = campaign({ ...previous, creative: { ...previous.creative, id: 'two-variants', activeVariantId: 'added', source: { type: 'studio', state: added } } });
  const creative = toLibraryCreative(changed.creative, undefined, changed.updatedAt, [
    { id: 'original', state: original }, { id: 'added', state: added }
  ]);

  try {
    await persistCampaignDraft([changed], creative);
    const reloadedCampaign = loadCampaigns()[0];
    const reloadedCreative = (await loadCreativeLibrary()).find(item => item.id === reloadedCampaign.creative.id);
    expect(reloadedCreative?.variants?.map(item => item.id)).toEqual(['original', 'added']);
    expect(reloadedCreative?.variants?.[0].state.background.image).toBe(original.background.image);
  } finally {
    await removeLibraryCreative(creative.id);
  }
});
