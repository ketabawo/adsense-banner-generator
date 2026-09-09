// @vitest-environment node
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it, vi } from 'vitest';
vi.mock('$env/dynamic/private', () => ({ env: { DATABASE_URL: process.env.TEST_DATABASE_URL } }));
import { database } from '../db';
const subject = `submission-test-${randomUUID()}`;
describe.skipIf(!process.env.TEST_DATABASE_URL)('submission reservation in PostgreSQL', () => {
  afterAll(async () => { await database().query('DELETE FROM app_users WHERE google_subject = $1', [subject]); await database().end(); });
  it('allows only one concurrent reservation and keeps different accounts separate', async () => {
    const db = database();
    await db.query('INSERT INTO app_users (google_subject, email) VALUES ($1, $2)', [subject, 'test@example.invalid']);
    const reserve = (customer: string) => db.query(`INSERT INTO google_ads_submissions (id, google_subject, customer_id, fingerprint, state)
      VALUES ($1, $2, $3, $4, 'sending') ON CONFLICT DO NOTHING RETURNING id`, [randomUUID(), subject, customer, 'same-content']);
    const results = await Promise.all([reserve('1111111111'), reserve('1111111111')]);
    expect(results.reduce((sum, r) => sum + (r.rowCount ?? 0), 0)).toBe(1);
    expect((await reserve('2222222222')).rowCount).toBe(1);
    const id = results.flatMap(r => r.rows)[0].id;
    await db.query("UPDATE google_ads_submissions SET state = 'unknown' WHERE id = $1", [id]);
    expect((await reserve('1111111111')).rowCount).toBe(0);
    expect((await db.query('SELECT id FROM google_ads_submissions WHERE google_subject = $1', [`${subject}-other`])).rowCount).toBe(0);
  });
});
