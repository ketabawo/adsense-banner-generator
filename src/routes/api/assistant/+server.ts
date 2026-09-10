import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { privateHeaders, requireSameOrigin, requireUser } from '$lib/server/auth/http';
import { AdsError, adsErrorMessage } from '$lib/server/google-ads/api';
import { PerformanceInputError } from '$lib/server/google-ads/performance';
import { AssistantError, readAssistantBody } from '$lib/server/assistant/input';
import { assistantConfigured } from '$lib/server/assistant/openai';
import { consultCampaign } from '$lib/server/assistant/service';
export const prerender = false;
export const GET: RequestHandler = async (event) => {
  event.setHeaders(privateHeaders);
  await requireUser(event);
  return json({ configured: assistantConfigured() });
};
export const POST: RequestHandler = async (event) => {
  event.setHeaders(privateHeaders);
  const user = await requireUser(event);
  requireSameOrigin(event.request);
  try { return json(await consultCampaign(user.subject, await readAssistantBody(event.request))); }
  catch (error) {
    const message = error instanceof AssistantError || error instanceof PerformanceInputError ? error.message
      : error instanceof AdsError ? adsErrorMessage(error) : '相談を開始できませんでした。時間をおいて再度お試しください。';
    return json({ message }, { status: error instanceof AssistantError ? error.status : error instanceof PerformanceInputError ? 400 : 502 });
  }
};
