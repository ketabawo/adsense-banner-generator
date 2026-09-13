import { env } from '$env/dynamic/private';

export class ImageGenerationError extends Error {
  constructor(message: string, public status = 502) { super(message); }
}

export function imageGenerationConfigured() { return !!env.OPENAI_API_KEY?.trim(); }

export async function generateBackground(prompt: string): Promise<string> {
  if (!imageGenerationConfigured()) throw new ImageGenerationError('画像生成は未設定です。サーバーのOPENAI_API_KEYを設定してください。', 503);
  let response: Response;
  try {
    response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(120000),
      headers: { authorization: `Bearer ${env.OPENAI_API_KEY!.trim()}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: env.OPENAI_IMAGE_MODEL?.trim() || 'gpt-image-2.5-flare',
        size: '1024x1024', quality: 'medium', output_format: 'webp',
        prompt: `Create a visual background for an online display advertisement. Do not add any letters, words, logos, buttons, or watermarks; the editor will place text and CTA separately. Keep the main subject away from the center so text can remain legible. User brief: ${prompt}`
      })
    });
  } catch { throw new ImageGenerationError('画像生成への通信が完了しませんでした。時間をおいて再度お試しください。'); }
  if (!response.ok) throw new ImageGenerationError(response.status === 429
    ? '画像生成の利用上限に達しました。時間をおいて再度お試しください。'
    : response.status === 401 ? 'OpenAIのAPIキーを確認してください。'
    : '画像を生成できませんでした。API設定を確認して再度お試しください。');
  try {
    const data = await response.json();
    const base64 = data?.data?.[0]?.b64_json;
    if (typeof base64 !== 'string' || base64.length > 16_000_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw new Error();
    return `data:image/webp;base64,${base64}`;
  } catch { throw new ImageGenerationError('生成画像を読み取れませんでした。もう一度お試しください。'); }
}
