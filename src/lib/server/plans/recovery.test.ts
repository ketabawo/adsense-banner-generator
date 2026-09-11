// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ find: vi.fn(), resolve: vi.fn(), transition: vi.fn(), current: vi.fn(), owner: vi.fn() }));
vi.mock('./store', async original => ({ ...await original<typeof import('./store')>(), findPlan: m.find, resolveStoredPlan: m.resolve, transition: m.transition }));
vi.mock('./settings', async original => ({ ...await original<typeof import('./settings')>(), currentSettings: m.current, ownedConnection: m.owner }));
import { recoverySettings, resolvePlan } from './recovery';
import { fingerprint } from './settings';
const before = { customerId: '2222222222', campaignId: '42', name: 'Before', status: 'PAUSED', currency: 'JPY' as const, budgetResource: 'customers/2222222222/campaignBudgets/99', budgetMicros: '500000000', fetchedAt: new Date().toISOString() };
const row = { id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', customer_id: before.customerId, campaign_id: '42', state: 'unknown', before_settings: before, changes: [{ field: 'dailyBudget', before: before.budgetMicros, after: '600000000' }], reason: 'test', created_at: new Date(0), decided_at: new Date(0) };
const input = { id: row.id, customerId: before.customerId, campaignId: '42', action: 'resolve', expected: fingerprint(before), reason: '管理画面で現在値と変更履歴を確認', confirmed: true };
beforeEach(() => { vi.resetAllMocks(); m.find.mockResolvedValue(row); m.current.mockResolvedValue(before); m.resolve.mockImplementation(async (_s, _id, recovery) => ({ ...row, state: 'resolved', recovery })); });
it('records actual server values and the reason without claiming success', async () => {
  expect(await recoverySettings('owner', input.customerId, '42', input.id)).toEqual({ settings: before, fingerprint: fingerprint(before) });
  const result = await resolvePlan('owner', input);
  expect(result.state).toBe('resolved'); expect(result.recovery).toEqual({ settings: before, reason: input.reason });
  expect(m.resolve).toHaveBeenCalledWith('owner', row.id, result.recovery);
});
it('requires explicit acknowledgement, a reason and the reviewed fingerprint', async () => {
  for (const patch of [{ confirmed: false }, { reason: '' }, { expected: '' }, { budget: 100 }, { reason: 'x'.repeat(2001) }]) await expect(resolvePlan('owner', { ...input, ...patch })).rejects.toMatchObject({ status: 400 });
  expect(m.resolve).not.toHaveBeenCalled();
});
it('rejects recent requests, other owners/targets and completed states', async () => {
  m.find.mockResolvedValueOnce({ ...row, decided_at: new Date() });
  await expect(resolvePlan('owner', input)).rejects.toMatchObject({ status: 409 });
  m.find.mockResolvedValueOnce(undefined);
  await expect(resolvePlan('other-owner', input)).rejects.toMatchObject({ status: 404 });
  await expect(resolvePlan('owner', { ...input, campaignId: '43' })).rejects.toMatchObject({ status: 404 });
  for (const state of ['approved', 'draft', 'cancelled', 'resolved', 'applied']) {
    m.find.mockResolvedValueOnce({ ...row, state });
    await expect(resolvePlan('owner', input)).rejects.toMatchObject({ status: 409 });
  }
  expect(m.resolve).not.toHaveBeenCalled();
});
it('refuses drift and read failures; never trusts the displayed current value alone', async () => {
  m.current.mockResolvedValueOnce({ ...before, name: 'Edited externally' });
  await expect(resolvePlan('owner', input)).rejects.toMatchObject({ status: 409 });
  m.current.mockRejectedValue(new Error('offline'));
  await expect(resolvePlan('owner', input)).rejects.toThrow('offline');
  expect(m.resolve).not.toHaveBeenCalled();
});
it('records a matching target as applied, and refuses racing decisions', async () => {
  const current = { ...before, budgetMicros: '600000000' }; m.current.mockResolvedValue(current);
  m.transition.mockResolvedValueOnce({ ...row, state: 'applied' });
  expect((await resolvePlan('owner', { ...input, expected: fingerprint(current) })).state).toBe('applied');
  expect(m.resolve).not.toHaveBeenCalled();
  await expect(resolvePlan('owner', { ...input, expected: fingerprint(current) })).rejects.toMatchObject({ status: 409 });
  m.current.mockResolvedValue(before); m.resolve.mockResolvedValueOnce(undefined);
  await expect(resolvePlan('owner', input)).rejects.toMatchObject({ status: 409 });
});
