// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ settings: vi.fn(), owner: vi.fn(), find: vi.fn(), request: vi.fn(), insert: vi.fn(), transition: vi.fn(), list: vi.fn() }));
vi.mock('./settings', () => ({ currentSettings: mocks.settings, ownedConnection: mocks.owner, fingerprint: (value: { budgetMicros: string }) => value.budgetMicros === '1000000000' ? 'a'.repeat(64) : 'b'.repeat(64) }));
vi.mock('./store', async (original) => ({ ...await original<typeof import('./store')>(), findPlan: mocks.find, findRequest: mocks.request, insertPlan: mocks.insert, transition: mocks.transition, listStoredPlans: mocks.list }));
import { createPlan, decidePlan } from './service';
const settings = { customerId: '2222222222', campaignId: '42', name: 'Example', status: 'PAUSED', currency: 'JPY', budgetResource: 'customers/2222222222/campaignBudgets/99', budgetMicros: '1000000000', fetchedAt: '2026-09-10T00:00:00Z' };
const row = { id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', customer_id: settings.customerId, campaign_id: '42', state: 'draft', before_settings: settings, changes: [{ field: 'dailyBudget', before: '1000000000', after: '1500000000' }], reason: '確認用', created_at: new Date(), decided_at: null };
const input = { customerId: settings.customerId, campaignId: '42', requestId: row.id, expected: 'a'.repeat(64), dailyBudget: 1500, reason: '確認用' };
const decision = { customerId: settings.customerId, campaignId: '42', id: row.id, action: 'approve' };
beforeEach(() => { vi.resetAllMocks(); mocks.settings.mockResolvedValue(settings); mocks.find.mockResolvedValue(structuredClone(row)); mocks.insert.mockImplementation(async (_subject, _id, hash) => ({ ...row, request_hash: hash })); mocks.transition.mockImplementation(async (_subject, _id, state) => ({ ...row, state, decided_at: new Date() })); });
describe('Execution Plan state transitions', () => {
  it('stores a canonical before/after and replays the same create without another insert', async () => {
    const created = await createPlan('owner', input);
    expect(created.changes).toEqual(row.changes);
    expect(mocks.insert.mock.calls[0][0]).toBe('owner');
    const saved = { ...row, request_hash: mocks.insert.mock.calls[0][2] };
    mocks.request.mockResolvedValue(saved);
    expect((await createPlan('owner', input)).id).toBe(created.id);
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    await expect(createPlan('owner', { ...input, dailyBudget: 1800 })).rejects.toThrow('内容が変わ');
  });
  it('refuses stale creation rather than silently replacing the reviewed before value', async () => {
    mocks.settings.mockResolvedValue({ ...settings, budgetMicros: '1200000000' });
    await expect(createPlan('owner', input)).rejects.toMatchObject({ status: 409 });
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it('approves only the saved plan after a fresh read', async () => {
    expect((await decidePlan('owner', decision)).state).toBe('approved');
    expect(mocks.settings).toHaveBeenCalledWith('owner', settings.customerId, '42');
    expect(mocks.transition).toHaveBeenCalledWith('owner', row.id, 'approved', ['draft']);
    await expect(decidePlan('owner', { ...decision, dailyBudget: 9999 })).rejects.toThrow('不正');
  });
  it('marks changed before values stale and does not turn read failures into approval', async () => {
    mocks.settings.mockResolvedValueOnce({ ...settings, budgetMicros: '1200000000' });
    expect((await decidePlan('owner', decision)).state).toBe('stale');
    mocks.transition.mockClear(); mocks.settings.mockRejectedValue(new Error('network'));
    await expect(decidePlan('owner', decision)).rejects.toThrow('network'); expect(mocks.transition).not.toHaveBeenCalled();
  });
  it('rejects wrong identity, cancelled plans and races with a concurrent decision', async () => {
    await expect(decidePlan('owner', { ...decision, campaignId: '99' })).rejects.toMatchObject({ status: 404 });
    mocks.find.mockResolvedValueOnce({ ...row, state: 'cancelled' });
    await expect(decidePlan('owner', decision)).rejects.toMatchObject({ status: 409 });
    mocks.transition.mockResolvedValue(undefined);
    await expect(decidePlan('owner', decision)).rejects.toThrow('別の操作');
  });
  it('makes repeat approval idempotent and permits revoking an approved plan', async () => {
    mocks.find.mockResolvedValue({ ...row, state: 'approved', decided_at: new Date() });
    expect((await decidePlan('owner', decision)).state).toBe('approved');
    expect(mocks.settings).not.toHaveBeenCalled();
    expect((await decidePlan('owner', { ...decision, action: 'cancel' })).state).toBe('cancelled');
  });
});
