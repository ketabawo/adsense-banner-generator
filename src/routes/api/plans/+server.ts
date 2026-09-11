import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { privateHeaders, requireSameOrigin, requireUser } from '$lib/server/auth/http';
import { adsErrorMessage, AdsError } from '$lib/server/google-ads/api';
import { PlanError, identity, readPlanBody } from '$lib/server/plans/input';
import { currentSettings, fingerprint } from '$lib/server/plans/settings';
import { createPlan, decidePlan, listPlans } from '$lib/server/plans/service';
import { executePlan } from '$lib/server/plans/execute';
import { listActions } from '$lib/server/plans/store';
import { ownedConnection } from '$lib/server/plans/settings';
import { recoverySettings, resolvePlan } from '$lib/server/plans/recovery';
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
    if (event.url.searchParams.get('mode') === 'recovery') return json(await recoverySettings(user.subject, ids.customerId, ids.campaignId, event.url.searchParams.get('id')));
    if (event.url.searchParams.get('mode') === 'actions') {
      await ownedConnection(user.subject, ids.customerId, ids.campaignId);
      return json({ actions: await listActions(user.subject, ids.customerId, ids.campaignId) });
    }
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
  try {
    const body = await readPlanBody(event.request);
    const action = (body as { action?: string } | null)?.action;
    return json({ plan: await (action === 'resolve' ? resolvePlan : action === 'execute' || action === 'reconcile' ? executePlan : decidePlan)(user.subject, body) });
  }
  catch (error) { return failure(error); }
};
