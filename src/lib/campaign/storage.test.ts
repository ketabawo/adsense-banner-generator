import { describe, expect, it } from 'vitest';
import { loadCampaigns, saveCampaigns } from './storage';
import { campaign } from '../../test/fixtures';

const STORAGE_KEY = 'studio.campaigns.v1';

describe('Campaign保存と復元', () => {
  it('Campaignを保存して再読み込みできる', () => {
    const value = campaign();
    saveCampaigns([value]);
    expect(loadCampaigns()).toEqual([value]);
  });

  it('旧配列形式の保存データを引き継ぐ', () => {
    const value = campaign();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([value]));
    expect(loadCampaigns()).toEqual([value]);
  });

  it('新規保存をバージョン付き形式にする', () => {
    saveCampaigns([campaign()]);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')).toMatchObject({ version: 1 });
  });

  it('壊れたCampaignだけを読み飛ばす', () => {
    const value = campaign();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, campaigns: [{ id: 'broken' }, value] }));
    expect(loadCampaigns()).toEqual([value]);
  });

  it('アップロードCreativeを保存して再編集用に復元できる', () => {
    const value = campaign({
      creative: {
        id: 'uploaded-creative',
        name: '完成バナー',
        source: {
          type: 'upload',
          asset: { url: 'data:image/jpeg;base64,test', mimeType: 'image/jpeg', width: 300, height: 250 }
        }
      }
    });
    saveCampaigns([value]);
    expect(loadCampaigns()).toEqual([value]);
  });

  it('JSON自体が壊れている場合は空一覧を返す', () => {
    localStorage.setItem(STORAGE_KEY, '{broken');
    expect(loadCampaigns()).toEqual([]);
  });

  it('容量超過を保存前に拒否し、既存データを維持する', () => {
    const existing = campaign();
    saveCampaigns([existing]);
    const oversized = campaign();
    if (oversized.creative.source.type === 'studio') oversized.creative.source.state.background.image = 'x'.repeat(2_300_000);
    expect(() => saveCampaigns([oversized])).toThrow('storage_limit');
    expect(loadCampaigns()).toEqual([existing]);
  });
});
