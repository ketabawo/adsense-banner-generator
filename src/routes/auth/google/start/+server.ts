import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authConfig, authConfigured } from '$lib/server/auth/config';
import { beginAttempt, FLOW_COOKIE } from '$lib/server/auth/store';
import { authorizationUrl } from '$lib/server/auth/google';
import { privateHeaders, requireSameOrigin } from '$lib/server/auth/http';

export const prerender = false;
export const POST: RequestHandler = async ({ request, cookies, setHeaders }) => {
  setHeaders(privateHeaders);
  if (!authConfigured()) error(503, 'Googleログインの設定がまだ完了していません。');
  requireSameOrigin(request);
  let destination: string;
  try {
    const attempt = await beginAttempt();
    destination = authorizationUrl(attempt);
    cookies.set(FLOW_COOKIE, attempt.browser, { path: '/auth/google', httpOnly: true, secure: authConfig().secure, sameSite: 'lax', maxAge: 600 });
  } catch { error(503, 'ログインを開始できませんでした。時間をおいてお試しください。'); }
  redirect(303, destination);
};
