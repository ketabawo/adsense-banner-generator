import { json } from '@sveltejs/kit';
import { database } from '$lib/server/db';

export const prerender = false;
export async function GET() {
  try {
    await database().query('SELECT id, google_subject, refresh_token_encrypted, customer_id, login_customer_id FROM google_ads_connections LIMIT 0');
    return json({ status: 'ok' }, { headers: { 'cache-control': 'no-store' } });
  } catch {
    return json({ status: 'unavailable' }, { status: 503, headers: { 'cache-control': 'no-store' } });
  }
}
