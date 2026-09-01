import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import CreativeLibrary from './CreativeLibrary.svelte';
import type { LibraryCreative } from '$lib/types/creative';

const creative: LibraryCreative = {
  id: 'uploaded-1',
  name: '完成バナー',
  source: { type: 'upload', asset: { url: 'data:image/png;base64,test', mimeType: 'image/png', width: 300, height: 250 } },
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z'
};

describe('保存済みCreative一覧', () => {
  it('Creative情報と使用Campaign数を表示して選択できる', async () => {
    const onSelect = vi.fn();
    render(CreativeLibrary, { creatives: [creative], usageCount: () => 2, onSelect, onDelete: vi.fn() });
    expect(screen.getByText('完成画像 ・ 300 × 250px')).toBeInTheDocument();
    expect(screen.getByText(/2 Campaignで使用/)).toBeInTheDocument();
    await fireEvent.click(screen.getByText('完成バナー'));
    expect(onSelect).toHaveBeenCalledWith(creative);
  });

  it('削除操作を選択操作と分離する', async () => {
    const onSelect = vi.fn();
    const onDelete = vi.fn();
    render(CreativeLibrary, { creatives: [creative], usageCount: () => 0, onSelect, onDelete });
    await fireEvent.click(screen.getByRole('button', { name: '完成バナーをライブラリから削除' }));
    expect(onDelete).toHaveBeenCalledWith(creative);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
