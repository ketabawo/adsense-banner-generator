import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authConfigured } from '$lib/server/auth/config';
import { sessionUser, SESSION_COOKIE } from '$lib/server/auth/store';
import { privateHeaders } from '$lib/server/auth/http';

export const prerender = false;
export const GET: RequestHandler = async ({ cookies }) => {
  if (!authConfigured()) return json({ configured: false, user: null }, { headers: privateHeaders });
  try {
    const user = await sessionUser(cookies.get(SESSION_COOKIE));
    return json({ configured: true, user: user ? { email: user.email } : null }, { headers: privateHeaders });
  } catch {
    return json({ configured: true, user: null, unavailable: true }, { status: 503, headers: privateHeaders });
  }
};
