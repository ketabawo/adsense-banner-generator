import { error, type RequestEvent } from '@sveltejs/kit';
import { authConfig } from './config';
import { SESSION_COOKIE, sessionUser } from './store';

export function requireSameOrigin(request: Request) {
  if (request.headers.get('origin') !== authConfig().origin) error(403, '別のサイトからの操作は受け付けられません。');
}

export async function requireUser(event: Pick<RequestEvent, 'cookies'>) {
  const user = await sessionUser(event.cookies.get(SESSION_COOKIE));
  if (!user) error(401, 'ログインしてください。');
  return user;
}

export const privateHeaders = { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' };
