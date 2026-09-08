import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authConfig } from '$lib/server/auth/config';
import { privateHeaders, requireSameOrigin, requireUser } from '$lib/server/auth/http';
import { beginAttempt, FLOW_COOKIE, SESSION_COOKIE } from '$lib/server/auth/store';
import { adsAuthorizationUrl, adsConfigured } from '$lib/server/google-ads/oauth';

export const prerender = false;
export const POST: RequestHandler = async (event) => {
  event.setHeaders(privateHeaders);
  const user = await requireUser(event);
  requireSameOrigin(event.request);
  if (!adsConfigured()) error(503, 'Developer Tokenを設定してください。');
  let destination: string;
  try {
    const attempt = await beginAttempt({ subject: user.subject, session: event.cookies.get(SESSION_COOKIE)! });
    destination = adsAuthorizationUrl(attempt, user.email);
    event.cookies.set(FLOW_COOKIE, attempt.browser, { path: '/auth/google', httpOnly: true, secure: authConfig().secure, sameSite: 'lax', maxAge: 600 });
  } catch { error(503, 'Google Adsへの接続を開始できませんでした。'); }
  redirect(303, destination);
};
