import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { privateHeaders, requireUser } from '$lib/server/auth/http';
import { adsErrorMessage, listTestAccounts } from '$lib/server/google-ads/api';
export const prerender = false;
export const GET: RequestHandler = async (event) => {
  event.setHeaders(privateHeaders);
  const user = await requireUser(event);
  try { return json(await listTestAccounts(user.subject)); }
  catch (error) { return json({ message: adsErrorMessage(error) }, { status: 502 }); }
};
