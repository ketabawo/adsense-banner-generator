import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { privateHeaders, requireSameOrigin, requireUser } from '$lib/server/auth/http';
import { AssistantError, readAssistantBody } from '$lib/server/assistant/input';
import { assistantConfigured } from '$lib/server/assistant/openai';
import { consultCreative } from '$lib/server/assistant/creative';

export const prerender = false;
export const GET: RequestHandler = async (event) => {
  event.setHeaders(privateHeaders);
  await requireUser(event);
  return json({ configured: assistantConfigured() });
};
export const POST: RequestHandler = async (event) => {
  event.setHeaders(privateHeaders);
  await requireUser(event);
  requireSameOrigin(event.request);
  try { return json(await consultCreative(await readAssistantBody(event.request))); }
  catch (error) {
    return json({ message: error instanceof AssistantError ? error.message : '修正案を取得できませんでした。時間をおいて再度お試しください。' },
      { status: error instanceof AssistantError ? error.status : 502 });
  }
};
