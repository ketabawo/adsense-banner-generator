import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import CampaignList from './CampaignList.svelte';
import { campaign } from '../../test/fixtures';

describe('Campaign一覧', () => {
  it('Campaign本体を押すと編集を開始する', async () => {
    const value = campaign();
    const onEdit = vi.fn();
    render(CampaignList, { campaigns: [value], onCreate: vi.fn(), onEdit, onDelete: vi.fn() });
    await fireEvent.click(screen.getByText(value.name));
    expect(onEdit).toHaveBeenCalledWith(value);
  });

  it('削除ボタンは編集を開始せず削除処理だけを呼ぶ', async () => {
    const value = campaign();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(CampaignList, { campaigns: [value], onCreate: vi.fn(), onEdit, onDelete });
    await fireEvent.click(screen.getByRole('button', { name: `${value.name}を削除` }));
    expect(onDelete).toHaveBeenCalledWith(value);
    expect(onEdit).not.toHaveBeenCalled();
  });
});
