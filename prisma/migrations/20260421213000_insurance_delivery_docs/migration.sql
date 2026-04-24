ALTER TABLE listing_transactions
ADD COLUMN IF NOT EXISTS invoice_uri TEXT;

ALTER TABLE listing_transactions
ADD COLUMN IF NOT EXISTS invoice_sent_at TIMESTAMPTZ;
