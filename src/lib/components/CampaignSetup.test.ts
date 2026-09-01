import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import CampaignSetupHarness from '../../test/CampaignSetupHarness.svelte';

describe('Campaign設定フォーム', () => {
  it('目的変更時にKPIを切り替えて親へ通知する', async () => {
    const onObjectiveChange = vi.fn();
    render(CampaignSetupHarness, { onObjectiveChange });

    await fireEvent.change(screen.getByLabelText('目的'), { target: { value: 'conversion' } });

    expect(onObjectiveChange).toHaveBeenCalledWith('conversion');
    expect(screen.getByLabelText('目標CPA（円）')).toBeInTheDocument();
  });

  it('日付エラーを入力欄付近に表示する', () => {
    render(CampaignSetupHarness, {
      dateError: '終了日は開始日以降の日付を指定してください。',
      onObjectiveChange: vi.fn()
    });
    expect(screen.getByRole('alert')).toHaveTextContent('終了日は開始日以降の日付を指定してください。');
    expect(screen.getByLabelText('開始日')).toHaveClass('invalid');
    expect(screen.getByLabelText('終了日（任意）')).toHaveClass('invalid');
  });
});
