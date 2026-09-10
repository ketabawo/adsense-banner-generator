<script lang="ts">
  import CampaignAssistant from './CampaignAssistant.svelte';
  import ExecutionPlanPanel from './ExecutionPlanPanel.svelte';
  let suggestion = $state<{ campaignId: string; text: string; token: number }>();
  import type { Metrics, PerformanceReport } from '$lib/types/performance';
  let days = $state('30'), busy = $state(false), message = $state(''), selected = $state('');
  let report = $state<PerformanceReport | null>(null);
  const campaign = $derived(report?.campaigns.find(item => item.id === selected));
  const columns: { key: keyof Metrics; label: string; kind?: 'money' | 'percent' }[] = [
    { key: 'impressions', label: '表示回数' }, { key: 'clicks', label: 'クリック数' },
    { key: 'cost', label: '費用', kind: 'money' }, { key: 'conversions', label: 'CV' },
    { key: 'ctr', label: 'CTR', kind: 'percent' }, { key: 'cpc', label: '平均CPC', kind: 'money' }, { key: 'cpa', label: 'CPA', kind: 'money' }
  ];
  function format(value: number | null, kind?: 'money' | 'percent') {
    if (value === null) return '—';
    if (kind === 'money') return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: report?.account.currencyCode || 'JPY', maximumFractionDigits: 2 }).format(value);
    return new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 2 }).format(value) + (kind === 'percent' ? '%' : '');
  }
  function status(value: string) { return ({ PAUSED: '停止中', ENABLED: '有効', REMOVED: '削除済み', UNAVAILABLE: '状態を取得できません' } as Record<string, string>)[value] || value; }
  async function refresh() {
    if (busy) return;
    busy = true; message = ''; report = null;
    try {
      const response = await fetch(`/api/google-ads/performance?days=${days}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || '実績を取得できませんでした。ログイン状態を確認してください。');
      report = data;
      if (!report?.campaigns.some(item => item.id === selected)) selected = report?.campaigns[0]?.id || '';
    } catch (error) { message = error instanceof Error ? error.message : '実績を取得できませんでした。'; }
    finally { busy = false; }
  }
</script>
<section aria-labelledby="performance-title" class="dashboard" aria-busy={busy}>
  <div class="heading"><div><h2 id="performance-title">広告実績 Dashboard</h2><p>接続中のアカウントで、あなたがstudioから入稿したCampaignの実績を確認できます。</p></div>
    <div class="controls"><label>集計期間<select bind:value={days} disabled={busy} onchange={() => { report = null; message = ''; }}><option value="7">過去7日間</option><option value="30">過去30日間</option><option value="90">過去90日間</option></select></label><button onclick={refresh} disabled={busy}>{busy ? '取得中…' : '実績を取得・更新'}</button></div>
  </div>
  <p class="note">テストアカウントは広告を配信しないため、配信実績は発生しません。期間はアカウントのタイムゾーンで昨日までです。</p>
  {#if message}<p role="alert">{message}</p>{/if}
  {#if report}
    <p class="metadata">{report.account.name}（{report.account.customerId}） · {report.start} ～ {report.end} · {report.account.timeZone} · {report.account.currencyCode}</p>
    <p class="metadata">取得日時：{new Date(report.fetchedAt).toLocaleString('ja-JP')}</p>
    {#if !report.campaigns.length}<p role="status">このアカウントには、あなたの入稿成功記録がありません。</p>
    {:else}
      <label>Campaign<select bind:value={selected}>{#each report.campaigns as item}<option value={item.id}>{item.name}（{item.id}）</option>{/each}</select></label>
      {#if campaign}
        <p>Google Adsの状態：{status(campaign.status)}</p>
        {#if campaign.status !== 'UNAVAILABLE'}
          <div class="metrics">{#each columns as column}<div class="metric"><span>{column.label}</span><strong>{format(campaign.metrics[column.key], column.kind)}</strong></div>{/each}</div>
          <p class="metadata">CTR＝クリック数÷表示回数。平均CPC＝費用÷クリック数。CPA＝費用÷CV。分母が0の指標は「—」です。CVは計測設定・反映遅延に依存します。</p>
          <h3>日別実績</h3>
          {#if !campaign.daily.length}<p role="status">選択期間の配信実績はありません。Campaignの取得は成功しています。</p>
          {:else}
            <!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard users need to scroll the overflowing report table.) -->
            <div class="table-wrap" tabindex="0" role="region" aria-label="日別実績表"><table><thead><tr><th scope="col">日付</th>{#each columns as column}<th scope="col">{column.label}</th>{/each}</tr></thead><tbody>{#each campaign.daily as day}<tr><th scope="row">{day.date}</th>{#each columns as column}<td>{format(day.metrics[column.key], column.kind)}</td>{/each}</tr>{/each}</tbody></table></div>
            <p class="metadata">Google Adsから返された日のみ表示します。全指標が0の日は省略されることがあります。</p>
          {/if}
          {#key `${report.account.customerId}:${campaign.id}:${report.fetchedAt}:${days}`}
            <CampaignAssistant customerId={report.account.customerId} campaignId={campaign.id} days={Number(days)} start={report.start} end={report.end} onPlanReason={(text) => suggestion = { campaignId: campaign.id, text, token: Date.now() }} />
            <ExecutionPlanPanel customerId={report.account.customerId} campaignId={campaign.id} suggestion={suggestion?.campaignId === campaign.id ? suggestion : undefined} />
          {/key}
        {:else}<p role="status">入稿記録はありますが、Google AdsからCampaignの状態を取得できませんでした。</p>{/if}
      {/if}
    {/if}
  {:else if !busy && !message}<p>Google Adsを接続して「実績を取得・更新」を押してください。</p>{/if}
</section>
<style>
  .dashboard { background: white; border: 1px solid #dbe3ed; border-radius: 5px; padding: 22px; margin: 20px 0; color: #1e293b; }
  .heading, .controls { display: flex; align-items: end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
  h2 { margin: 0; font-size: 19px; } h3 { font-size: 15px; margin-top: 24px; }
  p { font-size: 13px; line-height: 1.7; } .metadata { color: #64748b; font-size: 12px; }
  .note { background: #eff6ff; border-radius: 5px; padding: 12px; }
  label { display: grid; gap: 6px; font-size: 12px; }
  select { padding: 9px; border: 1px solid #cbd5e1; border-radius: 5px; background: white; color: #1e293b; max-width: 100%; }
  button { background: #2563eb; color: white; border: 0; border-radius: 5px; padding: 11px 16px; cursor: pointer; }
  button:disabled { opacity: .5; cursor: default; }
  button:focus-visible, select:focus-visible, .table-wrap:focus-visible { outline: 3px solid #93c5fd; outline-offset: 2px; }
  .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; }
  .metric { border: 1px solid #e2e8f0; border-radius: 5px; padding: 14px; display: grid; gap: 8px; }
  .metric span { font-size: 12px; color: #64748b; } .metric strong { font-size: 22px; overflow-wrap: anywhere; }
  .table-wrap { overflow-x: auto; } table { width: 100%; border-collapse: collapse; white-space: nowrap; font-size: 12px; }
  th, td { padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0; } th:first-child { text-align: left; }
  @media (max-width: 600px) { .dashboard { padding: 14px; } .controls { width: 100%; } }
</style>
