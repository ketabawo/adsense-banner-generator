import { json } from '@sveltejs/kit';

export const prerender = false;
export function GET() {
  return json({ status: 'ok' }, { headers: { 'cache-control': 'no-store' } });
}
