import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { privateHeaders, requireSameOrigin, requireUser } from '$lib/server/auth/http';
import { adsErrorMessage } from '$lib/server/google-ads/api';
import { SubmissionInputError } from '$lib/server/google-ads/submission-input';
import { submitCampaign } from '$lib/server/google-ads/submissions';
export const prerender = false;
export const POST: RequestHandler = async (event) => {
  event.setHeaders(privateHeaders);
  const user = await requireUser(event);
  requireSameOrigin(event.request);
  // Bound streamed input as well as Content-Length; never fetch a user-supplied image URL.
  let body: unknown;
  try {
    const reader = event.request.body?.getReader();
    if (!reader) throw 0;
    let length = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 1_700_000) { await reader.cancel(); throw 0; }
      chunks.push(value);
    }
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch { return json({ message: '入稿データが不正、または大きすぎます。' }, { status: 400 }); }
  try { return json(await submitCampaign(user.subject, body)); }
  catch (error) {
    return json({ message: error instanceof SubmissionInputError ? error.message : adsErrorMessage(error) }, { status: error instanceof SubmissionInputError ? 400 : 502 });
  }
};
