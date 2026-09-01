import { describe, expect, it } from 'vitest';
import { isSupportedBannerSize, MAX_IMAGE_FILE_BYTES, validateImageFile } from './imageUpload';

describe('背景画像アップロード', () => {
  it.each(['image/png', 'image/jpeg', 'image/webp'])('%sを許可する', (type) => {
    expect(validateImageFile({ type, size: 1024 })).toBe('');
  });

  it('未対応形式を拒否する', () => {
    expect(validateImageFile({ type: 'image/gif', size: 1024 })).toBe('PNG・JPEG・WebP形式の画像を選択してください。');
  });

  it('8MBを超える画像を拒否する', () => {
    expect(validateImageFile({ type: 'image/jpeg', size: MAX_IMAGE_FILE_BYTES + 1 })).toBe('画像は8MB以下のファイルを選択してください。');
  });

  it('8MBちょうどの画像を許可する', () => {
    expect(validateImageFile({ type: 'image/jpeg', size: MAX_IMAGE_FILE_BYTES })).toBe('');
  });

  it.each([[300, 250], [336, 280], [728, 90], [970, 250], [300, 600], [320, 50]])('%d×%dを主要バナーサイズとして許可する', (width, height) => {
    expect(isSupportedBannerSize(width, height)).toBe(true);
  });

  it('未対応サイズを拒否する', () => {
    expect(isSupportedBannerSize(400, 400)).toBe(false);
  });
});
