ALTER TABLE users
  ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS commercial_status TEXT NOT NULL DEFAULT 'not_applied',
  ADD COLUMN IF NOT EXISTS commercial_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS commercial_rejected_reason TEXT,
  ADD COLUMN IF NOT EXISTS commercial_reviewed_by_admin_id TEXT,
  ADD COLUMN IF NOT EXISTS yearly_vehicle_sale_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS yearly_vehicle_listing_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commercial_behavior_flag BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS risk_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS risk_level TEXT NOT NULL DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS can_create_paid_listings BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS subscription_plan_id TEXT,
  ADD COLUMN IF NOT EXISTS forgot_password_required_reset_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_ip TEXT,
  ADD COLUMN IF NOT EXISTS last_known_device_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS fraud_flag_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS commercial_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  tax_or_identity_type TEXT NOT NULL,
  tax_or_identity_number TEXT NOT NULL,
  trade_name TEXT,
  mersis_number TEXT,
  authorized_person_name TEXT,
  authorized_person_title TEXT,
  phone TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT NOT NULL,
  address TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commercial_documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  commercial_profile_id TEXT NOT NULL REFERENCES commercial_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  original_file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'uploaded',
  reviewed_by_admin_id TEXT,
  reviewed_at TIMESTAMPTZ,
  reject_reason TEXT,
  verification_method TEXT NOT NULL DEFAULT 'unverified',
  suspicious_flag BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS listing_compliance (
  post_id TEXT PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  seller_relation_type TEXT,
  plate_number TEXT,
  registration_owner_full_name_declared TEXT,
  is_owner_same_as_account_holder BOOLEAN,
  authorization_declaration_text TEXT,
  authorization_status TEXT NOT NULL DEFAULT 'not_required',
  eids_status TEXT NOT NULL DEFAULT 'not_started',
  safe_payment_info_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  safe_payment_info_accepted_at TIMESTAMPTZ,
  listing_compliance_status TEXT NOT NULL DEFAULT 'draft',
  review_required_reason TEXT,
  reviewed_by_admin_id TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sale_processes (
  id TEXT PRIMARY KEY,
  listing_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  buyer_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'interest',
  safe_payment_reference_code TEXT,
  safe_payment_provider_name TEXT,
  safe_payment_status_note TEXT,
  safe_payment_info_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  monthly_price NUMERIC(12, 2) NOT NULL,
  yearly_price NUMERIC(12, 2),
  currency TEXT NOT NULL DEFAULT 'TRY',
  max_listings_per_month INTEGER NOT NULL DEFAULT 0,
  max_featured_listings INTEGER NOT NULL DEFAULT 0,
  is_commercial_only BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'inactive',
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  renewal_at TIMESTAMPTZ,
  payment_provider TEXT,
  payment_status TEXT,
  external_payment_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  paid_listings_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  subscription_required_for_commercial BOOLEAN NOT NULL DEFAULT FALSE,
  individual_listing_fee_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  featured_listing_fee_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO billing_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS payment_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id TEXT REFERENCES posts(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'TRY',
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  external_ref TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_type TEXT NOT NULL,
  actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  action TEXT NOT NULL,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS risk_flags (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  related_listing_id TEXT REFERENCES posts(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by_admin_id TEXT
);

CREATE TABLE IF NOT EXISTS user_consents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_screen TEXT NOT NULL,
  CONSTRAINT user_consents_user_type_version_unique UNIQUE (user_id, consent_type, version)
);

CREATE TABLE IF NOT EXISTS platform_feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  rollout_json JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_roles (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO admin_roles (key, label, description)
VALUES
  ('super_admin', 'Super Admin', 'Tum modullerde tam yetki.'),
  ('compliance_admin', 'Compliance Admin', 'Commercial, document ve listing compliance review islemleri.'),
  ('moderation_admin', 'Moderation Admin', 'Post, listing ve report moderasyon aksiyonlari.'),
  ('support_admin', 'Support Admin', 'Kullanici destek ve hesap yardim akislarina sinirli erisim.'),
  ('billing_admin', 'Billing Admin', 'Abonelik, odeme ve monetization alanlari.'),
  ('analytics_admin', 'Analytics Admin', 'Dashboard, trend ve davranis analizleri.'),
  ('legal_export_admin', 'Legal Export Admin', 'Audit ve delil export akislarina yetkili rol.'),
  ('ops_admin', 'Ops Admin', 'Gunluk operasyon, queue ve rollout izleme rolleri.')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS user_admin_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_key TEXT NOT NULL REFERENCES admin_roles(key) ON DELETE RESTRICT,
  granted_by_admin_id TEXT,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type);
CREATE INDEX IF NOT EXISTS idx_users_commercial_status ON users(commercial_status);
CREATE INDEX IF NOT EXISTS idx_users_risk_level ON users(risk_level);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);

CREATE INDEX IF NOT EXISTS idx_commercial_profiles_status ON commercial_profiles(status);
CREATE INDEX IF NOT EXISTS idx_commercial_profiles_tax_number ON commercial_profiles(tax_or_identity_number);
CREATE INDEX IF NOT EXISTS idx_commercial_documents_user_status ON commercial_documents(user_id, status);
CREATE INDEX IF NOT EXISTS idx_commercial_documents_profile_type ON commercial_documents(commercial_profile_id, type);

CREATE INDEX IF NOT EXISTS idx_listing_compliance_status ON listing_compliance(listing_compliance_status);
CREATE INDEX IF NOT EXISTS idx_listing_compliance_plate_number ON listing_compliance(plate_number);
CREATE INDEX IF NOT EXISTS idx_sale_processes_listing_status ON sale_processes(listing_id, status);
CREATE INDEX IF NOT EXISTS idx_sale_processes_parties ON sale_processes(buyer_user_id, seller_user_id);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_status ON user_subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_status ON user_subscriptions(plan_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_records_user_type_status ON payment_records(user_id, type, status);
CREATE INDEX IF NOT EXISTS idx_payment_records_listing_id ON payment_records(listing_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_type, actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_risk_flags_user_status_severity ON risk_flags(user_id, status, severity);
CREATE INDEX IF NOT EXISTS idx_risk_flags_listing_status ON risk_flags(related_listing_id, status);
CREATE INDEX IF NOT EXISTS idx_risk_flags_type_status_created_at ON risk_flags(type, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_consents_user_accepted_at ON user_consents(user_id, accepted_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_admin_roles_user_revoked_at ON user_admin_roles(user_id, revoked_at);
CREATE INDEX IF NOT EXISTS idx_user_admin_roles_role_revoked_at ON user_admin_roles(role_key, revoked_at);
