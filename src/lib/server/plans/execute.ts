import type { CampaignSettings, ExecutionPlan } from '$lib/types/plan';
import { mutateTestResources } from '../google-ads/api';
import { identity, object, PlanError, uuid } from './input';
import { currentSettings, fingerprint, ownedConnection } from './settings';
import { asPlan, findPlan, transition } from './store';

export function executionTarget(plan: ExecutionPlan): CampaignSettings {
  const target = { ...plan.before };
  if (!plan.changes.length || plan.changes.length > 2 || new Set(plan.changes.map(c => c.field)).size !== plan.changes.length)
    throw new PlanError('保存済み変更案が不正です。');
  for (const change of plan.changes) {
    if (change.field === 'name' && change.before === target.name && change.after.trim() && change.after.length <= 100 && !/[\u0000-\u001f\u007f]/.test(change.after)) target.name = change.after;
    else if (change.field === 'dailyBudget' && change.before === target.budgetMicros && /^[1-9]\d*$/.test(change.after)
      && BigInt(change.after) <= 100000000000000n && BigInt(change.after) % 1000000n === 0n) target.budgetMicros = change.after;
    else throw new PlanError('保存済み変更案が不正です。');
  }
  return target;
}
export function operations(plan: ExecutionPlan) {
  const target = executionTarget(plan);
  return plan.changes.map(change => change.field === 'name'
    ? { campaignOperation: { update: { resourceName: `customers/${plan.customerId}/campaigns/${plan.campaignId}`, name: target.name }, updateMask: 'name' } }
    : { campaignBudgetOperation: { update: { resourceName: target.budgetResource, amountMicros: target.budgetMicros }, updateMask: 'amountMicros' } });
}

export async function executePlan(subject: string, body: unknown): Promise<ExecutionPlan> {
  const input = object(body);
  if (Object.keys(input).some(k => !['id','customerId','campaignId','action'].includes(k)) || !['execute','reconcile'].includes(String(input.action))) throw new PlanError('変更案の操作が不正です。');
  const ids = identity(input.customerId, input.campaignId), id = uuid(input.id);
  const row = await findPlan(subject, id);
  if (!row || row.customer_id !== ids.customerId || row.campaign_id !== ids.campaignId) throw new PlanError('変更案が見つかりません。', 404);
  await ownedConnection(subject, ids.customerId, ids.campaignId);
  const plan = asPlan(row), target = executionTarget(plan);
  if (plan.state === 'applied') return plan;
  if (input.action === 'reconcile') {
    if (!['executing','sending','unknown'].includes(plan.state)) throw new PlanError('再照合できる状態ではありません。', 409);
    // Wait beyond the API timeout before recovering an interrupted process.
    if (['executing', 'sending'].includes(plan.state) && (!plan.decidedAt || Date.now() - Date.parse(plan.decidedAt) < 60000)) throw new PlanError('反映処理中です。1分後に履歴を更新してください。', 409);
    const current = await currentSettings(subject, ids.customerId, ids.campaignId);
    const state = fingerprint(current) === fingerprint(target) ? 'applied' : 'unknown';
    return asPlan(await transition(subject, id, state, ['executing','sending','unknown']) ?? (await findPlan(subject, id))!);
  }
  if (plan.state !== 'approved') throw new PlanError('承認済み・未反映の変更案だけ反映できます。履歴を更新してください。', 409);
  const bodyToSend = { mutateOperations: operations(plan), partialFailure: false };
  // A durable claim prevents retries and concurrent cancellation. A partial unique
  // index also blocks other plans for this campaign while the outcome is unknown.
  let claimed;
  try { claimed = await transition(subject, id, 'executing', ['approved']); }
  catch (error) {
    if ((error as { code?: string }).code === '23505') throw new PlanError('このCampaignには反映処理中または結果不明の変更案があります。先に再照合してください。', 409);
    throw error;
  }
  if (!claimed) throw new PlanError('別の操作で状態が変わりました。履歴を更新してください。', 409);
  let connection;
  try {
    const current = await currentSettings(subject, ids.customerId, ids.campaignId);
    if (fingerprint(current) !== fingerprint(plan.before)) return asPlan((await transition(subject, id, 'stale', ['executing']))!);
    connection = await ownedConnection(subject, ids.customerId, ids.campaignId);
  } catch (error) {
    await transition(subject, id, 'approved', ['executing']);
    throw error;
  }
  // A recovered preflight must never resume and send after its claim was closed.
  if (!await transition(subject, id, 'sending', ['executing'])) throw new PlanError('別の操作で状態が変わりました。履歴を更新してください。', 409);
  try {
    await mutateTestResources(subject, ids.customerId, connection.loginCustomerId, bodyToSend);
    const current = await currentSettings(subject, ids.customerId, ids.campaignId);
    if (fingerprint(current) === fingerprint(target)) return asPlan((await transition(subject, id, 'applied', ['sending','unknown']))!);
  } catch { /* A write may have succeeded despite a transport or persistence failure. */ }
  return asPlan(await transition(subject, id, 'unknown', ['sending']) ?? (await findPlan(subject, id))!);
}
