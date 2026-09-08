CREATE TABLE app_users (
  google_subject text PRIMARY KEY,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE auth_sessions (
  token_hash text PRIMARY KEY,
  google_subject text NOT NULL REFERENCES app_users(google_subject) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX auth_sessions_expiry ON auth_sessions(expires_at);
CREATE TABLE oauth_attempts (
  state_hash text PRIMARY KEY,
  browser_hash text NOT NULL,
  verifier_encrypted text NOT NULL,
  nonce text NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX oauth_attempts_expiry ON oauth_attempts(expires_at);
