// @vitest-environment node
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it, vi } from 'vitest';
vi.mock('$env/dynamic/private', () => ({ env: { DATABASE_URL: process.env.TEST_DATABASE_URL } }));
import { database } from '../db';
import { asPlan, findPlan, insertPlan, transition, listStoredPlans } from './store';
import { fingerprint } from './settings';
import type { ExecutionPlan } from '$lib/types/plan';
const subject = `plan-test-${randomUUID()}`;
const settings = { customerId: '2222222222', campaignId: '42', name: 'Integration test', status: 'PAUSED', currency: 'JPY' as const, budgetResource: 'customers/2222222222/campaignBudgets/99', budgetMicros: '1000000000', fetchedAt: new Date().toISOString() };
const plan: ExecutionPlan = { id: randomUUID(), customerId: settings.customerId, campaignId: '42', state: 'draft', before: settings, changes: [{ field: 'dailyBudget', before: settings.budgetMicros, after: '1500000000' }], reason: 'Integration test only', createdAt: '', decidedAt: null };
describe.skipIf(!process.env.TEST_DATABASE_URL)('Execution Plan PostgreSQL persistence', () => {
  afterAll(async () => { await database().query('DELETE FROM app_users WHERE google_subject = $1', [subject]); await database().end(); });
  it('preserves exact data, isolates owners, prevents duplicate inserts and serializes decisions', async () => {
    await database().query('INSERT INTO app_users (google_subject, email) VALUES ($1,$2)', [subject, 'plan-test@example.invalid']);
    const requestId = randomUUID();
    const inserted = await Promise.all([insertPlan(subject, requestId, 'hash', plan), insertPlan(subject, requestId, 'hash', { ...plan, id: randomUUID() })]);
    expect(inserted.filter(Boolean)).toHaveLength(1);
    const saved = inserted.find(Boolean)!;
    expect(fingerprint(saved.before_settings)).toBe(fingerprint(settings));
    expect(asPlan(saved).changes).toEqual(plan.changes);
    expect(await findPlan('different-owner', saved.id)).toBeUndefined();
    expect(await listStoredPlans(subject, '3333333333', '42')).toEqual([]);
    const decisions = await Promise.all([transition(subject, saved.id, 'approved', ['draft']), transition(subject, saved.id, 'cancelled', ['draft'])]);
    expect(decisions.filter(Boolean)).toHaveLength(1);
    expect((await findPlan(subject, saved.id))?.decided_at).toBeInstanceOf(Date);
    expect(await transition('different-owner', saved.id, 'cancelled', ['approved'])).toBeUndefined();
  });
});
