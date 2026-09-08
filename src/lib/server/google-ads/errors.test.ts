// @vitest-environment node
import { expect, it } from 'vitest';
import { providerErrorCode } from './errors';
it('recognizes Cloud API disablement without returning metadata or messages', () => {
  expect(providerErrorCode({ error: { message: 'private', details: [{ reason: 'SERVICE_DISABLED', metadata: { consumer: 'private' } }] } })).toBe('SERVICE_DISABLED');
});
it('recognizes Google Ads error enums', () => {
  expect(providerErrorCode({ error: { details: [{ errors: [{ errorCode: { authorizationError: 'DEVELOPER_TOKEN_NOT_APPROVED' }, message: 'private' }] }] } })).toBe('DEVELOPER_TOKEN_NOT_APPROVED');
});
it('rejects unknown or malformed data', () => {
  for (const body of [null, {}, { error: { details: [null, {}, { reason: 'secret-value' }, { errors: [null] }] } }]) expect(providerErrorCode(body)).toBeUndefined();
});
