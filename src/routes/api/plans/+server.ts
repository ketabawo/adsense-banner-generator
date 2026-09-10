import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { privateHeaders, requireSameOrigin, requireUser } from '$lib/server/auth/http';
import { adsErrorMessage, AdsError } from '$lib/server/google-ads/api';
import { PlanError, identity, readPlanBody } from '$lib/server/plans/input';
import { currentSettings, fingerprint } from '$lib/server/plans/settings';
import { createPlan, decidePlan, listPlans } from '$lib/server/plans/service';
export const prerender = false;
function failure(error: unknown) {
  return json({ message: error instanceof PlanError ? error.message : error instanceof AdsError ? adsErrorMessage(error) : '変更案を処理できませんでした。時間をおいて再度お試しください。' },
    { status: error instanceof PlanError ? error.status : 502 });
}
export const GET: RequestHandler = async (event) => {
  event.setHeaders(privateHeaders);
  const user = await requireUser(event);
  try {
    const ids = identity(event.url.searchParams.get('customerId'), event.url.searchParams.get('campaignId'));
    if (event.url.searchParams.get('mode') === 'settings') {
      const settings = await currentSettings(user.subject, ids.customerId, ids.campaignId);
      return json({ settings, fingerprint: fingerprint(settings) });
    }
    return json({ plans: await listPlans(user.subject, ids.customerId, ids.campaignId) });
  } catch (error) { return failure(error); }
};
export const POST: RequestHandler = async (event) => {
  event.setHeaders(privateHeaders);
  const user = await requireUser(event);
  requireSameOrigin(event.request);
  try { return json({ plan: await createPlan(user.subject, await readPlanBody(event.request)) }); }
  catch (error) { return failure(error); }
};
export const PATCH: RequestHandler = async (event) => {
  event.setHeaders(privateHeaders);
  const user = await requireUser(event);
  requireSameOrigin(event.request);
  try { return json({ plan: await decidePlan(user.subject, await readPlanBody(event.request)) }); }
  catch (error) { return failure(error); }
};
