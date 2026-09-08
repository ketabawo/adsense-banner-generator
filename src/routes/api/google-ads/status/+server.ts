import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { privateHeaders, requireUser } from '$lib/server/auth/http';
import { adsConfigured } from '$lib/server/google-ads/oauth';
import { connectionStatus } from '$lib/server/google-ads/connections';
export const prerender = false;
export const GET: RequestHandler = async (event) => {
  event.setHeaders(privateHeaders);
  const user = await requireUser(event);
  try { return json({ configured: adsConfigured(), ...await connectionStatus(user.subject) }); }
  catch { return json({ message: '接続状態を確認できませんでした。' }, { status: 503 }); }
};
