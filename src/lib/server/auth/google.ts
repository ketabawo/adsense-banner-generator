import { OAuth2Client, CodeChallengeMethod, type TokenPayload } from 'google-auth-library';
import { createHash } from 'node:crypto';
import { allowedEmails, authConfig } from './config';

export function googleOAuthClient() {
  const config = authConfig();
  return new OAuth2Client({ clientId: config.clientId, clientSecret: config.clientSecret, redirectUri: config.redirectUri });
}
export function authorizationUrl(attempt: { state: string; verifier: string; nonce: string }) {
  return googleOAuthClient().generateAuthUrl({
    scope: ['openid', 'email'], state: attempt.state, nonce: attempt.nonce,
    code_challenge: createHash('sha256').update(attempt.verifier).digest('base64url'),
    code_challenge_method: CodeChallengeMethod.S256,
    prompt: 'select_account', access_type: 'online'
  });
}

// Only call after Google's library has verified signature, issuer, audience and expiry.
export function allowedIdentity(payload: (TokenPayload & { nonce?: string }) | undefined, nonce: string) {
  if (!payload?.sub || !payload.email || payload.email_verified !== true || payload.nonce !== nonce || !allowedEmails().includes(payload.email.toLowerCase())) {
    throw new Error('Identity is not allowed');
  }
  return { subject: payload.sub, email: payload.email.toLowerCase() };
}

export async function exchangeIdentity(code: string, attempt: { verifier: string; nonce: string }) {
  const oauth = googleOAuthClient();
  const { tokens } = await oauth.getToken({ code, codeVerifier: attempt.verifier });
  if (!tokens.id_token) throw new Error('Missing ID token');
  const ticket = await oauth.verifyIdToken({ idToken: tokens.id_token, audience: authConfig().clientId });
  return allowedIdentity(ticket.getPayload(), attempt.nonce);
}
