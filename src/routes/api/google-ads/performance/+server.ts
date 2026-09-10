import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { privateHeaders, requireUser } from '$lib/server/auth/http';
import { adsErrorMessage } from '$lib/server/google-ads/api';
import { performanceReport, PerformanceInputError, reportDays } from '$lib/server/google-ads/performance';
export const prerender = false;
export const GET: RequestHandler = async (event) => {
  event.setHeaders(privateHeaders);
  const user = await requireUser(event);
  try { return json(await performanceReport(user.subject, reportDays(event.url.searchParams.get('days')))); }
  catch (error) { return json({ message: error instanceof PerformanceInputError ? error.message : adsErrorMessage(error) }, { status: error instanceof PerformanceInputError ? 400 : 502 }); }
};
