// @vitest-environment node
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it, vi } from 'vitest';
vi.mock('$env/dynamic/private', () => ({ env: { DATABASE_URL: process.env.TEST_DATABASE_URL } }));
import { database } from '../db';
import { asPlan, findPlan, insertPlan, transition, listStoredPlans, listActions } from './store';
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
  it('atomically logs decisions, prevents competing executions and blocks cancellation after claim', async () => {
    const first = { ...plan, id: randomUUID() }, second = { ...plan, id: randomUUID() };
    await insertPlan(subject, randomUUID(), 'first', first);
    await insertPlan(subject, randomUUID(), 'second', second);
    await transition(subject, first.id, 'approved', ['draft']);
    await transition(subject, second.id, 'approved', ['draft']);
    const claims = await Promise.allSettled([
      transition(subject, first.id, 'executing', ['approved']),
      transition(subject, second.id, 'executing', ['approved'])
    ]);
    expect(claims.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(claims.filter(r => r.status === 'rejected')).toHaveLength(1);
    const winner = claims.find(r => r.status === 'fulfilled') as PromiseFulfilledResult<Awaited<ReturnType<typeof transition>>>;
    const id = winner.value!.id;
    expect(await transition(subject, id, 'cancelled', ['approved'])).toBeUndefined();
    await transition(subject, id, 'unknown', ['executing']);
    const loser = id === first.id ? second.id : first.id;
    await expect(transition(subject, loser, 'executing', ['approved'])).rejects.toMatchObject({ code: '23505' });
    await transition(subject, id, 'applied', ['unknown']);
    await transition(subject, id, 'applied', ['unknown']);
    const actions = (await listActions(subject, settings.customerId, '42')).filter(a => a.planId === id);
    expect(actions.map(a => a.state)).toEqual(['applied','unknown','executing','approved','draft']);
    expect(await listActions('different-owner', settings.customerId, '42')).toEqual([]);
  });
});
