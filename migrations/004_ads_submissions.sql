CREATE TABLE google_ads_submissions (
  id uuid PRIMARY KEY,
  google_subject text NOT NULL REFERENCES app_users(google_subject) ON DELETE CASCADE,
  customer_id text NOT NULL,
  fingerprint text NOT NULL,
  state text NOT NULL CHECK (state IN ('sending', 'succeeded', 'unknown')),
  resources jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (google_subject, customer_id, fingerprint)
);
