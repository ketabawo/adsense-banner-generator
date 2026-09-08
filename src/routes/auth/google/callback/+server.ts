import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authConfig } from '$lib/server/auth/config';
import { consumeAttempt, createSession, sessionUser, hashToken, FLOW_COOKIE, SESSION_COOKIE, SESSION_SECONDS } from '$lib/server/auth/store';
import { connectAds } from '$lib/server/google-ads/oauth';
import { exchangeIdentity } from '$lib/server/auth/google';
import { privateHeaders } from '$lib/server/auth/http';

export const prerender = false;
export const GET: RequestHandler = async ({ url, cookies, setHeaders }) => {
  setHeaders(privateHeaders);
  const browser = cookies.get(FLOW_COOKIE);
  cookies.delete(FLOW_COOKIE, { path: '/auth/google' });
  let outcome = 'failed';
  try {
    const attempt = await consumeAttempt(url.searchParams.get('state'), browser);
    if (attempt) {
      const code = url.searchParams.get('code');
      if (url.searchParams.has('error')) outcome = 'cancelled';
      else if (code && attempt.purpose === 'ads') {
        const session = cookies.get(SESSION_COOKIE);
        const user = await sessionUser(session);
        if (!session || !user || user.subject !== attempt.subject || hashToken(session) !== attempt.sessionHash) {
          throw new Error('Ads session mismatch');
        }
        await connectAds(code, attempt, user.subject);
        outcome = 'ads-success';
      } else if (code) {
        const user = await exchangeIdentity(code, attempt);
        const token = await createSession(user, cookies.get(SESSION_COOKIE));
        cookies.set(SESSION_COOKIE, token, { path: '/', httpOnly: true, secure: authConfig().secure, sameSite: 'lax', maxAge: SESSION_SECONDS });
        outcome = 'success';
      }
    }
  } catch {
    // OAuth/DB exceptions may contain codes, tokens or credentials. Never log them.
    outcome = 'failed';
  }
  redirect(303, `/auth/result?result=${outcome}`);
};
