import type { CreativeSize } from '$lib/types/creative';

/** Composition presets. They are independent of the fixed Image Ad submission sizes. */
export const VARIANT_SIZES: CreativeSize[] = [
  { id: '1200x628', width: 1200, height: 628, label: 'Landscape 1200 × 628' },
  { id: '1200x1200', width: 1200, height: 1200, label: 'Square 1200 × 1200' },
  { id: '960x1200', width: 960, height: 1200, label: 'Portrait 960 × 1200' },
  { id: '900x1600', width: 900, height: 1600, label: 'Vertical 900 × 1600' }
];
