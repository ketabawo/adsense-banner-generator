import { describe, expect, it } from 'vitest';
import { MAX_IMAGE_FILE_BYTES, validateImageFile } from './imageUpload';

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
});
