import type { AssistantMessage } from '$lib/types/assistant';
export class AssistantError extends Error {
  constructor(message: string, public readonly status = 400) { super(message); }
}
export type AssistantInput = { customerId: string; campaignId: string; days: number; start: string; end: string; question: string; history: AssistantMessage[] };
export function parseAssistantInput(value: unknown): AssistantInput {
  const fail = () => { throw new AssistantError('相談内容が不正です。実績を更新してから、2000文字以内で入力してください。'); };
  if (!value || typeof value !== 'object') return fail();
  const input = value as Record<string, unknown>;
  if (typeof input.customerId !== 'string' || !/^\d{10}$/.test(input.customerId)
    || typeof input.campaignId !== 'string' || !/^\d{1,20}$/.test(input.campaignId)
    || ![7, 30, 90].includes(input.days as number)
    || typeof input.start !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.start)
    || typeof input.end !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.end)
    || typeof input.question !== 'string' || !input.question.trim() || input.question.length > 2000
    || !Array.isArray(input.history) || input.history.length > 6) return fail();
  const history: AssistantMessage[] = [];
  for (const message of input.history) {
    if (!message || typeof message !== 'object' || !['user', 'assistant'].includes(message.role)
      || typeof message.content !== 'string' || !message.content.trim() || message.content.length > 4000) return fail();
    history.push({ role: message.role, content: message.content });
  }
  if (history.reduce((size, message) => size + message.content.length, 0) > 18000) return fail();
  return { customerId: input.customerId, campaignId: input.campaignId, days: input.days as number,
    start: input.start, end: input.end, question: input.question.trim(), history };
}
// Read a bounded stream instead of trusting Content-Length.
export async function readAssistantBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new AssistantError('相談内容がありません。');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 65536) { await reader.cancel(); throw new Error(); }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch { throw new AssistantError('相談内容が不正、または大きすぎます。'); }
  finally { reader.releaseLock(); }
}
