// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ find: vi.fn(), transition: vi.fn(), current: vi.fn(), owner: vi.fn(), mutate: vi.fn() }));
vi.mock('./store', async original => ({ ...await original<typeof import('./store')>(), findPlan: m.find, transition: m.transition }));
vi.mock('./settings', async original => ({ ...await original<typeof import('./settings')>(), currentSettings: m.current, ownedConnection: m.owner }));
vi.mock('../google-ads/api', () => ({ mutateTestResources: m.mutate }));
import { executePlan, operations } from './execute';
import { asPlan } from './store';
const before = { customerId: '2222222222', campaignId: '42', name: 'Before', status: 'PAUSED', currency: 'JPY' as const, budgetResource: 'customers/2222222222/campaignBudgets/99', budgetMicros: '500000000', fetchedAt: new Date().toISOString() };
const row = { id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', customer_id: before.customerId, campaign_id: '42', state: 'approved' as const, before_settings: before, changes: [{ field: 'dailyBudget' as const, before: '500000000', after: '600000000' }], reason: 'test', request_hash: '', created_at: new Date(), decided_at: new Date(0) };
const input = { id: row.id, customerId: before.customerId, campaignId: '42', action: 'execute' };
beforeEach(() => {
  vi.resetAllMocks(); m.find.mockResolvedValue(row); m.owner.mockResolvedValue({ loginCustomerId: null });
  m.transition.mockImplementation(async (_s, _id, state) => ({ ...row, state }));
  m.current.mockResolvedValueOnce(before).mockResolvedValue({ ...before, budgetMicros: '600000000' });
});
describe('Execution of approved plans', () => {
  it('claims before reading and sends only the stored budget update, then verifies it', async () => {
    expect((await executePlan('owner', input)).state).toBe('applied');
    expect(m.transition.mock.calls[0]).toEqual(['owner', row.id, 'executing', ['approved']]);
    expect(m.mutate).toHaveBeenCalledWith('owner', before.customerId, null, { partialFailure: false, mutateOperations: [{ campaignBudgetOperation: { update: { resourceName: before.budgetResource, amountMicros: '600000000' }, updateMask: 'amountMicros' } }] });
    expect(m.current).toHaveBeenCalledTimes(2);
  });
  it('supports an atomic name and budget update without changing status', () => {
    const plan = asPlan(structuredClone(row)); plan.changes.push({ field: 'name', before: 'Before', after: 'After' });
    expect(operations(plan)[1]).toEqual({ campaignOperation: { update: { resourceName: 'customers/2222222222/campaigns/42', name: 'After' }, updateMask: 'name' } });
  });
  it('rejects unapproved, foreign and browser-altered plans without sending', async () => {
    for (const state of ['draft','cancelled','unknown','executing','stale']) {
      m.find.mockResolvedValueOnce({ ...row, state });
      await expect(executePlan('owner', input)).rejects.toMatchObject({ status: 409 });
    }
    await expect(executePlan('owner', { ...input, campaignId: '43' })).rejects.toMatchObject({ status: 404 });
    await expect(executePlan('owner', { ...input, dailyBudget: 999 })).rejects.toThrow('不正');
    expect(m.mutate).not.toHaveBeenCalled();
  });
  it('does not send after a claim race or a different active plan', async () => {
    m.transition.mockResolvedValueOnce(undefined);
    await expect(executePlan('owner', input)).rejects.toMatchObject({ status: 409 });
    m.transition.mockRejectedValueOnce({ code: '23505' });
    await expect(executePlan('owner', input)).rejects.toMatchObject({ status: 409 });
    expect(m.mutate).not.toHaveBeenCalled();
  });
  it('marks drift stale and releases a claim after a preflight read failure', async () => {
    m.current.mockReset().mockResolvedValue({ ...before, name: 'External edit' });
    expect((await executePlan('owner', input)).state).toBe('stale');
    m.current.mockRejectedValue(new Error('read failed'));
    await expect(executePlan('owner', input)).rejects.toThrow('read failed');
    expect(m.transition).toHaveBeenLastCalledWith('owner', row.id, 'approved', ['executing']);
    expect(m.mutate).not.toHaveBeenCalled();
  });
  it('keeps ambiguous writes unknown and reconciles without resending', async () => {
    m.mutate.mockRejectedValue(new Error('timeout'));
    expect((await executePlan('owner', input)).state).toBe('unknown');
    m.find.mockResolvedValue({ ...row, state: 'unknown' });
    expect((await executePlan('owner', { ...input, action: 'reconcile' })).state).toBe('applied');
    expect(m.mutate).toHaveBeenCalledTimes(1);
  });
  it('does not infer nonexecution from unchanged values, or recover an active request too early', async () => {
    m.find.mockResolvedValue({ ...row, state: 'unknown' });
    expect((await executePlan('owner', { ...input, action: 'reconcile' })).state).toBe('unknown');
    m.find.mockResolvedValue({ ...row, state: 'executing', decided_at: new Date() });
    await expect(executePlan('owner', { ...input, action: 'reconcile' })).rejects.toMatchObject({ status: 409 });
    expect(m.mutate).not.toHaveBeenCalled();
  });
  it('returns completed results idempotently without writes', async () => {
    m.find.mockResolvedValue({ ...row, state: 'applied' });
    expect((await executePlan('owner', input)).state).toBe('applied');
    expect(m.mutate).not.toHaveBeenCalled(); expect(m.transition).not.toHaveBeenCalled();
  });
});

it('does not send when a recovered preflight loses its final send claim', async () => {
  m.transition.mockResolvedValueOnce({ ...row, state: 'executing' }).mockResolvedValueOnce(undefined);
  await expect(executePlan('owner', input)).rejects.toMatchObject({ status: 409 });
  expect(m.mutate).not.toHaveBeenCalled();
});
