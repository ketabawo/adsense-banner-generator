import { createHash } from 'node:crypto';
import { database } from '../db';
import { connectionStatus } from '../google-ads/connections';
import { searchAdsReport, verifyTestAccount } from '../google-ads/api';
import type { CampaignSettings } from '$lib/types/plan';
import { identity, PlanError } from './input';

export function fingerprint(settings: CampaignSettings) {
  // JSONB may reorder keys. Compare canonical values, excluding acquisition time.
  return createHash('sha256').update(JSON.stringify([settings.customerId, settings.campaignId, settings.name, settings.status, settings.currency, settings.budgetResource, settings.budgetMicros])).digest('hex');
}
export async function ownedConnection(subject: string, customer: string, campaign: string) {
  const ids = identity(customer, campaign);
  const connection = await connectionStatus(subject);
  if (connection.customerId !== ids.customerId) throw new PlanError('接続先が変わりました。実績を取得し直してください。', 409);
  const found = await database().query(`SELECT id FROM google_ads_submissions
    WHERE google_subject = $1 AND customer_id = $2 AND state = 'succeeded'
    AND EXISTS (SELECT 1 FROM jsonb_each_text(resources) AS r WHERE r.value = $3) LIMIT 1`,
    [subject, customer, `customers/${customer}/campaigns/${campaign}`]);
  if (!found.rowCount) throw new PlanError('このCampaignの入稿成功記録を確認できません。', 404);
  return connection;
}
export async function currentSettings(subject: string, customer: string, campaign: string): Promise<CampaignSettings> {
  const connection = await ownedConnection(subject, customer, campaign);
  const account = await verifyTestAccount(subject, customer, connection.loginCustomerId);
  if (account.currencyCode !== 'JPY') throw new PlanError('変更案は円建てのテストアカウントに対応しています。');
  const rows = await searchAdsReport(subject, customer, connection.loginCustomerId,
    `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, campaign.campaign_budget, campaign_budget.resource_name, campaign_budget.amount_micros, campaign_budget.explicitly_shared, campaign_budget.reference_count, campaign_budget.period FROM campaign WHERE campaign.id = ${campaign}`);
  const row = rows[0], value = row?.campaign, budget = row?.campaignBudget;
  if (rows.length !== 1 || value?.id !== campaign) throw new PlanError('Google AdsからCampaignを取得できませんでした。', 409);
  if (value.status !== 'PAUSED' || value.advertisingChannelType !== 'DISPLAY') throw new PlanError('停止中のDisplay Campaignのみ変更案を作成・承認できます。', 409);
  if (!value.name || !budget?.resourceName || value.campaignBudget !== budget.resourceName
    || !new RegExp(`^customers/${customer}/campaignBudgets/\\d+$`).test(budget.resourceName)
    || typeof budget.amountMicros !== 'string' || !/^\d+$/.test(budget.amountMicros) || BigInt(budget.amountMicros) > 9007199254740991n)
    throw new PlanError('現在の予算設定を確認できませんでした。', 409);
  if (budget.explicitlyShared === true || budget.referenceCount !== '1' || budget.period !== 'DAILY')
    throw new PlanError('専用の日予算を使うCampaignのみ対応しています。共有予算や通算予算は対象外です。', 409);
  const current = await connectionStatus(subject);
  if (current.customerId !== customer || current.loginCustomerId !== connection.loginCustomerId) throw new PlanError('接続先が変わりました。取得し直してください。', 409);
  return { customerId: customer, campaignId: campaign, name: value.name, status: value.status, currency: 'JPY',
    budgetResource: budget.resourceName, budgetMicros: String(BigInt(budget.amountMicros)), fetchedAt: new Date().toISOString() };
}
