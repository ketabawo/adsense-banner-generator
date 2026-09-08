import { randomUUID } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { database } from '../db';
import { decryptToken, encryptToken } from '../token-crypto';

// Internal only: callers must obtain subject from a verified OAuth identity,
// never from an untrusted request parameter. No HTTP endpoint exposes this store.
export async function saveRefreshToken(subject: string, refreshToken: string) {
  const encrypted = encryptToken(refreshToken, env.TOKEN_ENCRYPTION_KEY ?? '', subject);
  await database().query(`
    INSERT INTO google_ads_connections (id, google_subject, refresh_token_encrypted)
    VALUES ($1, $2, $3)
    ON CONFLICT (google_subject) DO UPDATE SET
      refresh_token_encrypted = EXCLUDED.refresh_token_encrypted, updated_at = now()
  `, [randomUUID(), subject, encrypted]);
}

export async function loadRefreshToken(subject: string): Promise<string | undefined> {
  const result = await database().query(
    'SELECT refresh_token_encrypted FROM google_ads_connections WHERE google_subject = $1', [subject]
  );
  if (!result.rowCount) return undefined;
  return decryptToken(result.rows[0].refresh_token_encrypted, env.TOKEN_ENCRYPTION_KEY ?? '', subject);
}

export async function connectionStatus(subject: string) {
  const result = await database().query(
    'SELECT customer_id, login_customer_id FROM google_ads_connections WHERE google_subject = $1', [subject]
  );
  const row = result.rows[0];
  return { authorized: !!row, customerId: row?.customer_id ?? null, loginCustomerId: row?.login_customer_id ?? null };
}

// Only call with an account freshly verified through Google Ads for this subject.
export async function selectAccount(subject: string, customerId: string, loginCustomerId: string | null) {
  const result = await database().query(`UPDATE google_ads_connections SET customer_id = $2, login_customer_id = $3,
    updated_at = now() WHERE google_subject = $1`, [subject, customerId, loginCustomerId]);
  if (!result.rowCount) throw new Error('Ads connection required');
}
