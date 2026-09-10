import { performanceReport } from '../google-ads/performance';
import { connectionStatus } from '../google-ads/connections';
import { generateAdvice, requireAssistantConfig } from './openai';
import { AssistantError, parseAssistantInput } from './input';
import type { AssistantReply } from '$lib/types/assistant';

// Per-process protection for the single-instance, personal-use MVP.
// Keep in-flight entries until finally; never evict one to admit another request.
const requests = new Map<string, { busy: boolean; until: number }>();
function reserve(subject: string) {
  const now = Date.now();
  for (const [key, value] of requests) if (!value.busy && value.until <= now) requests.delete(key);
  if (requests.has(subject) || requests.size >= 1000) throw new AssistantError('AI相談を処理中、または送信間隔が短すぎます。10秒ほど待ってからお試しください。', 429);
  const entry = { busy: true, until: now + 10000 };
  requests.set(subject, entry);
  return () => { entry.busy = false; };
}
export async function consultCampaign(subject: string, body: unknown): Promise<AssistantReply> {
  const input = parseAssistantInput(body);
  requireAssistantConfig();
  const release = reserve(subject);
  try {
    const report = await performanceReport(subject, input.days);
    if (report.account.customerId !== input.customerId || report.start !== input.start || report.end !== input.end)
      throw new AssistantError('接続先または集計期間が変わりました。Dashboardの実績を更新してください。', 409);
    const campaign = report.campaigns.find(item => item.id === input.campaignId);
    if (!campaign) throw new AssistantError('このCampaignの入稿成功記録を確認できません。実績を更新してください。', 404);
    if (campaign.status === 'UNAVAILABLE') throw new AssistantError('Campaignの状態を取得できないため相談を開始できません。実績を更新してください。', 409);
    // Check selection again immediately before transferring the selected campaign to OpenAI.
    const current = await connectionStatus(subject);
    if (current.customerId !== report.account.customerId || current.loginCustomerId !== report.account.loginCustomerId)
      throw new AssistantError('接続先が変わりました。Dashboardの実績を更新してください。', 409);
    const advice = await generateAdvice({
      facts: { testAccount: true, campaign: { name: campaign.name, status: campaign.status },
        period: { start: report.start, end: report.end, timeZone: report.account.timeZone },
        fetchedAt: report.fetchedAt, currency: report.account.currencyCode,
        metrics: campaign.metrics, daily: campaign.daily,
        unavailable: ['Creative画像', '目標KPI', '予算', 'ターゲティング設定', '地域別・KW別実績', '比較期間'],
        note: 'テストアカウントは配信しません。全指標0の日別行は省略されることがあります。' },
      question: input.question, history: input.history
    });
    return { advice, context: { campaignId: campaign.id, customerId: report.account.customerId,
      start: report.start, end: report.end, fetchedAt: report.fetchedAt, testAccount: true } };
  } finally { release(); }
}
