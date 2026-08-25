import { BANNER_SIZES } from './sizes';
import type { CreativeState } from '$lib/types/creative';

export function createDefaultCreativeState(): CreativeState {
  return {
    size: BANNER_SIZES[0],
    background: { type: 'color', color: '#2563eb', overlayOpacity: 0.38 },
    headline: {
      text: 'あなたのサービスを\nもっと多くの人へ',
      fontSize: 28,
      bold: true,
      color: '#ffffff',
      align: 'left'
    },
    subText: {
      enabled: true,
      text: '効果的な広告バナーを簡単作成',
      fontSize: 13,
      color: '#dbeafe'
    },
    cta: {
      enabled: true,
      text: '詳しく見る',
      backgroundColor: '#ffffff',
      color: '#1d4ed8',
      borderRadius: 8
    },
    templateId: 'simple'
  };
}
