import { identity, object, PlanError, uuid } from './input';
import { currentSettings, fingerprint, ownedConnection } from './settings';
import { asPlan, findPlan, resolveStoredPlan, transition } from './store';
import { executionTarget } from './execute';

async function recoverable(subject: string, customer: unknown, campaign: unknown, value: unknown) {
  const ids = identity(customer, campaign), id = uuid(value);
  const row = await findPlan(subject, id);
  if (!row || row.customer_id !== ids.customerId || row.campaign_id !== ids.campaignId) throw new PlanError('変更案が見つかりません。', 404);
  await ownedConnection(subject, ids.customerId, ids.campaignId);
  if (!['executing', 'sending', 'unknown'].includes(row.state)) throw new PlanError('この変更案は復旧確認の対象ではありません。履歴を更新してください。', 409);
  if (!row.decided_at || Date.now() - row.decided_at.getTime() < 300000) throw new PlanError('最後の状態更新から5分待って、復旧用の現在値を取得してください。', 409);
  return row;
}
export async function recoverySettings(subject: string, customer: unknown, campaign: unknown, id: unknown) {
  const row = await recoverable(subject, customer, campaign, id);
  const settings = await currentSettings(subject, row.customer_id, row.campaign_id);
  return { settings, fingerprint: fingerprint(settings) };
}
export async function resolvePlan(subject: string, body: unknown) {
  const input = object(body);
  if (input.action !== 'resolve' || input.confirmed !== true || Object.keys(input).some(k => !['id','customerId','campaignId','action','expected','reason','confirmed'].includes(k))) throw new PlanError('復旧確認の入力が不正です。');
  if (typeof input.expected !== 'string' || !/^[a-f0-9]{64}$/.test(input.expected)) throw new PlanError('復旧用の現在値を取得してください。');
  if (typeof input.reason !== 'string' || !input.reason.trim() || input.reason.length > 2000 || input.reason.includes('\u0000')) throw new PlanError('終了理由を2000文字以内で入力してください。');
  const row = await recoverable(subject, input.customerId, input.campaignId, input.id);
  const current = await currentSettings(subject, row.customer_id, row.campaign_id);
  if (fingerprint(current) !== input.expected) throw new PlanError('確認中に現在値が変わりました。復旧用の現在値を取得し直してください。', 409);
  if (fingerprint(current) === fingerprint(executionTarget(asPlan(row)))) {
    const applied = await transition(subject, row.id, 'applied', ['executing','sending','unknown']);
    if (!applied) throw new PlanError('別の操作で状態が変わりました。履歴を更新してください。', 409);
    return asPlan(applied);
  }
  const saved = await resolveStoredPlan(subject, row.id, { reason: input.reason.trim(), settings: current });
  if (!saved) throw new PlanError('別の操作で状態が変わりました。履歴を更新して5分後に確認してください。', 409);
  return asPlan(saved);
}
