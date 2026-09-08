import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteSession, SESSION_COOKIE } from '$lib/server/auth/store';
import { privateHeaders, requireSameOrigin } from '$lib/server/auth/http';

export const prerender = false;
export const POST: RequestHandler = async ({ request, cookies }) => {
  requireSameOrigin(request);
  try { await deleteSession(cookies.get(SESSION_COOKIE)); }
  catch { error(503, 'ログアウトできませんでした。もう一度お試しください。'); }
  cookies.delete(SESSION_COOKIE, { path: '/' });
  return new Response(null, { status: 204, headers: privateHeaders });
};
