CREATE TABLE execution_plans (
  id uuid PRIMARY KEY,
  google_subject text NOT NULL REFERENCES app_users(google_subject) ON DELETE CASCADE,
  customer_id text NOT NULL,
  campaign_id text NOT NULL,
  request_id uuid NOT NULL,
  request_hash text NOT NULL,
  state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'approved', 'cancelled', 'stale')),
  before_settings jsonb NOT NULL,
  changes jsonb NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  UNIQUE (google_subject, request_id),
  CHECK ((state = 'draft' AND decided_at IS NULL) OR (state <> 'draft' AND decided_at IS NOT NULL))
);
CREATE INDEX execution_plans_owner_campaign ON execution_plans (google_subject, customer_id, campaign_id, created_at DESC);
