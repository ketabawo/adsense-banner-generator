// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { encryptToken, decryptToken } from './token-crypto';

const key = 'ab'.repeat(32);
describe('token encryption', () => {
  it('round trips without storing plaintext and randomizes ciphertext', () => {
    const encrypted = encryptToken('secret-refresh-token', key, 'owner');
    expect(encrypted).not.toContain('secret-refresh-token');
    expect(decryptToken(encrypted, key, 'owner')).toBe('secret-refresh-token');
    expect(encryptToken('secret-refresh-token', key, 'owner')).not.toBe(encrypted);
  });
  it('rejects wrong keys, another identity and tampering', () => {
    const encrypted = encryptToken('secret', key, 'owner');
    expect(() => decryptToken(encrypted, 'cd'.repeat(32), 'owner')).toThrow();
    expect(() => decryptToken(encrypted, key, 'other-owner')).toThrow();
    const parts = encrypted.split(':');
    parts[3] = (parts[3].startsWith('00') ? 'ff' : '00') + parts[3].slice(2);
    expect(() => decryptToken(parts.join(':'), key, 'owner')).toThrow();
  });
  it('rejects missing keys and malformed ciphertext', () => {
    expect(() => encryptToken('secret', '', 'owner')).toThrow();
    expect(() => decryptToken('v1:bad', key, 'owner')).toThrow();
  });
});
