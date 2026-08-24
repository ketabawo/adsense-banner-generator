import type { BannerSize } from '$lib/types/banner';

export const BANNER_SIZES: BannerSize[] = [
  { id: '300x250', width: 300, height: 250, label: '300 × 250（レクタングル）' },
  { id: '336x280', width: 336, height: 280, label: '336 × 280（ラージレクタングル）' },
  { id: '728x90', width: 728, height: 90, label: '728 × 90（ビッグバナー）' },
  { id: '970x90', width: 970, height: 90, label: '970 × 90（ラージビッグバナー）' },
  { id: '970x250', width: 970, height: 250, label: '970 × 250（ビルボード）' },
  { id: '300x600', width: 300, height: 600, label: '300 × 600（ハーフページ）' },
  { id: '320x100', width: 320, height: 100, label: '320 × 100（モバイル）' },
  { id: '320x50', width: 320, height: 50, label: '320 × 50（モバイルバナー）' }
];
