const known = new Set([
  'REQUIRED', 'LAYOUT_PROBLEM', 'IMAGE_TOO_LARGE', 'INVALID_IMAGE', 'UNEXPECTED_SIZE',
  'SERVICE_DISABLED', 'ACCESS_TOKEN_SCOPE_INSUFFICIENT', 'DEVELOPER_TOKEN_INVALID',
  'DEVELOPER_TOKEN_NOT_APPROVED', 'DEVELOPER_TOKEN_PROHIBITED', 'PROJECT_DISABLED',
  'USER_PERMISSION_DENIED', 'CUSTOMER_NOT_ENABLED', 'GOOGLE_ACCOUNT_USER_AND_ADS_USER_MISMATCH'
]);

// Only known enum values leave this boundary, never messages or metadata.
export function providerErrorCode(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const error = (body as Record<string, unknown>).error;
  if (!error || typeof error !== 'object') return undefined;
  const details = (error as Record<string, unknown>).details;
  if (!Array.isArray(details)) return undefined;
  for (const detail of details) {
    if (!detail || typeof detail !== 'object') continue;
    if (known.has(detail.reason)) return detail.reason;
    if (!Array.isArray(detail.errors)) continue;
    for (const item of detail.errors) {
      if (!item?.errorCode || typeof item.errorCode !== 'object') continue;
      for (const code of Object.values(item.errorCode)) {
        if (typeof code === 'string' && known.has(code)) return code;
      }
    }
  }
  return undefined;
}
