import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { privateHeaders, requireSameOrigin, requireUser } from '$lib/server/auth/http';
import { generateBackground, ImageGenerationError, imageGenerationConfigured } from '$lib/server/image-generation/openai';

export const prerender = false;
export const GET: RequestHandler = async (event) => {
  event.setHeaders(privateHeaders);
  await requireUser(event);
  return json({ configured: imageGenerationConfigured() });
};
export const POST: RequestHandler = async (event) => {
  event.setHeaders(privateHeaders);
  await requireUser(event);
  requireSameOrigin(event.request);
  let raw: string;
  try {
    const reader = event.request.body?.getReader();
    if (!reader) throw new Error();
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 8192) { await reader.cancel(); throw new Error(); }
      chunks.push(value);
    }
    raw = Buffer.concat(chunks).toString('utf8');
  } catch { return json({ message: '入力が長すぎます。' }, { status: 413 }); }
  let prompt: unknown;
  try { prompt = JSON.parse(raw).prompt; } catch { return json({ message: '入力を読み取れませんでした。' }, { status: 400 }); }
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 2000) return json({ message: '画像の説明を2000文字以内で入力してください。' }, { status: 400 });
  try { return json({ image: await generateBackground(prompt.trim()) }); }
  catch (error) { return json({ message: error instanceof ImageGenerationError ? error.message : '画像を生成できませんでした。' }, { status: error instanceof ImageGenerationError ? error.status : 502 }); }
};
