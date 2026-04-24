ALTER TABLE "billing_settings"
  ADD COLUMN IF NOT EXISTS "individual_listing_fee_amount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "featured_listing_fee_amount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'TRY';

ALTER TABLE "payment_orders"
  ADD COLUMN IF NOT EXISTS "order_type" TEXT NOT NULL DEFAULT 'insurance',
  ADD COLUMN IF NOT EXISTS "payment_record_id" TEXT,
  ADD COLUMN IF NOT EXISTS "callback_url" TEXT,
  ADD COLUMN IF NOT EXISTS "user_id" TEXT,
  ADD COLUMN IF NOT EXISTS "listing_id" TEXT,
  ADD COLUMN IF NOT EXISTS "plan_code" TEXT;
