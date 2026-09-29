CREATE TABLE sessions (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  spins_used smallint NOT NULL DEFAULT 0 CHECK (spins_used >= 0 AND spins_used <= 4),
  won_spin_id uuid,
  ip_hash text,
  utm jsonb
);

CREATE TABLE spins (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES sessions(id),
  spin_no smallint NOT NULL CHECK (spin_no >= 1 AND spin_no <= 4),
  reels text[] NOT NULL CHECK (array_length(reels, 1) = 3),
  rule_id text,
  discount smallint CHECK (discount IS NULL OR discount IN (10, 15, 20)),
  win_ref text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, spin_no)
);

ALTER TABLE sessions ADD CONSTRAINT sessions_won_spin_id_fkey
  FOREIGN KEY (won_spin_id) REFERENCES spins(id) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE leads (
  id uuid PRIMARY KEY,
  spin_id uuid NOT NULL UNIQUE REFERENCES spins(id),
  win_ref text NOT NULL,
  discount smallint NOT NULL CHECK (discount IN (10, 15, 20)),
  first_name text NOT NULL CHECK (char_length(first_name) BETWEEN 1 AND 80),
  last_name text NOT NULL CHECK (char_length(last_name) BETWEEN 1 AND 80),
  phone text NOT NULL,
  email text NOT NULL,
  postcode text NOT NULL,
  marketing_consent boolean NOT NULL DEFAULT false,
  consent_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  crm_status text NOT NULL DEFAULT 'pending' CHECK (crm_status IN ('pending', 'synced', 'failed')),
  crm_attempts smallint NOT NULL DEFAULT 0 CHECK (crm_attempts >= 0),
  crm_next_try_at timestamptz NOT NULL DEFAULT now(),
  crm_lead_id text,
  crm_last_error text,
  claimed_via text NOT NULL CHECK (claimed_via IN ('form', 'phone'))
);

CREATE INDEX leads_crm_retry_idx ON leads (crm_status, crm_next_try_at);
