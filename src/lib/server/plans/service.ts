import { createHash, randomUUID } from 'node:crypto';
import { changesFor, identity, object, parseCreate, PlanError, uuid } from './input';
import { currentSettings, fingerprint, ownedConnection } from './settings';
import { asPlan, findPlan, findRequest, insertPlan, listStoredPlans, transition } from './store';
import type { ExecutionPlan } from '$lib/types/plan';

export async function listPlans(subject: string, customer: string, campaign: string) {
  await ownedConnection(subject, customer, campaign);
  return listStoredPlans(subject, customer, campaign);
}
export async function createPlan(subject: string, body: unknown): Promise<ExecutionPlan> {
  const input = parseCreate(body);
  await ownedConnection(subject, input.customerId, input.campaignId);
  const hash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const previous = await findRequest(subject, input.requestId);
  if (previous) {
    if (previous.request_hash !== hash) throw new PlanError('同じ送信IDで内容が変わっています。変更案を作り直してください。', 409);
    return asPlan(previous);
  }
  const before = await currentSettings(subject, input.customerId, input.campaignId);
  if (fingerprint(before) !== input.expected) throw new PlanError('Google Adsの設定が変わりました。現在の設定を取得し直して、変更案を確認してください。', 409);
  const plan: ExecutionPlan = { id: randomUUID(), customerId: input.customerId, campaignId: input.campaignId,
    state: 'draft', before, changes: changesFor(before, input), reason: input.reason, createdAt: '', decidedAt: null };
  const saved = await insertPlan(subject, input.requestId, hash, plan) ?? await findRequest(subject, input.requestId);
  if (!saved || saved.request_hash !== hash) throw new PlanError('変更案の保存結果を確認できません。履歴を更新してください。', 409);
  return asPlan(saved);
}
export async function decidePlan(subject: string, body: unknown): Promise<ExecutionPlan> {
  const input = object(body);
  if (Object.keys(input).some(key => !['id', 'action', 'customerId', 'campaignId'].includes(key)) || !['approve', 'cancel'].includes(String(input.action)))
    throw new PlanError('変更案の操作が不正です。');
  const ids = identity(input.customerId, input.campaignId);
  const id = uuid(input.id);
  const existing = await findPlan(subject, id);
  if (!existing || existing.customer_id !== ids.customerId || existing.campaign_id !== ids.campaignId) throw new PlanError('変更案が見つかりません。', 404);
  await ownedConnection(subject, ids.customerId, ids.campaignId);
  if (input.action === 'cancel') {
    const updated = await transition(subject, id, 'cancelled', ['draft', 'approved', 'stale']);
    return asPlan(updated ?? (await findPlan(subject, id))!);
  }
  if (existing.state === 'approved') return asPlan(existing);
  if (existing.state !== 'draft') throw new PlanError('この変更案は承認できません。新しい変更案を作成してください。', 409);
  const current = await currentSettings(subject, ids.customerId, ids.campaignId);
  const state = fingerprint(current) === fingerprint(existing.before_settings) ? 'approved' : 'stale';
  const updated = await transition(subject, id, state, ['draft']);
  if (!updated) throw new PlanError('別の操作で変更案の状態が変わりました。履歴を更新してください。', 409);
  // Approval is a durable decision only. This service has no Google Ads mutate call.
  return asPlan(updated);
}
