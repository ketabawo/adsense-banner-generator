CREATE TABLE google_ads_connections (
  id uuid PRIMARY KEY,
  google_subject text NOT NULL UNIQUE,
  refresh_token_encrypted text NOT NULL,
  customer_id text CHECK (customer_id ~ '^[0-9]{10}$'),
  login_customer_id text CHECK (login_customer_id ~ '^[0-9]{10}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
