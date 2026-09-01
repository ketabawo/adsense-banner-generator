import { BANNER_SIZES } from './sizes';

export const MAX_IMAGE_FILE_BYTES = 8 * 1024 * 1024;
export const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

export function isSupportedBannerSize(width: number, height: number) {
  return BANNER_SIZES.some((size) => width === size.width && height === size.height);
}

export function validateImageFile(file: Pick<File, 'type' | 'size'>): string {
  if (!SUPPORTED_IMAGE_TYPES.includes(file.type as (typeof SUPPORTED_IMAGE_TYPES)[number])) {
    return 'PNG・JPEG・WebP形式の画像を選択してください。';
  }
  if (file.size > MAX_IMAGE_FILE_BYTES) {
    return '画像は8MB以下のファイルを選択してください。';
  }
  return '';
}
