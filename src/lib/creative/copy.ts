import type { CreativeState } from '$lib/types/creative';

export type CreativeCopy = { headline: string; subText: string; cta: string };
export type CopyContext = {
  size: { width: number; height: number };
  copy: CreativeCopy;
  enabled: { subText: boolean; cta: boolean };
};
export type CopyProposal = { reason: string; copy: CreativeCopy };
export const copyFields = [
  { key: 'headline', label: 'メインコピー' },
  { key: 'subText', label: 'サブコピー' },
  { key: 'cta', label: 'CTA' }
] as const;

// Only this explicit projection may be sent to the copy assistant. Never include images.
export function copyContext(state: CreativeState): CopyContext {
  return {
    size: { width: state.size.width, height: state.size.height },
    copy: { headline: state.headline.text, subText: state.subText.text, cta: state.cta.text },
    enabled: { subText: state.subText.enabled, cta: state.cta.enabled }
  };
}

export function parseCopy(value: unknown): CreativeCopy {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('コピーの形式が不正です。');
  const data = value as Record<string, unknown>;
  if (Object.keys(data).length !== 3 || copyFields.some(({ key }) => typeof data[key] !== 'string' || (data[key] as string).length > 2000)) {
    throw new Error('コピーは各2000文字以内で入力してください。');
  }
  return { headline: data.headline as string, subText: data.subText as string, cta: data.cta as string };
}

export function parseCopyProposal(value: unknown): CopyProposal {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('修正案を読み取れませんでした。');
  const data = value as Record<string, unknown>;
  if (Object.keys(data).length !== 2 || typeof data.reason !== 'string' || !data.reason.trim() || data.reason.length > 1000) {
    throw new Error('修正案を読み取れませんでした。');
  }
  return { reason: data.reason, copy: parseCopy(data.copy) };
}

export function applyCopyProposal(state: CreativeState, before: CopyContext, proposal: CopyProposal): boolean {
  if (JSON.stringify(copyContext(state)) !== JSON.stringify(before)) return false;
  const { copy } = parseCopyProposal(proposal);
  state.headline.text = copy.headline;
  if (state.subText.enabled) state.subText.text = copy.subText;
  if (state.cta.enabled) state.cta.text = copy.cta;
  return true;
}
