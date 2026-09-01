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

  it('ライブラリから削除してもCampaignのスナップショットは残る', async () => {
    const sourceCampaign = campaign();
    await migrateCampaignCreatives([sourceCampaign]);
    await removeLibraryCreative(sourceCampaign.creative.id);
    expect(await loadCreativeLibrary()).toEqual([]);
    expect(sourceCampaign.creative.name).toBe('画像テスト Creative');
  });
});
