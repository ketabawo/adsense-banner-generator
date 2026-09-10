import type { CampaignSettings, PlanChange } from '$lib/types/plan';
export class PlanError extends Error {
  constructor(message: string, public readonly status = 400) { super(message); }
}
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new PlanError('変更案の入力が不正です。');
  return value as Record<string, unknown>;
}
export function identity(customer: unknown, campaign: unknown) {
  if (typeof customer !== 'string' || !/^\d{10}$/.test(customer) || typeof campaign !== 'string' || !/^\d{1,20}$/.test(campaign))
    throw new PlanError('Campaignを選択し直してください。');
  return { customerId: customer, campaignId: campaign };
}
export function uuid(value: unknown) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new PlanError('変更案のIDが不正です。');
  return value;
}
export function parseCreate(value: unknown) {
  const body = object(value);
  if (Object.keys(body).some(key => !['customerId', 'campaignId', 'requestId', 'expected', 'name', 'dailyBudget', 'reason'].includes(key))) throw new PlanError('未対応の変更項目が含まれています。');
  const ids = identity(body.customerId, body.campaignId);
  const expected = body.expected;
  if (typeof expected !== 'string' || !/^[a-f0-9]{64}$/.test(expected)) throw new PlanError('現在の設定を取得し直してください。');
  if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 100 || /[\u0000-\u001f\u007f]/.test(body.name)))
    throw new PlanError('Campaign名は1〜100文字で入力してください。');
  if (body.dailyBudget !== undefined && (typeof body.dailyBudget !== 'number' || !Number.isSafeInteger(body.dailyBudget) || body.dailyBudget < 1 || body.dailyBudget > 100000000))
    throw new PlanError('日予算は1〜100,000,000円の整数で入力してください。');
  if (body.name === undefined && body.dailyBudget === undefined) throw new PlanError('変更する項目を選択してください。');
  if (typeof body.reason !== 'string' || !body.reason.trim() || body.reason.length > 2000 || body.reason.includes('\u0000')) throw new PlanError('変更理由を2000文字以内で入力してください。');
  return { ...ids, requestId: uuid(body.requestId), expected, name: typeof body.name === 'string' ? body.name.trim() : undefined,
    budgetMicros: typeof body.dailyBudget === 'number' ? String(BigInt(body.dailyBudget) * 1000000n) : undefined, reason: body.reason.trim() };
}
export function changesFor(before: CampaignSettings, input: ReturnType<typeof parseCreate>): PlanChange[] {
  const changes: PlanChange[] = [];
  if (input.name !== undefined && input.name !== before.name) changes.push({ field: 'name', before: before.name, after: input.name });
  if (input.budgetMicros !== undefined && input.budgetMicros !== before.budgetMicros) changes.push({ field: 'dailyBudget', before: before.budgetMicros, after: input.budgetMicros });
  if (!changes.length) throw new PlanError('現在値と変更後の値が同じです。');
  return changes;
}
export async function readPlanBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new PlanError('変更案の入力がありません。');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16000) { await reader.cancel(); throw new Error(); }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch { throw new PlanError('変更案の入力が不正、または大きすぎます。'); }
  finally { reader.releaseLock(); }
}
