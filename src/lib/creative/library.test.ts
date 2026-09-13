import { beforeEach, describe, expect, it } from 'vitest';
import { campaign } from '../../test/fixtures';
import { creativeUsageCount, loadCreativeLibrary, migrateCampaignCreatives, removeLibraryCreative, sameCreativeContent, saveLibraryCreative, toLibraryCreative } from './library';

describe('Creativeライブラリ', () => {
  beforeEach(async () => {
    const existing = await loadCreativeLibrary();
    await Promise.all(existing.map((creative) => removeLibraryCreative(creative.id)));
  });

  it('既存CampaignのCreativeを初回移行する', async () => {
    const sourceCampaign = campaign();
    const creatives = await migrateCampaignCreatives([sourceCampaign]);
    expect(creatives).toHaveLength(1);
    expect(creatives[0]).toMatchObject({ id: sourceCampaign.creative.id, name: sourceCampaign.creative.name });
  });

  it('同じIDのライブラリ原本を移行で上書きしない', async () => {
    const sourceCampaign = campaign();
    await saveLibraryCreative({ ...sourceCampaign.creative, name: 'ライブラリ原本', createdAt: sourceCampaign.createdAt, updatedAt: sourceCampaign.updatedAt });
    const creatives = await migrateCampaignCreatives([sourceCampaign]);
    expect(creatives[0].name).toBe('ライブラリ原本');
  });

  it('更新時も最初の作成日時を維持する', () => {
    const value = campaign().creative;
    const existing = { ...value, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z' };
    expect(toLibraryCreative({ ...value, name: '更新後' }, existing, '2026-09-01T00:00:00.000Z')).toMatchObject({
      name: '更新後',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z'
    });
  });

  it('同じCreative IDを参照するCampaign数を数える', () => {
    const campaigns = [campaign(), campaign({ id: 'campaign-2' }), campaign({ id: 'campaign-3', creative: { ...campaign().creative, id: 'other' } })];
    expect(creativeUsageCount(campaigns, 'creative-1')).toBe(2);
  });

  it('ライブラリ原本から内容が変更されたことを検出する', () => {
    const value = campaign().creative;
    const original = { ...value, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' };
    expect(sameCreativeContent(value, original)).toBe(true);
    expect(sameCreativeContent({ ...value, name: 'Campaign専用版' }, original)).toBe(false);
  });

  it('別サイズのVariant編集をCreativeの変更として扱い、ライブラリに保存する', () => {
    const value = campaign().creative;
    const state = value.source.type === 'studio' ? value.source.state : undefined;
    if (!state) throw new Error('studio fixture expected');
    const variants = [{ id: 'base', state }, { id: 'square', state: { ...state, size: { id: '1200x1200', width: 1200, height: 1200, label: 'Square' } } }];
    const original = toLibraryCreative({ ...value, activeVariantId: 'base' }, undefined, '2026-09-01T00:00:00.000Z', variants);
    expect(sameCreativeContent(original, original, variants)).toBe(true);
    const changed = structuredClone(variants);
    changed[1].state.headline.text = '別のコピー';
    expect(sameCreativeContent(original, original, changed)).toBe(false);
  });

  it('複数Variantの編集状態をIndexedDBから読み直せる', async () => {
    const value = campaign().creative;
    const state = value.source.type === 'studio' ? value.source.state : undefined;
    if (!state) throw new Error('studio fixture expected');
    const variants = [{ id: 'base', state }, { id: 'portrait', state: { ...state, size: { id: '960x1200', width: 960, height: 1200, label: 'Portrait' }, background: { ...state.background, image: 'data:image/webp;base64,cG9ydHJhaXQ=' } } }];
    await saveLibraryCreative(toLibraryCreative({ ...value, activeVariantId: 'portrait' }, undefined, '2026-09-13T00:00:00.000Z', variants));
    const reloaded = (await loadCreativeLibrary())[0];
    expect(reloaded.activeVariantId).toBe('portrait');
    expect(reloaded.variants).toHaveLength(2);
    expect(reloaded.variants?.[1].state.background.image).toBe('data:image/webp;base64,cG9ydHJhaXQ=');
  });

  it('ライブラリから削除してもCampaignのスナップショットは残る', async () => {
    const sourceCampaign = campaign();
    await migrateCampaignCreatives([sourceCampaign]);
    await removeLibraryCreative(sourceCampaign.creative.id);
    expect(await loadCreativeLibrary()).toEqual([]);
    expect(sourceCampaign.creative.name).toBe('画像テスト Creative');
  });
});
