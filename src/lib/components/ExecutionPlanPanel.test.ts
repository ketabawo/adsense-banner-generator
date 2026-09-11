import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ExecutionPlanPanel from './ExecutionPlanPanel.svelte';
const props = { customerId: '2222222222', campaignId: '42' };
const settings = { ...props, name: 'Before', status: 'PAUSED', currency: 'JPY', budgetResource: 'customers/2222222222/campaignBudgets/99', budgetMicros: '1000000000', fetchedAt: '2026-09-10T00:00:00Z' };
const plan = { id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', ...props, state: 'draft', before: settings, changes: [{ field: 'dailyBudget', before: '1000000000', after: '1500000000' }], reason: '確認用', createdAt: settings.fetchedAt, decidedAt: null };
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
afterEach(() => vi.unstubAllGlobals());
async function ready() { await waitFor(() => expect(screen.getByRole('button', { name: '現在の設定を取得' })).toBeEnabled()); }
describe('ExecutionPlanPanel', () => {
  it('requires a separate execution acknowledgement and offers read-only reconciliation for unknown results', async () => {
    let saved = { ...plan, state: 'approved', decidedAt: settings.fetchedAt };
    const fetcher = vi.fn().mockImplementation((url, init) => {
      if (url.includes('mode=actions')) return Promise.resolve(response({ actions: [{ id: '1', planId: plan.id, state: saved.state, occurredAt: settings.fetchedAt }] }));
      if (init?.method === 'PATCH') {
        saved = { ...saved, state: JSON.parse(init.body).action === 'execute' ? 'unknown' : 'applied' };
        return Promise.resolve(response({ plan: saved }));
      }
      return Promise.resolve(response({ plans: [saved] }));
    });
    vi.stubGlobal('fetch', fetcher); render(ExecutionPlanPanel, props); await ready();
    await fireEvent.click(screen.getByRole('button', { name: /承認済み/ }));
    const execute = screen.getByRole('button', { name: '承認済み変更案をGoogle Adsに反映' });
    expect(execute).toBeDisabled();
    await fireEvent.click(screen.getByLabelText('この変更内容をGoogle Adsのテストアカウントに反映することを確認しました'));
    await fireEvent.click(execute); await ready();
    expect(screen.queryByRole('button', { name: '承認済み変更案をGoogle Adsに反映' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'この変更案を取り消す' })).not.toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Google Adsの結果を再照合' })); await ready();
    expect(await screen.findByText('Google Adsの設定を再取得し、変更後の値との一致を確認しました。')).toBeInTheDocument();
    expect(fetcher.mock.calls.filter(c => c[1]?.method === 'PATCH').map(c => JSON.parse(c[1].body))).toEqual([
      { ...props, id: plan.id, action: 'execute' }, { ...props, id: plan.id, action: 'reconcile' }
    ]);
    expect(screen.getByRole('heading', { name: 'Action Log' })).toBeInTheDocument();
  });
  it('cancels an approved plan and reloads its cancelled history when reopened', async () => {
    let saved = { ...plan, state: 'approved', decidedAt: settings.fetchedAt };
    const fetcher = vi.fn().mockImplementation((_url, init) => {
      if (init?.method === 'PATCH') {
        saved = { ...saved, state: 'cancelled' };
        return Promise.resolve(response({ plan: saved }));
      }
      return Promise.resolve(response({ plans: [saved] }));
    });
    vi.stubGlobal('fetch', fetcher);
    const view = render(ExecutionPlanPanel, props);
    await ready();
    await fireEvent.click(screen.getByRole('button', { name: /承認済み/ }));
    await fireEvent.click(screen.getByRole('button', { name: 'この変更案を取り消す' }));
    expect(await screen.findByText('変更案を取り消しました。')).toBeInTheDocument();
    const call = fetcher.mock.calls.find(call => call[1]?.method === 'PATCH')!;
    expect(JSON.parse(call[1].body)).toEqual({ ...props, id: plan.id, action: 'cancel' });
    expect(screen.queryByRole('button', { name: 'この変更案を取り消す' })).not.toBeInTheDocument();
    view.unmount();
    render(ExecutionPlanPanel, props);
    await ready();
    await fireEvent.click(screen.getByRole('button', { name: /取り消し済み/ }));
    expect(screen.getByText('理由：確認用')).toBeInTheDocument();
    expect(screen.getByText('￥1,500')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'この変更案の承認を記録' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'この変更案を取り消す' })).not.toBeInTheDocument();
  });
  it('reviews immutable saved values and sends only plan identity on approval', async () => {
    const fetcher = vi.fn().mockImplementation((url, init) => Promise.resolve(response(init?.method === 'PATCH' ? { plan: { ...plan, state: 'approved', decidedAt: settings.fetchedAt } } : init?.method === 'POST' ? { plan } : url.includes('mode=settings') ? { settings, fingerprint: 'a'.repeat(64) } : { plans: [] })));
    vi.stubGlobal('fetch', fetcher); render(ExecutionPlanPanel, props); await ready();
    await fireEvent.click(screen.getByRole('button', { name: '現在の設定を取得' }));
    await screen.findByLabelText('日予算を変更');
    await fireEvent.click(screen.getByLabelText('日予算を変更'));
    await fireEvent.input(screen.getByLabelText('変更後の日予算（円）'), { target: { value: '1500' } });
    await fireEvent.input(screen.getByLabelText('変更理由'), { target: { value: '確認用' } });
    await fireEvent.click(screen.getByRole('button', { name: '変更案を保存して確認' }));
    const approve = await screen.findByRole('button', { name: 'この変更案の承認を記録' });
    await ready();
    expect(approve).toBeDisabled(); expect(screen.getByText('￥1,500')).toBeInTheDocument();
    await fireEvent.input(screen.getByLabelText('変更後の日予算（円）'), { target: { value: '9999' } });
    await fireEvent.click(screen.getByLabelText('この保存済み変更案の変更前後と理由を確認しました'));
    await fireEvent.click(approve);
    expect(await screen.findByText('承認を記録しました。Google Adsへの反映はまだ行っていません。')).toBeInTheDocument();
    const call = fetcher.mock.calls.find(call => call[1]?.method === 'PATCH')!;
    expect(JSON.parse(call[1].body)).toEqual({ ...props, id: plan.id, action: 'approve' });
    expect(screen.queryByRole('button', { name: 'この変更案の承認を記録' })).not.toBeInTheDocument();
  });
  it('shows stale approval and resets acknowledgement when selecting another plan', async () => {
    const second = { ...plan, id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb' };
    const fetcher = vi.fn().mockImplementation((_url, init) => Promise.resolve(response(init?.method === 'PATCH' ? { plan: { ...plan, state: 'stale' } } : { plans: [plan, second] })));
    vi.stubGlobal('fetch', fetcher); render(ExecutionPlanPanel, props); await ready();
    await fireEvent.click(screen.getAllByRole('button', { name: /未承認/ })[0]);
    await fireEvent.click(screen.getByLabelText('この保存済み変更案の変更前後と理由を確認しました'));
    await fireEvent.click(screen.getAllByRole('button', { name: /未承認/ })[1]);
    expect(screen.getByRole('button', { name: 'この変更案の承認を記録' })).toBeDisabled();
    await fireEvent.click(screen.getAllByRole('button', { name: /未承認/ })[0]);
    await fireEvent.click(screen.getByLabelText('この保存済み変更案の変更前後と理由を確認しました'));
    await fireEvent.click(screen.getByRole('button', { name: 'この変更案の承認を記録' }));
    expect(await screen.findByText(/Google Adsの現在値が変わったため承認できません/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'この変更案の承認を記録' })).not.toBeInTheDocument();
  });
});
