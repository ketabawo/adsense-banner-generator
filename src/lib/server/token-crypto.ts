import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

function keyFromHex(hex: string) {
  if (!/^[a-f0-9]{64}$/i.test(hex)) throw new Error('TOKEN_ENCRYPTION_KEY must be 32 bytes encoded as hex');
  return Buffer.from(hex, 'hex');
}

export function encryptToken(token: string, key: string, subject: string) {
  if (!token || !subject) throw new Error('Token and subject are required');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFromHex(key), iv);
  cipher.setAAD(Buffer.from(subject));
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('hex'), cipher.getAuthTag().toString('hex'), ciphertext.toString('hex')].join(':');
}

export function decryptToken(envelope: string, key: string, subject: string) {
  const parts = envelope.split(':');
  const [version, iv, tag, ciphertext] = parts;
  if (parts.length !== 4 || version !== 'v1' || !/^[a-f0-9]{24}$/.test(iv) || !/^[a-f0-9]{32}$/.test(tag) || !/^(?:[a-f0-9]{2})+$/.test(ciphertext)) {
    throw new Error('Invalid encrypted token');
  }
  const decipher = createDecipheriv('aes-256-gcm', keyFromHex(key), Buffer.from(iv, 'hex'));
  decipher.setAAD(Buffer.from(subject));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'hex')), decipher.final()]).toString('utf8');
}
