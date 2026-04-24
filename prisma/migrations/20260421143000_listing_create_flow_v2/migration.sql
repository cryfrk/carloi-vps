ALTER TABLE listing_compliance
  ADD COLUMN IF NOT EXISTS authorization_declaration_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS risk_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS risk_level TEXT NOT NULL DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS billing_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS billing_status TEXT NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS payment_record_id TEXT,
  ADD COLUMN IF NOT EXISTS duplicate_plate_flag BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS abnormal_price_flag BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS spam_content_flag BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_listing_compliance_risk_billing
  ON listing_compliance (risk_level, billing_status);
