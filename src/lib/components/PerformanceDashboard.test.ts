import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PerformanceDashboard from './PerformanceDashboard.svelte';
const report = { account: { name: 'Test', customerId: '2222222222', currencyCode: 'JPY', timeZone: 'Asia/Tokyo' }, start: '2026-08-11', end: '2026-09-09', fetchedAt: '2026-09-10T00:00:00Z', campaigns: [{ id: '42', name: 'studio-test', status: 'PAUSED', daily: [], metrics: { impressions: 0, clicks: 0, cost: 0, conversions: 0, ctr: null, cpc: null, cpa: null } }] };
afterEach(() => vi.unstubAllGlobals());
describe('PerformanceDashboard', () => {
  it('shows successful empty metrics and clears results when the period changes', async () => {
    const fetcher = vi.fn().mockImplementation((url) => Promise.resolve(new Response(JSON.stringify(url === '/api/assistant' ? { configured: false } : report))));
    vi.stubGlobal('fetch', fetcher); render(PerformanceDashboard);
    await fireEvent.click(screen.getByRole('button', { name: '実績を取得・更新' }));
    expect(await screen.findByText(/Campaignの取得は成功/)).toBeInTheDocument();
    expect(screen.getByText('Google Adsの状態：停止中')).toBeInTheDocument();
    await fireEvent.change(screen.getByLabelText('集計期間'), { target: { value: '7' } });
    expect(screen.queryByText(/Campaignの取得は成功/)).not.toBeInTheDocument();
  });
  it('clears old results and displays API errors on refresh', async () => {
    let calls = 0;
    const fetcher = vi.fn().mockImplementation((url) => Promise.resolve(url === '/api/assistant'
      ? new Response(JSON.stringify({ configured: false }))
      : ++calls === 1 ? new Response(JSON.stringify(report))
      : new Response(JSON.stringify({ message: '接続をやり直してください。' }), { status: 502 })));
    vi.stubGlobal('fetch', fetcher); render(PerformanceDashboard);
    await fireEvent.click(screen.getByRole('button', { name: '実績を取得・更新' }));
    await screen.findByText(/Campaignの取得は成功/);
    await waitFor(() => expect(screen.getByRole('button', { name: '実績を取得・更新' })).toBeEnabled());
    await fireEvent.click(screen.getByRole('button', { name: '実績を取得・更新' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('接続をやり直してください。');
    expect(screen.queryByText(/Campaignの取得は成功/)).not.toBeInTheDocument();
  });
});
