import { env } from '$env/dynamic/private';

export function allowedEmails() {
  return (env.AUTH_ALLOWED_EMAILS ?? '').split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
}

export function authConfig() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ORIGIN, DATABASE_URL, TOKEN_ENCRYPTION_KEY } = env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !ORIGIN || !DATABASE_URL || !TOKEN_ENCRYPTION_KEY || !allowedEmails().length) {
    throw new Error('Authentication is not configured');
  }
  const origin = new URL(ORIGIN);
  if (origin.origin !== ORIGIN || (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname)))) {
    throw new Error('Invalid authentication origin');
  }
  if (!/^[a-f0-9]{64}$/i.test(TOKEN_ENCRYPTION_KEY)) throw new Error('Invalid encryption key');
  return { clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET, origin: ORIGIN,
    redirectUri: `${ORIGIN}/auth/google/callback`, key: TOKEN_ENCRYPTION_KEY,
    secure: origin.protocol === 'https:' };
}

export function authConfigured() {
  try { authConfig(); return true; } catch { return false; }
}
