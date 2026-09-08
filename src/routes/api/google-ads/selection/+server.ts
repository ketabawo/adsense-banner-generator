import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { privateHeaders, requireSameOrigin, requireUser } from '$lib/server/auth/http';
import { AdsError, adsErrorMessage, customerId, verifyTestAccount } from '$lib/server/google-ads/api';
import { selectAccount } from '$lib/server/google-ads/connections';
export const prerender = false;
export const POST: RequestHandler = async (event) => {
  event.setHeaders(privateHeaders);
  const user = await requireUser(event);
  requireSameOrigin(event.request);
  let id: string, login: string | null;
  try {
    const body = await event.request.json();
    id = customerId(body.customerId);
    login = body.loginCustomerId === null ? null : customerId(body.loginCustomerId);
  } catch { return json({ message: adsErrorMessage(new AdsError('INVALID')) }, { status: 400 }); }
  try {
    const account = await verifyTestAccount(user.subject, id, login);
    await selectAccount(user.subject, account.customerId, account.loginCustomerId);
    return json({ account });
  } catch (error) { return json({ message: adsErrorMessage(error) }, { status: 502 }); }
};
