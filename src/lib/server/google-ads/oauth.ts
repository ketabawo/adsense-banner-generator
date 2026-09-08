import { createHash } from 'node:crypto';
import { CodeChallengeMethod } from 'google-auth-library';
import { env } from '$env/dynamic/private';
import { authConfig } from '../auth/config';
import { allowedIdentity, googleOAuthClient } from '../auth/google';
import { loadRefreshToken, saveRefreshToken } from './connections';

export const ADS_SCOPE = 'https://www.googleapis.com/auth/adwords';
export function adsConfigured() { return !!env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim(); }
export function adsAuthorizationUrl(attempt: { state: string; verifier: string; nonce: string }, email: string) {
  return googleOAuthClient().generateAuthUrl({
    scope: ['openid', 'email', ADS_SCOPE], state: attempt.state, nonce: attempt.nonce,
    code_challenge: createHash('sha256').update(attempt.verifier).digest('base64url'),
    code_challenge_method: CodeChallengeMethod.S256,
    prompt: 'consent', access_type: 'offline', login_hint: email
  });
}

export async function connectAds(code: string, attempt: { verifier: string; nonce: string }, subject: string) {
  const oauth = googleOAuthClient();
  const { tokens } = await oauth.getToken({ code, codeVerifier: attempt.verifier });
  if (!tokens.id_token || !tokens.scope?.split(' ').includes(ADS_SCOPE)) throw new Error('Ads permission required');
  const ticket = await oauth.verifyIdToken({ idToken: tokens.id_token, audience: authConfig().clientId });
  const identity = allowedIdentity(ticket.getPayload(), attempt.nonce);
  if (identity.subject !== subject) throw new Error('Google account mismatch');
  if (tokens.refresh_token) await saveRefreshToken(subject, tokens.refresh_token);
  else if (!await loadRefreshToken(subject)) throw new Error('Offline permission required');
}

export async function adsAccessToken(subject: string) {
  const refresh = await loadRefreshToken(subject);
  if (!refresh) throw new Error('Ads connection required');
  const oauth = googleOAuthClient();
  oauth.setCredentials({ refresh_token: refresh });
  const result = await oauth.getAccessToken();
  if (!result.token) throw new Error('Ads authorization expired');
  return result.token;
}
