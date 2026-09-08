// @vitest-environment node
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({ env: {
  DATABASE_URL: process.env.TEST_DATABASE_URL,
  TOKEN_ENCRYPTION_KEY: 'ab'.repeat(32)
} }));

import { database } from '../db';
import { connectionStatus, selectAccount, loadRefreshToken, saveRefreshToken } from './connections';

const subject = `integration-${randomUUID()}`;
describe.skipIf(!process.env.TEST_DATABASE_URL)('PostgreSQL connection store', () => {
  afterAll(async () => {
    await database().query('DELETE FROM google_ads_connections WHERE google_subject = $1', [subject]);
    await database().end();
  });

  it('stores ciphertext, isolates identities and updates without duplicates', async () => {
    expect(await loadRefreshToken(subject)).toBeUndefined();
    await saveRefreshToken(subject, 'first-test-token');
    expect(await loadRefreshToken(subject)).toBe('first-test-token');
    expect(await loadRefreshToken(`${subject}-other`)).toBeUndefined();
    await saveRefreshToken(subject, 'second-test-token');
    const result = await database().query('SELECT refresh_token_encrypted FROM google_ads_connections WHERE google_subject = $1', [subject]);
    expect(result.rowCount).toBe(1);
    expect(result.rows[0].refresh_token_encrypted).not.toContain('second-test-token');
    expect(await loadRefreshToken(subject)).toBe('second-test-token');
    await selectAccount(subject, '1234567890', '0987654321');
    expect(await connectionStatus(subject)).toEqual({ authorized: true, customerId: '1234567890', loginCustomerId: '0987654321' });
    expect(await connectionStatus(`${subject}-other`)).toEqual({ authorized: false, customerId: null, loginCustomerId: null });
  });
});
