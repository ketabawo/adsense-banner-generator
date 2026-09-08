// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ access: vi.fn(), fetch: vi.fn() }));
vi.mock('$env/dynamic/private', () => ({ env: { GOOGLE_ADS_DEVELOPER_TOKEN: 'test-developer' } }));
vi.mock('./oauth', () => ({ adsAccessToken: mocks.access }));
import { adsErrorMessage, listTestAccounts, verifyTestAccount } from './api';
const account = { id: '2222222222', testAccount: true, manager: false, status: 'ENABLED', descriptiveName: 'Test ads', currencyCode: 'JPY', timeZone: 'Asia/Tokyo' };
const reply = (data: unknown) => new Response(JSON.stringify(data));
beforeEach(() => { vi.resetAllMocks(); mocks.access.mockResolvedValue('test-access'); vi.stubGlobal('fetch', mocks.fetch); });
afterEach(() => vi.unstubAllGlobals());
describe('read-only Google Ads account API', () => {
  it('discovers test clients below a manager and follows pagination', async () => {
    mocks.fetch.mockResolvedValueOnce(reply({ resourceNames: ['customers/1111111111'] }))
      .mockResolvedValueOnce(reply({ results: [{ customer: { id: '1111111111', manager: true, testAccount: true } }] }))
      .mockResolvedValueOnce(reply({ results: [{ customerClient: account }], nextPageToken: 'next' }))
      .mockResolvedValueOnce(reply({ results: [{ customerClient: { ...account, id: '3333333333' } }] }));
    const result = await listTestAccounts('owner');
    expect(result.accounts).toHaveLength(2);
    expect(result.accounts[0]).toMatchObject({ customerId: '2222222222', loginCustomerId: '1111111111' });
    const [url, init] = mocks.fetch.mock.calls[2];
    expect(url).toBe('https://googleads.googleapis.com/v25/customers/1111111111/googleAds:search');
    expect(init.headers['login-customer-id']).toBe('1111111111');
    expect(JSON.parse(init.body).query).not.toContain('status = ENABLED');
    expect(JSON.parse(mocks.fetch.mock.calls[3][1].body).pageToken).toBe('next');
    for (const [path] of mocks.fetch.mock.calls) expect(path).not.toContain('mutate');
  });
  it('continues past an inaccessible production root', async () => {
    mocks.fetch.mockResolvedValueOnce(reply({ resourceNames: ['customers/1111111111', 'customers/2222222222'] }))
      .mockResolvedValueOnce(new Response('private error', { status: 403 }))
      .mockResolvedValueOnce(reply({ results: [{ customer: account }] }));
    const result = await listTestAccounts('owner');
    expect(result.skipped).toBe(1); expect(result.accounts[0].loginCustomerId).toBeNull();
  });
  it.each([
    { ...account, testAccount: false }, { ...account, manager: true }
  ])('refuses a production or manager selection', async (customer) => {
    mocks.fetch.mockResolvedValue(reply({ results: [{ customer }] }));
    await expect(verifyTestAccount('owner', account.id, null)).rejects.toMatchObject({ code: 'TEST_ONLY' });
  });
  it('allows CLOSED test clients because test accounts have no active billing', async () => {
    mocks.fetch.mockResolvedValue(reply({ results: [{ customer: { ...account, status: 'CLOSED' } }] }));
    await expect(verifyTestAccount('owner', account.id, null)).resolves.toMatchObject({ customerId: account.id });
  });
  it('refuses IDs from browser input before constructing a URL', async () => {
    await expect(verifyTestAccount('owner', '../other', null)).rejects.toMatchObject({ code: 'INVALID' });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('does not expose provider error text or tokens', async () => {
    mocks.fetch.mockResolvedValue(new Response('private-token-and-secret', { status: 403 }));
    try { await listTestAccounts('owner'); } catch (error) {
      expect(adsErrorMessage(error)).not.toContain('private-token');
      expect(adsErrorMessage(error)).toContain('アクセス権限');
    }
  });
});
