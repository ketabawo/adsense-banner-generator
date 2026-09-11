import { database } from '../db';
import type { ExecutionPlan } from '$lib/types/plan';
export type PlanRow = {
  id: string; customer_id: string; campaign_id: string; state: ExecutionPlan['state'];
  before_settings: ExecutionPlan['before']; changes: ExecutionPlan['changes']; reason: string;
  request_hash: string; created_at: Date; decided_at: Date | null;
};
export function asPlan(row: PlanRow): ExecutionPlan {
  return { id: row.id, customerId: row.customer_id, campaignId: row.campaign_id, state: row.state,
    before: row.before_settings, changes: row.changes, reason: row.reason,
    createdAt: row.created_at.toISOString(), decidedAt: row.decided_at?.toISOString() ?? null };
}
export async function findPlan(subject: string, id: string): Promise<PlanRow | undefined> {
  return (await database().query('SELECT * FROM execution_plans WHERE google_subject = $1 AND id = $2', [subject, id])).rows[0];
}
export async function findRequest(subject: string, requestId: string): Promise<PlanRow | undefined> {
  return (await database().query('SELECT * FROM execution_plans WHERE google_subject = $1 AND request_id = $2', [subject, requestId])).rows[0];
}
export async function listStoredPlans(subject: string, customer: string, campaign: string) {
  const result = await database().query('SELECT * FROM execution_plans WHERE google_subject = $1 AND customer_id = $2 AND campaign_id = $3 ORDER BY created_at DESC, id DESC LIMIT 50', [subject, customer, campaign]);
  return result.rows.map(asPlan);
}
export async function insertPlan(subject: string, requestId: string, hash: string, plan: ExecutionPlan) {
  const result = await database().query(`INSERT INTO execution_plans
    (id, google_subject, customer_id, campaign_id, request_id, request_hash, before_settings, changes, reason)
    VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9)
    ON CONFLICT (google_subject, request_id) DO NOTHING RETURNING *`,
    [plan.id, subject, plan.customerId, plan.campaignId, requestId, hash, JSON.stringify(plan.before), JSON.stringify(plan.changes), plan.reason]);
  return result.rows[0] as PlanRow | undefined;
}
export async function transition(subject: string, id: string, state: ExecutionPlan['state'], allowed: ExecutionPlan['state'][]) {
  const result = await database().query(`UPDATE execution_plans SET state = $3, decided_at = now()
    WHERE google_subject = $1 AND id = $2 AND state = ANY($4::text[]) RETURNING *`, [subject, id, state, allowed]);
  return result.rows[0] as PlanRow | undefined;
}

export async function listActions(subject: string, customer: string, campaign: string) {
  const result = await database().query(`SELECT a.* FROM plan_action_log a
    JOIN execution_plans p ON p.id = a.plan_id
    WHERE p.google_subject = $1 AND p.customer_id = $2 AND p.campaign_id = $3
    ORDER BY a.id DESC LIMIT 100`, [subject, customer, campaign]);
  return result.rows.map(row => ({ id: String(row.id), planId: row.plan_id, state: row.state, occurredAt: row.occurred_at.toISOString() }));
}
