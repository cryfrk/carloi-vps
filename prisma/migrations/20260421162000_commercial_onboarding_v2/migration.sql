ALTER TABLE commercial_profiles
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS document_truthfulness_accepted_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS additional_verification_acknowledged_at TIMESTAMPTZ NULL;
