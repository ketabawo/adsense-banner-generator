import type { CreativeSize, CreativeState, CreativeVariant } from '$lib/types/creative';

export function collectVariants(variants: CreativeVariant[], activeId: string, activeState: CreativeState): CreativeVariant[] {
  const active = { id: activeId, state: structuredClone(activeState) };
  return variants.some(variant => variant.id === activeId)
    ? variants.map(variant => variant.id === activeId ? active : structuredClone(variant))
    : [...structuredClone(variants), active];
}

export function createVariant(state: CreativeState, size: CreativeSize, id: string): CreativeVariant {
  const next = structuredClone(state);
  next.size = structuredClone(size);
  next.background.type = 'color';
  next.background.image = undefined;
  return { id, state: next };
}
