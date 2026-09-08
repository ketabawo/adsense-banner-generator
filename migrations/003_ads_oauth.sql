ALTER TABLE oauth_attempts
  ADD COLUMN purpose text NOT NULL DEFAULT 'login' CHECK (purpose IN ('login', 'ads')),
  ADD COLUMN google_subject text REFERENCES app_users(google_subject) ON DELETE CASCADE,
  ADD COLUMN session_hash text;
ALTER TABLE oauth_attempts ADD CONSTRAINT ads_attempt_identity CHECK (
  purpose = 'login' OR (google_subject IS NOT NULL AND session_hash IS NOT NULL)
);
