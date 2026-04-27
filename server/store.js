const { randomBytes, randomUUID, scryptSync, timingSafeEqual } = require('node:crypto');
const { createHash } = require('node:crypto');
const { config } = require('./config');
const { db, initializeDatabase, isPostgresMode, toDbBoolean } = require('./database');
const { getMailServiceState } = require('./mailer');
const { getSmsServiceState, sendBrevoSms } = require('./sms');
const { verifyAppStoreSubscriptionPurchase } = require('./appleStore');
const { defaultAiMessages, defaultProfileSegment, defaultSettings } = require('./defaults');
const { verifyGooglePlaySubscriptionPurchase } = require('./googlePlay');
const {
  CONSENT_REQUIREMENTS,
  assertRequiredConsentTypes,
  assertSafePaymentConsent,
  assertSubscriptionTermsConsent,
  recordUserConsents,
} = require('./modules/consent/consent.service');
const { listAdminRoleKeysForUser } = require('./modules/admin/admin.service');
const { getEffectivePermissions } = require('./modules/admin/access.service');
const { saveListingCompliance } = require('./modules/compliance/compliance.service');
const { getListingCompliance } = require('./modules/compliance/compliance.repository');
const {
  getCommercialStatusSummary,
  saveCommercialProfile,
} = require('./modules/commercial/commercial.service');
const { updateUserCommercialState } = require('./modules/commercial/commercial.repository');
const { ensureListingPayment } = require('./modules/billing/subscription.service');
const {
  createPaymentRecord,
  findLatestListingPaymentRecord,
  getPaymentRecordByExternalRef,
  updatePaymentRecordById,
} = require('./modules/billing/billing.repository');
const {
  LEGACY_PAYMENT_STATUS_CANCELLED,
  LEGACY_PAYMENT_STATUS_PAID,
  LEGACY_PAYMENT_STATUS_REDIRECT_READY,
  PAYMENT_STATUS_FAILED,
  PAYMENT_STATUS_INITIATED,
  PAYMENT_STATUS_PENDING,
  PAYMENT_STATUS_SUCCESS,
  isPaymentPendingLike,
  isPaymentSuccessLike,
  isRetryablePaymentStatus,
  normalizePaymentStatus,
} = require('./modules/billing/payment-status');
const { isFeatureEnabled } = require('./modules/feature-flags/config');
const { appendAuditLog } = require('./modules/audit-risk/audit.repository');
const {
  evaluateCommercialBehaviorSignal,
  maybeCreateCommercialBehaviorFlag,
} = require('./modules/audit-risk/risk.service');
const {
  evaluateListingCreateFlow,
  persistListingCreateFlowArtifacts,
} = require('./modules/listings/service');
const {
  sendPasswordResetMail,
  sendPasswordResetTokenMail,
  sendTemplatedMail,
  sendVerificationCode,
  sendVerificationTokenMail,
} = require('./notifications');
const {
  decryptJson,
  decryptText,
  encryptJson,
  encryptText,
  hashSessionToken,
  isEncryptedText,
  isHashedSessionToken,
  makeLookupHash,
  normalizeIdentifier,
} = require('./security');
const { repairBrokenTurkishText } = require('./text');
const {
  hashVerificationCode,
  makeVerificationCode,
  nowIso,
  verifyCodeHash,
} = require('./verification');
const { logError, logInfo, logWarn } = require('./logger');

const VERIFICATION_CODE_PATTERN = /^\d{6}$/;
const VERIFICATION_LOG_PREFIX = '[verification]';
const AUTH_TOKEN_LOG_PREFIX = '[auth-token]';
const VERIFICATION_MAIL_FAILURE_MESSAGE =
  'Dogrulama e-postasi su anda gonderilemedi. Lutfen daha sonra tekrar deneyin.';
const REGISTER_VERIFICATION_PENDING_MESSAGE =
  'Hesap olusturuldu ancak dogrulama e-postasi su anda gonderilemedi. Lutfen dogrulama ekranindan tekrar deneyin.';
const EMAIL_VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60_000;
const PASSWORD_RESET_TOKEN_TTL_MS = 30 * 60 * 60_000;

function isSafePdfDeliveryUrl(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return false;
  }

  try {
    const parsed = new URL(normalized);
    const allowedProtocols = config.nodeEnv === 'production' ? ['https:'] : ['https:', 'http:'];
    if (!allowedProtocols.includes(parsed.protocol)) {
      return false;
    }

    return parsed.pathname.toLowerCase().endsWith('.pdf');
  } catch {
    return false;
  }
}

const sqliteSchemaSql = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    handle TEXT NOT NULL UNIQUE,
    bio TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    google_sub TEXT,
    apple_sub TEXT,
    verified INTEGER NOT NULL DEFAULT 0,
    avatar_uri TEXT,
    cover_uri TEXT,
    membership_plan TEXT NOT NULL DEFAULT 'Standart Uyelik',
    settings_json TEXT NOT NULL,
    vehicle_json TEXT,
    profile_segment TEXT NOT NULL DEFAULT 'paylasimlar',
    account_type TEXT NOT NULL DEFAULT 'individual',
    commercial_status TEXT NOT NULL DEFAULT 'not_applied',
    commercial_approved_at TEXT,
    commercial_rejected_reason TEXT,
    commercial_reviewed_by_admin_id TEXT,
    yearly_vehicle_sale_count INTEGER NOT NULL DEFAULT 0,
    yearly_vehicle_listing_count INTEGER NOT NULL DEFAULT 0,
    commercial_behavior_flag INTEGER NOT NULL DEFAULT 0,
    risk_score INTEGER NOT NULL DEFAULT 0,
    risk_level TEXT NOT NULL DEFAULT 'low',
    can_create_paid_listings INTEGER NOT NULL DEFAULT 0,
    subscription_status TEXT NOT NULL DEFAULT 'inactive',
    subscription_plan_id TEXT,
    forgot_password_required_reset_at TEXT,
    last_login_ip TEXT,
    last_known_device_fingerprint TEXT,
    fraud_flag_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS follows (
    follower_user_id TEXT NOT NULL,
    followed_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (follower_user_id, followed_user_id),
    FOREIGN KEY (follower_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (followed_user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    author_user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    hashtags_json TEXT NOT NULL,
    media_json TEXT NOT NULL,
    listing_json TEXT,
    repost_source_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (repost_source_id) REFERENCES posts(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS post_reactions (
    user_id TEXT NOT NULL,
    post_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, post_id, kind),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    author_user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    handle TEXT NOT NULL,
    context_post_id TEXT,
    buyer_user_id TEXT,
    seller_user_id TEXT,
    buyer_agreed_at TEXT,
    seller_agreed_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS conversation_participants (
    conversation_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    PRIMARY KEY (conversation_id, user_id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    sender_user_id TEXT NOT NULL,
    text TEXT NOT NULL,
    attachments_json TEXT NOT NULL DEFAULT '[]',
    edited_at TEXT,
    deleted_for_everyone_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS message_hidden_for_users (
    message_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (message_id, user_id),
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS ai_messages (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'fallback',
    related_post_ids_json TEXT NOT NULL DEFAULT '[]',
    edited_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS listing_events (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    user_id TEXT,
    kind TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS listing_transactions (
    conversation_id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    buyer_user_id TEXT NOT NULL,
    seller_user_id TEXT NOT NULL,
    registration_json TEXT,
    registration_shared_at TEXT,
    insurance_quote_amount TEXT,
    payment_status TEXT NOT NULL DEFAULT 'missing',
    payment_reference TEXT,
    payment_requested_at TEXT,
    payment_paid_at TEXT,
    policy_uri TEXT,
    invoice_uri TEXT,
    policy_sent_at TEXT,
    invoice_sent_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (buyer_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS verification_codes (
    id TEXT PRIMARY KEY,
    channel TEXT NOT NULL,
    purpose TEXT NOT NULL,
    destination TEXT NOT NULL,
    destination_lookup TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    expires_at TEXT NOT NULL,
    consumed_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sms_verification_codes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    phone TEXT NOT NULL,
    phone_lookup TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    used_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS auth_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    consumed_at TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_consents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    consent_type TEXT NOT NULL,
    version TEXT NOT NULL,
    accepted_at TEXT NOT NULL,
    source_screen TEXT NOT NULL,
    UNIQUE (user_id, consent_type, version),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS listing_compliance (
    post_id TEXT PRIMARY KEY,
    seller_relation_type TEXT,
    plate_number TEXT,
    registration_owner_full_name_declared TEXT,
    is_owner_same_as_account_holder INTEGER,
    authorization_declaration_text TEXT,
    authorization_declaration_accepted INTEGER NOT NULL DEFAULT 0,
    authorization_status TEXT NOT NULL DEFAULT 'not_required',
    eids_status TEXT NOT NULL DEFAULT 'not_started',
    safe_payment_info_accepted INTEGER NOT NULL DEFAULT 0,
    safe_payment_info_accepted_at TEXT,
    listing_compliance_status TEXT NOT NULL DEFAULT 'draft',
    risk_score INTEGER NOT NULL DEFAULT 0,
    risk_level TEXT NOT NULL DEFAULT 'low',
    billing_required INTEGER NOT NULL DEFAULT 0,
    billing_status TEXT NOT NULL DEFAULT 'not_required',
    payment_record_id TEXT,
    duplicate_plate_flag INTEGER NOT NULL DEFAULT 0,
    abnormal_price_flag INTEGER NOT NULL DEFAULT 0,
    spam_content_flag INTEGER NOT NULL DEFAULT 0,
    review_required_reason TEXT,
    reviewed_by_admin_id TEXT,
    reviewed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sale_processes (
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL,
    buyer_user_id TEXT NOT NULL,
    seller_user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'interest',
    safe_payment_reference_code TEXT,
    safe_payment_provider_name TEXT,
    safe_payment_status_note TEXT,
    safe_payment_info_accepted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (listing_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (buyer_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_yearly_activity (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    year INTEGER NOT NULL,
    vehicle_sale_count INTEGER NOT NULL DEFAULT 0,
    vehicle_listing_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (user_id, year),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS garage_vehicles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    vehicle_type TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    generation TEXT,
    year INTEGER,
    trim TEXT,
    engine TEXT,
    fuel_type TEXT,
    transmission TEXT,
    drivetrain TEXT,
    equipment_json TEXT NOT NULL DEFAULT '[]',
    body_type TEXT,
    market_region TEXT,
    color TEXT,
    plate TEXT,
    plate_is_hidden INTEGER NOT NULL DEFAULT 1,
    mileage_km INTEGER,
    paint_map_json TEXT NOT NULL DEFAULT '{}',
    show_in_profile INTEGER NOT NULL DEFAULT 1,
    is_primary INTEGER NOT NULL DEFAULT 0,
    obd_connection_status TEXT NOT NULL DEFAULT 'not_connected',
    health_score INTEGER,
    driving_score INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS vehicle_media (
    id TEXT PRIMARY KEY,
    vehicle_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    url TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'photo',
    mime_type TEXT,
    file_name TEXT,
    file_size INTEGER,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (vehicle_id) REFERENCES garage_vehicles(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS vehicle_registrations (
    vehicle_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    owner_name TEXT,
    owner_identifier TEXT,
    registration_city TEXT,
    registration_serial TEXT,
    registration_number TEXT,
    issued_at TEXT,
    raw_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (vehicle_id) REFERENCES garage_vehicles(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS vehicle_chassis (
    vehicle_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    chassis_no TEXT,
    engine_no TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (vehicle_id) REFERENCES garage_vehicles(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS obd_sessions (
    id TEXT PRIMARY KEY,
    vehicle_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    connection_type TEXT NOT NULL,
    adapter_name TEXT,
    adapter_identifier TEXT,
    protocol TEXT,
    status TEXT NOT NULL DEFAULT 'created',
    started_at TEXT,
    ended_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (vehicle_id) REFERENCES garage_vehicles(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS obd_readings (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    vehicle_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    reading_type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    captured_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES obd_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES garage_vehicles(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS expertise_sessions (
    id TEXT PRIMARY KEY,
    vehicle_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    obd_session_id TEXT,
    status TEXT NOT NULL DEFAULT 'created',
    drive_duration_seconds INTEGER NOT NULL DEFAULT 0,
    started_at TEXT,
    ended_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (vehicle_id) REFERENCES garage_vehicles(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (obd_session_id) REFERENCES obd_sessions(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS expertise_reports (
    id TEXT PRIMARY KEY,
    expertise_session_id TEXT NOT NULL,
    vehicle_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    health_score INTEGER,
    driving_score INTEGER,
    dtc_summary_json TEXT NOT NULL DEFAULT '[]',
    sensor_summary_json TEXT NOT NULL DEFAULT '[]',
    risk_summary_json TEXT NOT NULL DEFAULT '[]',
    comparison_summary_json TEXT NOT NULL DEFAULT '[]',
    report_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    FOREIGN KEY (expertise_session_id) REFERENCES expertise_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (vehicle_id) REFERENCES garage_vehicles(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS commercial_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
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
    submitted_at TEXT,
    document_truthfulness_accepted_at TEXT,
    additional_verification_acknowledged_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

    CREATE TABLE IF NOT EXISTS commercial_documents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      commercial_profile_id TEXT NOT NULL,
    type TEXT NOT NULL,
    file_url TEXT NOT NULL,
    original_file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    uploaded_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'uploaded',
    reviewed_by_admin_id TEXT,
    reviewed_at TEXT,
    reject_reason TEXT,
    verification_method TEXT NOT NULL DEFAULT 'unverified',
    suspicious_flag INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (commercial_profile_id) REFERENCES commercial_profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS subscription_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      monthly_price TEXT NOT NULL,
      yearly_price TEXT,
      currency TEXT NOT NULL DEFAULT 'TRY',
      max_listings_per_month INTEGER NOT NULL DEFAULT 0,
      max_featured_listings INTEGER NOT NULL DEFAULT 0,
      is_commercial_only INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'inactive',
      start_at TEXT,
      end_at TEXT,
      renewal_at TEXT,
      payment_provider TEXT,
      payment_status TEXT,
      external_payment_reference TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS billing_settings (
      id TEXT PRIMARY KEY,
      paid_listings_enabled INTEGER NOT NULL DEFAULT 0,
      subscription_required_for_commercial INTEGER NOT NULL DEFAULT 0,
      individual_listing_fee_enabled INTEGER NOT NULL DEFAULT 0,
      featured_listing_fee_enabled INTEGER NOT NULL DEFAULT 0,
      individual_listing_fee_amount TEXT NOT NULL DEFAULT '0',
      featured_listing_fee_amount TEXT NOT NULL DEFAULT '0',
      currency TEXT NOT NULL DEFAULT 'TRY',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      listing_id TEXT,
      type TEXT NOT NULL,
      amount TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'TRY',
      provider TEXT NOT NULL,
      status TEXT NOT NULL,
      external_ref TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (listing_id) REFERENCES posts(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_type TEXT NOT NULL,
      actor_id TEXT,
    target_type TEXT NOT NULL,
    target_id TEXT,
    action TEXT NOT NULL,
    metadata TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admin_roles (
    role_key TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_admin_roles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    role_key TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE (user_id, role_key),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_key) REFERENCES admin_roles(role_key) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS digital_purchases (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    product_id TEXT NOT NULL,
    purchase_token_lookup TEXT NOT NULL UNIQUE,
    purchase_token TEXT NOT NULL,
    transaction_id TEXT NOT NULL,
    order_id TEXT,
    status TEXT NOT NULL,
    purchase_payload_json TEXT NOT NULL,
    verification_payload_json TEXT NOT NULL,
    expires_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS rate_limit_hits (
    limiter_key TEXT NOT NULL,
    window_started_at TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (limiter_key, window_started_at)
  );
`;

async function initializeStore() {
  await initializeDatabase({ sqliteSchemaSql });
  await migrateLegacyData();
}

function jsonParse(value, fallback) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function jsonStringify(value) {
  return JSON.stringify(value ?? null);
}

function normalizeEmail(value) {
  return String(value || '').trim().toLocaleLowerCase('tr');
}

function normalizePhone(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }

  const compact = raw.replace(/[^\d+]/g, '');
  if (!compact) {
    return '';
  }

  if (compact.startsWith('+')) {
    const digits = compact.slice(1).replace(/\D/g, '');
    return digits ? `+${digits}` : '';
  }

  const digits = compact.replace(/\D/g, '');
  if (!digits) {
    return '';
  }

  if (digits.startsWith('00') && digits.length > 4) {
    return `+${digits.slice(2)}`;
  }

  if (digits.startsWith('90') && digits.length === 12) {
    return `+${digits}`;
  }

  if (digits.startsWith('0') && digits.length === 11) {
    return `+90${digits.slice(1)}`;
  }

  if (digits.length === 10) {
    return `+90${digits}`;
  }

  return '';
}

function makeInternalEmail(userId) {
  return `internal-email-${userId}@VCARX.local`;
}

function makeInternalPhone(userId) {
  return `internal-phone-${userId}`;
}

function sanitizeStoredEmail(value) {
  const email = String(value || '').trim();
  return email.startsWith('internal-email-') && email.endsWith('@VCARX.local') ? '' : email;
}

function sanitizeStoredPhone(value) {
  const phone = String(value || '').trim();
  return phone.startsWith('internal-phone-') ? '' : phone;
}

function normalizeHandle(value) {
  const compact = String(value || '')
    .trim()
    .toLocaleLowerCase('tr')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9_.]/g, '');

  const fallback = compact || `uye${Date.now().toString().slice(-5)}`;
  return fallback.startsWith('@') ? fallback : `@${fallback}`;
}

function normalizeAccountType(value) {
  return value === 'commercial' ? 'commercial' : 'individual';
}

function normalizePrimaryChannel(value) {
  return value === 'phone' ? 'phone' : 'email';
}

function buildCommercialRegistrationDraft(payload = {}) {
  const source = payload?.commercialProfile && typeof payload.commercialProfile === 'object'
    ? payload.commercialProfile
    : payload;

  return {
    companyName: String(source.companyName || '').trim(),
    taxOrIdentityType: source.taxOrIdentityType === 'TCKN' ? 'TCKN' : 'VKN',
    taxOrIdentityNumber: String(source.taxOrIdentityNumber || '').trim(),
    tradeName: String(source.tradeName || '').trim(),
    mersisNumber: String(source.mersisNumber || '').trim(),
    authorizedPersonName: String(source.authorizedPersonName || '').trim(),
    authorizedPersonTitle: String(source.authorizedPersonTitle || '').trim(),
    phone: String(source.phone || '').trim(),
    city: String(source.city || '').trim(),
    district: String(source.district || '').trim(),
    address: String(source.address || '').trim(),
    notes: String(source.notes || '').trim(),
  };
}

function validateCommercialRegistrationDraft(payload) {
  if (!payload.companyName) {
    const error = new Error('Ticari kayit icin sirket veya isletme adi zorunludur.');
    error.statusCode = 400;
    throw error;
  }

  if (!payload.taxOrIdentityNumber) {
    const error = new Error('Ticari kayit icin VKN veya TCKN zorunludur.');
    error.statusCode = 400;
    throw error;
  }
}

function buildPaymentPageUrl(paymentReference) {
  const baseUrl = String(config.paymentPageBaseUrl || config.appBaseUrl || 'http://localhost:3000').replace(
    /\/+$/g,
    '',
  );
  return `${baseUrl}/pay?paymentReference=${encodeURIComponent(paymentReference)}`;
}

function buildPaymentReturnUrls(paymentReference, conversationId) {
  const appReturnBase = String(config.paymentReturnScheme || 'carloi://payment-result').trim();
  const encodedReference = encodeURIComponent(paymentReference || '');
  const encodedConversationId = encodeURIComponent(conversationId || '');
  const paymentPageUrl = buildPaymentPageUrl(paymentReference || '');

  return {
    appSuccessUrl: `${appReturnBase}?status=success&paymentReference=${encodedReference}&conversationId=${encodedConversationId}`,
    appFailureUrl: `${appReturnBase}?status=failed&paymentReference=${encodedReference}&conversationId=${encodedConversationId}`,
    appCancelledUrl: `${appReturnBase}?status=cancelled&paymentReference=${encodedReference}&conversationId=${encodedConversationId}`,
    webSuccessUrl: `${paymentPageUrl}&status=success`,
    webFailureUrl: `${paymentPageUrl}&status=failed`,
    webCancelledUrl: `${paymentPageUrl}&status=cancelled`,
  };
}

function getPaymentRetryCount(paymentRecord) {
  return Number(paymentRecord?.metadata?.retryCount || 0) || 0;
}

function canRetryPaymentRecord(paymentRecord) {
  return (
    Boolean(paymentRecord) &&
    isRetryablePaymentStatus(paymentRecord.status) &&
    getPaymentRetryCount(paymentRecord) < Math.max(1, Number(config.paymentMaxRetryCount || 3))
  );
}

function normalizeExternalPaymentStatus(status) {
  const normalized = normalizePaymentStatus(status);
  return normalized === PAYMENT_STATUS_INITIATED ? PAYMENT_STATUS_PENDING : normalized;
}

function buildInsurancePaymentStatusSummary(paymentRecord, transaction, listing) {
  const paymentReference = paymentRecord?.externalRef || transaction?.payment_reference || '';
  const conversationId = paymentRecord?.metadata?.conversationId || '';
  const registrationInfo = transaction?.registration_json
    ? decryptJson(transaction.registration_json, jsonParse(transaction.registration_json, undefined))
    : listing?.registrationInfo;
  const modelYearSummary =
    listing?.summaryLine ||
    [listing?.title, listing?.location].filter(Boolean).join(' • ');

  return {
    paymentReference,
    paymentRecordId: paymentRecord?.id || null,
    status: paymentRecord ? normalizeExternalPaymentStatus(paymentRecord.status) : transaction?.payment_status || 'missing',
    amount: paymentRecord?.amount || transaction?.insurance_quote_amount || '0',
    currency: paymentRecord?.currency || 'TRY',
    providerName: 'Garanti Virtual POS',
    insuranceType: paymentRecord?.metadata?.insuranceType || 'Sigorta hizmeti',
    paymentUrl: paymentRecord?.metadata?.redirectUrl || '',
    gatewayUrl: paymentRecord?.metadata?.gatewayUrl || '',
    trustMessage:
      'Odeme Garanti Virtual POS uzerinde tamamlanir. Carloi resmi odeme saglayicisi veya emanet kurumu degildir.',
    vehicleSummary: {
      title: listing?.title || paymentRecord?.metadata?.listingTitle || '',
      price: listing?.price || paymentRecord?.metadata?.listingPrice || '',
      location: listing?.location || paymentRecord?.metadata?.listingLocation || '',
      plateNumber: registrationInfo?.plateNumber || '',
      modelYearSummary,
    },
    returnUrls:
      paymentRecord?.metadata?.returnUrls || buildPaymentReturnUrls(paymentReference, conversationId),
    conversationId,
  };
}

function makeShareLink(postId, type) {
  return type === 'listing'
    ? `${config.publicBaseUrl}/listing/${postId}`
    : `${config.publicBaseUrl}/p/${postId}`;
}

function makeProfileLink(handle) {
  return `${config.publicBaseUrl}/profile/${encodeURIComponent(String(handle || '').replace(/^@/, ''))}`;
}

function formatFeedTime(iso) {
  const timestamp = new Date(iso).getTime();
  const diff = Date.now() - timestamp;

  if (diff < 60_000) {
    return 'Az once';
  }
  if (diff < 3_600_000) {
    return `${Math.max(1, Math.round(diff / 60_000))} dk`;
  }
  if (diff < 86_400_000) {
    return `${Math.max(1, Math.round(diff / 3_600_000))} sa`;
  }

  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(iso));
}

function formatMessageTime(iso) {
  return new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function maskVerificationDestination(channel, destination) {
  const value = String(destination || '').trim();
  if (!value) {
    return '';
  }

  if (channel === 'email') {
    const [name, domain] = value.split('@');
    if (!name || !domain) {
      return 'email:invalid';
    }

    return `${name.slice(0, 2)}***@${domain}`;
  }

  return `${'*'.repeat(Math.max(0, value.length - 2))}${value.slice(-2)}`;
}

function isSixDigitVerificationCode(code) {
  return VERIFICATION_CODE_PATTERN.test(String(code || '').trim());
}

function createVerificationMailDeliveryError(cause) {
  const error = new Error(VERIFICATION_MAIL_FAILURE_MESSAGE);
  error.statusCode = 503;
  error.expose = true;
  if (cause) {
    error.cause = cause;
    error.emailDisabled = Boolean(cause.emailDisabled);
    error.emailNotConfigured = Boolean(cause.emailNotConfigured);
  }
  return error;
}

function runDetachedTask(taskName, task) {
  setImmediate(() => {
    Promise.resolve()
      .then(task)
      .catch((error) => {
        logError(taskName, {
          errorMessage: error?.message || 'unknown',
          statusCode: error?.statusCode || 500,
          code: error?.code || '',
        });
      });
  });
}

function getMailAvailabilityFlags() {
  const state = getMailServiceState();
  return {
    emailDisabled: state.reason === 'disabled',
    emailNotConfigured: state.reason === 'not_configured',
    emailAvailable: state.available,
  };
}

function getSmsAvailabilityFlags() {
  const state = getSmsServiceState();
  return {
    smsDisabled: state.reason === 'disabled',
    smsNotConfigured: state.reason === 'not_configured',
    smsAvailable: state.available,
  };
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) {
    return false;
  }

  const derived = scryptSync(password, salt, 64);
  const original = Buffer.from(hash, 'hex');
  return derived.length === original.length && timingSafeEqual(derived, original);
}

function makeSessionToken(userId) {
  const raw = `${userId}.${randomBytes(32).toString('hex')}.${config.sessionSecret}`;
  return Buffer.from(raw).toString('base64url');
}

async function ensureColumn(table, column, definition) {
  const columns = await db.prepare(`PRAGMA table_info(${table})`).all();
  if (columns.some((item) => item.name === column)) {
    return;
  }

  await db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

async function migrateLegacyData() {
  const booleanColumnDefaultFalse = isPostgresMode()
    ? 'BOOLEAN NOT NULL DEFAULT FALSE'
    : 'INTEGER NOT NULL DEFAULT 0';

  await ensureColumn('users', 'email_lookup', 'TEXT');
  await ensureColumn('users', 'phone_lookup', 'TEXT');
  await ensureColumn('users', 'google_sub', 'TEXT');
  await ensureColumn('users', 'apple_sub', 'TEXT');
  await ensureColumn('users', 'account_type', "TEXT NOT NULL DEFAULT 'individual'");
  await ensureColumn('users', 'commercial_status', "TEXT NOT NULL DEFAULT 'not_applied'");
  await ensureColumn('users', 'commercial_approved_at', 'TEXT');
  await ensureColumn('users', 'commercial_rejected_reason', 'TEXT');
  await ensureColumn('users', 'commercial_reviewed_by_admin_id', 'TEXT');
  await ensureColumn('users', 'yearly_vehicle_sale_count', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn('users', 'yearly_vehicle_listing_count', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn('users', 'commercial_behavior_flag', booleanColumnDefaultFalse);
  await ensureColumn('users', 'risk_score', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn('users', 'risk_level', "TEXT NOT NULL DEFAULT 'low'");
  await ensureColumn('users', 'can_create_paid_listings', booleanColumnDefaultFalse);
  await ensureColumn('users', 'subscription_status', "TEXT NOT NULL DEFAULT 'inactive'");
  await ensureColumn('users', 'subscription_plan_id', 'TEXT');
  await ensureColumn('users', 'forgot_password_required_reset_at', 'TEXT');
  await ensureColumn('users', 'last_login_ip', 'TEXT');
  await ensureColumn('users', 'last_known_device_fingerprint', 'TEXT');
  await ensureColumn('users', 'fraud_flag_count', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn('messages', 'attachments_json', "TEXT NOT NULL DEFAULT '[]'");
  await ensureColumn('messages', 'edited_at', 'TEXT');
  await ensureColumn('messages', 'deleted_for_everyone_at', 'TEXT');
  await ensureColumn('ai_messages', 'provider', "TEXT NOT NULL DEFAULT 'fallback'");
  await ensureColumn('ai_messages', 'related_post_ids_json', "TEXT NOT NULL DEFAULT '[]'");
  await ensureColumn('ai_messages', 'edited_at', 'TEXT');
  await ensureColumn('conversations', 'context_post_id', 'TEXT');
  await ensureColumn('conversations', 'buyer_user_id', 'TEXT');
  await ensureColumn('conversations', 'seller_user_id', 'TEXT');
  await ensureColumn('conversations', 'buyer_agreed_at', 'TEXT');
  await ensureColumn('conversations', 'seller_agreed_at', 'TEXT');
  await ensureColumn('listing_transactions', 'invoice_uri', 'TEXT');
  await ensureColumn('listing_transactions', 'invoice_sent_at', 'TEXT');
  await ensureColumn(
    'listing_compliance',
    'authorization_declaration_accepted',
    booleanColumnDefaultFalse,
  );
  await ensureColumn('listing_compliance', 'risk_score', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn('listing_compliance', 'risk_level', "TEXT NOT NULL DEFAULT 'low'");
  await ensureColumn('listing_compliance', 'billing_required', booleanColumnDefaultFalse);
  await ensureColumn(
    'listing_compliance',
    'billing_status',
    "TEXT NOT NULL DEFAULT 'not_required'",
  );
  await ensureColumn('listing_compliance', 'payment_record_id', 'TEXT');
  await ensureColumn('listing_compliance', 'duplicate_plate_flag', booleanColumnDefaultFalse);
  await ensureColumn('listing_compliance', 'abnormal_price_flag', booleanColumnDefaultFalse);
  await ensureColumn('listing_compliance', 'spam_content_flag', booleanColumnDefaultFalse);
  await ensureColumn('commercial_profiles', 'submitted_at', 'TEXT');
  await ensureColumn('commercial_profiles', 'document_truthfulness_accepted_at', 'TEXT');
  await ensureColumn('commercial_profiles', 'additional_verification_acknowledged_at', 'TEXT');

  const smsVerificationUsedDefinition = isPostgresMode()
    ? 'BOOLEAN NOT NULL DEFAULT FALSE'
    : 'INTEGER NOT NULL DEFAULT 0';
  const smsTimestampType = isPostgresMode() ? 'TIMESTAMPTZ' : 'TEXT';
  const smsCreatedAtDefault = isPostgresMode() ? 'NOW()' : "(datetime('now'))";
  const garageBooleanDefaultTrue = isPostgresMode()
    ? 'BOOLEAN NOT NULL DEFAULT TRUE'
    : 'INTEGER NOT NULL DEFAULT 1';
  const garageBooleanDefaultFalse = isPostgresMode()
    ? 'BOOLEAN NOT NULL DEFAULT FALSE'
    : 'INTEGER NOT NULL DEFAULT 0';
  const garageTimestampType = isPostgresMode() ? 'TIMESTAMPTZ' : 'TEXT';
  const garageNowDefault = isPostgresMode() ? 'NOW()' : "(datetime('now'))";

  await db.exec(`
    CREATE TABLE IF NOT EXISTS sms_verification_codes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      phone TEXT NOT NULL,
      phone_lookup TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at ${smsTimestampType} NOT NULL,
      used ${smsVerificationUsedDefinition},
      used_at ${smsTimestampType},
      created_at ${smsTimestampType} NOT NULL DEFAULT ${smsCreatedAtDefault}
    );
    CREATE INDEX IF NOT EXISTS idx_sms_verification_codes_user_created_at ON sms_verification_codes(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sms_verification_codes_phone_lookup ON sms_verification_codes(phone_lookup);
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS garage_vehicles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      vehicle_type TEXT NOT NULL,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      generation TEXT,
      year INTEGER,
      trim TEXT,
      engine TEXT,
      fuel_type TEXT,
      transmission TEXT,
      drivetrain TEXT,
      equipment_json TEXT NOT NULL DEFAULT '[]',
      body_type TEXT,
      market_region TEXT,
      color TEXT,
      plate TEXT,
      plate_is_hidden ${garageBooleanDefaultTrue},
      mileage_km INTEGER,
      paint_map_json TEXT NOT NULL DEFAULT '{}',
      show_in_profile ${garageBooleanDefaultTrue},
      is_primary ${garageBooleanDefaultFalse},
      obd_connection_status TEXT NOT NULL DEFAULT 'not_connected',
      health_score INTEGER,
      driving_score INTEGER,
      created_at ${garageTimestampType} NOT NULL DEFAULT ${garageNowDefault},
      updated_at ${garageTimestampType} NOT NULL DEFAULT ${garageNowDefault}
    );
    CREATE TABLE IF NOT EXISTS vehicle_media (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL REFERENCES garage_vehicles(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'photo',
      mime_type TEXT,
      file_name TEXT,
      file_size INTEGER,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at ${garageTimestampType} NOT NULL DEFAULT ${garageNowDefault}
    );
    CREATE TABLE IF NOT EXISTS vehicle_registrations (
      vehicle_id TEXT PRIMARY KEY REFERENCES garage_vehicles(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      owner_name TEXT,
      owner_identifier TEXT,
      registration_city TEXT,
      registration_serial TEXT,
      registration_number TEXT,
      issued_at ${garageTimestampType},
      raw_json TEXT NOT NULL DEFAULT '{}',
      created_at ${garageTimestampType} NOT NULL DEFAULT ${garageNowDefault},
      updated_at ${garageTimestampType} NOT NULL DEFAULT ${garageNowDefault}
    );
    CREATE TABLE IF NOT EXISTS vehicle_chassis (
      vehicle_id TEXT PRIMARY KEY REFERENCES garage_vehicles(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      chassis_no TEXT,
      engine_no TEXT,
      notes TEXT,
      created_at ${garageTimestampType} NOT NULL DEFAULT ${garageNowDefault},
      updated_at ${garageTimestampType} NOT NULL DEFAULT ${garageNowDefault}
    );
    CREATE TABLE IF NOT EXISTS obd_sessions (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL REFERENCES garage_vehicles(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      connection_type TEXT NOT NULL,
      adapter_name TEXT,
      adapter_identifier TEXT,
      protocol TEXT,
      status TEXT NOT NULL DEFAULT 'created',
      started_at ${garageTimestampType},
      ended_at ${garageTimestampType},
      created_at ${garageTimestampType} NOT NULL DEFAULT ${garageNowDefault},
      updated_at ${garageTimestampType} NOT NULL DEFAULT ${garageNowDefault}
    );
    CREATE TABLE IF NOT EXISTS obd_readings (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES obd_sessions(id) ON DELETE CASCADE,
      vehicle_id TEXT NOT NULL REFERENCES garage_vehicles(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reading_type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      captured_at ${garageTimestampType} NOT NULL DEFAULT ${garageNowDefault}
    );
    CREATE TABLE IF NOT EXISTS expertise_sessions (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL REFERENCES garage_vehicles(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      obd_session_id TEXT REFERENCES obd_sessions(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'created',
      drive_duration_seconds INTEGER NOT NULL DEFAULT 0,
      started_at ${garageTimestampType},
      ended_at ${garageTimestampType},
      created_at ${garageTimestampType} NOT NULL DEFAULT ${garageNowDefault},
      updated_at ${garageTimestampType} NOT NULL DEFAULT ${garageNowDefault}
    );
    CREATE TABLE IF NOT EXISTS expertise_reports (
      id TEXT PRIMARY KEY,
      expertise_session_id TEXT NOT NULL REFERENCES expertise_sessions(id) ON DELETE CASCADE,
      vehicle_id TEXT NOT NULL REFERENCES garage_vehicles(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      health_score INTEGER,
      driving_score INTEGER,
      dtc_summary_json TEXT NOT NULL DEFAULT '[]',
      sensor_summary_json TEXT NOT NULL DEFAULT '[]',
      risk_summary_json TEXT NOT NULL DEFAULT '[]',
      comparison_summary_json TEXT NOT NULL DEFAULT '[]',
      report_json TEXT NOT NULL DEFAULT '{}',
      created_at ${garageTimestampType} NOT NULL DEFAULT ${garageNowDefault}
    );
    CREATE INDEX IF NOT EXISTS idx_garage_vehicles_user_updated_at ON garage_vehicles(user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_garage_vehicles_user_primary ON garage_vehicles(user_id, is_primary);
    CREATE INDEX IF NOT EXISTS idx_vehicle_media_vehicle_sort_order ON vehicle_media(vehicle_id, sort_order, created_at);
    CREATE INDEX IF NOT EXISTS idx_vehicle_registrations_user_id ON vehicle_registrations(user_id);
    CREATE INDEX IF NOT EXISTS idx_vehicle_chassis_user_id ON vehicle_chassis(user_id);
    CREATE INDEX IF NOT EXISTS idx_obd_sessions_vehicle_created_at ON obd_sessions(vehicle_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_obd_sessions_user_status ON obd_sessions(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_obd_readings_session_captured_at ON obd_readings(session_id, captured_at DESC);
    CREATE INDEX IF NOT EXISTS idx_expertise_sessions_vehicle_created_at ON expertise_sessions(vehicle_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_expertise_reports_vehicle_created_at ON expertise_reports(vehicle_id, created_at DESC);
  `);

  if (!isPostgresMode()) {
    await db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lookup ON users(email_lookup);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_lookup ON users(phone_lookup);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub ON users(google_sub);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_apple_sub ON users(apple_sub);
    CREATE TABLE IF NOT EXISTS subscription_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      monthly_price TEXT NOT NULL,
      yearly_price TEXT,
      currency TEXT NOT NULL DEFAULT 'TRY',
      max_listings_per_month INTEGER NOT NULL DEFAULT 0,
      max_featured_listings INTEGER NOT NULL DEFAULT 0,
      is_commercial_only INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS user_subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'inactive',
      start_at TEXT,
      end_at TEXT,
      renewal_at TEXT,
      payment_provider TEXT,
      payment_status TEXT,
      external_payment_reference TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE RESTRICT
    );
    CREATE TABLE IF NOT EXISTS billing_settings (
      id TEXT PRIMARY KEY,
      paid_listings_enabled INTEGER NOT NULL DEFAULT 0,
      subscription_required_for_commercial INTEGER NOT NULL DEFAULT 0,
      individual_listing_fee_enabled INTEGER NOT NULL DEFAULT 0,
      featured_listing_fee_enabled INTEGER NOT NULL DEFAULT 0,
      individual_listing_fee_amount TEXT NOT NULL DEFAULT '0',
      featured_listing_fee_amount TEXT NOT NULL DEFAULT '0',
      currency TEXT NOT NULL DEFAULT 'TRY',
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS payment_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      listing_id TEXT,
      type TEXT NOT NULL,
      amount TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'TRY',
      provider TEXT NOT NULL,
      status TEXT NOT NULL,
      external_ref TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (listing_id) REFERENCES posts(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS sale_processes (
      id TEXT PRIMARY KEY,
      listing_id TEXT NOT NULL,
      buyer_user_id TEXT NOT NULL,
      seller_user_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'interest',
      safe_payment_reference_code TEXT,
      safe_payment_provider_name TEXT,
      safe_payment_status_note TEXT,
      safe_payment_info_accepted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (listing_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (buyer_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (seller_user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS user_yearly_activity (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      year INTEGER NOT NULL,
      vehicle_sale_count INTEGER NOT NULL DEFAULT 0,
      vehicle_listing_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (user_id, year),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    INSERT OR IGNORE INTO billing_settings (
      id,
      paid_listings_enabled,
      subscription_required_for_commercial,
      individual_listing_fee_enabled,
      featured_listing_fee_enabled,
      individual_listing_fee_amount,
      featured_listing_fee_amount,
      currency,
      updated_at
    ) VALUES ('default', 0, 0, 0, 0, '0', '0', 'TRY', '${nowIso()}');
    CREATE INDEX IF NOT EXISTS idx_sale_processes_listing_status ON sale_processes(listing_id, status);
    CREATE INDEX IF NOT EXISTS idx_sale_processes_parties ON sale_processes(buyer_user_id, seller_user_id);
    CREATE INDEX IF NOT EXISTS idx_user_yearly_activity_year ON user_yearly_activity(year);
    CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_status ON user_subscriptions(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_payment_records_user_type_status ON payment_records(user_id, type, status);
    CREATE INDEX IF NOT EXISTS idx_payment_records_listing_id ON payment_records(listing_id);
    CREATE TABLE IF NOT EXISTS admin_roles (
      role_key TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS user_admin_roles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role_key TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (user_id, role_key),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (role_key) REFERENCES admin_roles(role_key) ON DELETE CASCADE
    );
    INSERT OR IGNORE INTO admin_roles (role_key, label, created_at) VALUES
      ('super_admin', 'Super Admin', '${nowIso()}'),
      ('compliance_admin', 'Compliance Admin', '${nowIso()}'),
      ('moderation_admin', 'Moderation Admin', '${nowIso()}'),
      ('support_admin', 'Support Admin', '${nowIso()}'),
      ('billing_admin', 'Billing Admin', '${nowIso()}'),
      ('analytics_admin', 'Analytics Admin', '${nowIso()}'),
      ('legal_export_admin', 'Legal Export Admin', '${nowIso()}'),
      ('ops_admin', 'Ops Admin', '${nowIso()}');
    CREATE INDEX IF NOT EXISTS idx_user_admin_roles_user_id ON user_admin_roles(user_id);
    CREATE TABLE IF NOT EXISTS message_hidden_for_users (
      message_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (message_id, user_id),
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  }

  await ensureColumn(
    'billing_settings',
    'individual_listing_fee_amount',
    "TEXT NOT NULL DEFAULT '0'",
  );
  await ensureColumn(
    'billing_settings',
    'featured_listing_fee_amount',
    "TEXT NOT NULL DEFAULT '0'",
  );
  await ensureColumn('billing_settings', 'currency', "TEXT NOT NULL DEFAULT 'TRY'");

  const userRows = await db.prepare('SELECT * FROM users').all();
  const updateUser = db.prepare(
    `UPDATE users
     SET email = ?, phone = ?, email_lookup = ?, phone_lookup = ?, settings_json = ?, vehicle_json = ?
     WHERE id = ?`,
  );

  for (const row of userRows) {
    const rowIsReady =
      Boolean(row.email_lookup) &&
      Boolean(row.phone_lookup) &&
      isEncryptedText(row.email) &&
      isEncryptedText(row.phone) &&
      isEncryptedText(row.settings_json) &&
      (!row.vehicle_json || isEncryptedText(row.vehicle_json));

    if (rowIsReady) {
      continue;
    }

    const emailPlain = decryptText(row.email, row.email || '');
    const phonePlain = decryptText(row.phone, row.phone || '');
    const settingsValue = decryptJson(
      row.settings_json,
      jsonParse(row.settings_json, defaultSettings),
    );
    const vehicleValue = row.vehicle_json
      ? decryptJson(row.vehicle_json, jsonParse(row.vehicle_json, undefined))
      : undefined;

    await updateUser.run(
      encryptText(emailPlain),
      encryptText(phonePlain),
      emailPlain ? makeLookupHash(emailPlain) : null,
      phonePlain ? makeLookupHash(phonePlain) : null,
      encryptJson({
        ...defaultSettings,
        ...settingsValue,
        email: sanitizeStoredEmail(emailPlain),
        phone: sanitizeStoredPhone(phonePlain),
        membershipPlan:
          row.membership_plan || settingsValue?.membershipPlan || defaultSettings.membershipPlan,
      }),
      vehicleValue ? encryptJson(vehicleValue) : null,
      row.id,
    );
  }

  const sessionRows = await db.prepare('SELECT token FROM sessions').all();
  const updateSession = db.prepare('UPDATE sessions SET token = ? WHERE token = ?');
  for (const row of sessionRows) {
    if (!isHashedSessionToken(row.token)) {
      await updateSession.run(hashSessionToken(row.token), row.token);
    }
  }

  const messageRows = await db.prepare('SELECT id, text, attachments_json FROM messages').all();
  const updateMessage = db.prepare('UPDATE messages SET text = ?, attachments_json = ? WHERE id = ?');
  for (const row of messageRows) {
    const nextText = isEncryptedText(row.text) ? row.text : encryptText(row.text);
    const rawAttachments = row.attachments_json ?? '[]';
    const nextAttachments = isEncryptedText(rawAttachments)
      ? rawAttachments
      : encryptJson(jsonParse(rawAttachments, []));

    if (nextText !== row.text || nextAttachments !== rawAttachments) {
      await updateMessage.run(nextText, nextAttachments, row.id);
    }
  }

  const aiRows = await db.prepare('SELECT id, content FROM ai_messages').all();
  const updateAi = db.prepare('UPDATE ai_messages SET content = ? WHERE id = ?');
  for (const row of aiRows) {
    if (!isEncryptedText(row.content)) {
      await updateAi.run(encryptText(row.content), row.id);
    }
  }
}

function hydrateUserRow(row) {
  if (!row) {
    return null;
  }

  return {
    ...row,
    email: decryptText(row.email, row.email || ''),
    phone: decryptText(row.phone, row.phone || ''),
  };
}

async function ensureDefaultAiMessages(userId) {
  const row = await db
    .prepare('SELECT COUNT(*) AS count FROM ai_messages WHERE user_id = ?')
    .get(userId);

  if ((row?.count ?? 0) > 0) {
    return;
  }

  const insert = db.prepare(
    'INSERT INTO ai_messages (id, user_id, role, content, provider, related_post_ids_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );

  for (const message of defaultAiMessages) {
    await insert.run(
      randomUUID(),
      userId,
      message.role,
      encryptText(message.content),
      'fallback',
      encryptJson([]),
      nowIso(),
    );
  }
}

async function getUserById(userId) {
  return hydrateUserRow((await db.prepare('SELECT * FROM users WHERE id = ?').get(userId)) ?? null);
}

async function getUserByHandle(handle) {
  return hydrateUserRow((await db.prepare('SELECT * FROM users WHERE handle = ?').get(handle)) ?? null);
}

async function getUserByIdentifier(identifier) {
  const normalized = normalizeIdentifier(identifier);
  const lookup = makeLookupHash(normalized);

  return hydrateUserRow(
    (await db
      .prepare('SELECT * FROM users WHERE email_lookup = ? OR phone_lookup = ?')
      .get(lookup, lookup)) ?? null,
  );
}

async function getLatestVerificationRequestByDestination({ channel, destination, purpose }) {
  const normalizedDestination =
    channel === 'email' ? normalizeEmail(destination) : normalizePhone(destination);

  if (!normalizedDestination) {
    return null;
  }

  return ((await db
    .prepare(
      `SELECT *
       FROM verification_codes
       WHERE channel = ?
         AND purpose = ?
         AND destination_lookup = ?
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .get(channel, purpose, makeLookupHash(normalizedDestination))) ?? null);
}

async function getLatestUnconsumedVerificationRequest({ channel, destination, purpose }) {
  const normalizedDestination =
    channel === 'email' ? normalizeEmail(destination) : normalizePhone(destination);

  if (!normalizedDestination) {
    return null;
  }

  return ((await db
    .prepare(
      `SELECT *
       FROM verification_codes
       WHERE channel = ?
         AND purpose = ?
         AND destination_lookup = ?
         AND consumed_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .get(channel, purpose, makeLookupHash(normalizedDestination))) ?? null);
}

async function getUserBySocialIdentity(provider, subject) {
  const column = provider === 'apple' ? 'apple_sub' : 'google_sub';
  return hydrateUserRow(
    (await db.prepare(`SELECT * FROM users WHERE ${column} = ?`).get(String(subject || '').trim())) ?? null,
  );
}

async function buildAvailableHandle(seed, excludeUserId) {
  const normalizedSeed = normalizeHandle(seed);
  let candidate = normalizedSeed;
  let attempt = 1;

  while (true) {
    const existing = await getUserByHandle(candidate);
    if (!existing || existing.id === excludeUserId) {
      return candidate;
    }

    candidate = normalizeHandle(`${normalizedSeed.replace(/^@/, '')}${attempt}`);
    attempt += 1;
  }
}

function parseSettings(row) {
  return repairBrokenTurkishText({
    ...defaultSettings,
    ...decryptJson(row.settings_json, jsonParse(row.settings_json, {})),
    email: sanitizeStoredEmail(row.email),
    phone: sanitizeStoredPhone(row.phone),
    membershipPlan: row.membership_plan,
  });
}

function parseVehicle(row) {
  return repairBrokenTurkishText(
    decryptJson(row.vehicle_json, jsonParse(row.vehicle_json, undefined)),
  );
}

function hasOwnValue(source, key) {
  return Object.prototype.hasOwnProperty.call(source || {}, key);
}

function normalizeGarageText(value, maxLength = 240) {
  const normalized = String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
  if (!normalized) {
    return '';
  }

  return normalized.slice(0, maxLength);
}

function normalizeGaragePlate(value) {
  const normalized = normalizeGarageText(value, 32);
  if (!normalized) {
    return '';
  }

  return normalized.toLocaleUpperCase('tr');
}

function normalizeGarageInteger(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numeric = Number.parseInt(String(value), 10);
  return Number.isFinite(numeric) ? numeric : null;
}

function normalizeGarageBoolean(value, fallback = false) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  const normalized = String(value).trim().toLocaleLowerCase('tr');
  if (['1', 'true', 'yes', 'evet', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'hayir', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
}

function normalizeGarageArray(value, fallback = []) {
  return Array.isArray(value) ? value : fallback;
}

function normalizeGarageObject(value, fallback = {}) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;
}

function maskGaragePlate(plate) {
  const normalized = normalizeGaragePlate(plate);
  if (!normalized) {
    return '';
  }

  const compact = normalized.replace(/\s+/g, ' ');
  if (compact.length <= 4) {
    return compact;
  }

  return `${compact.slice(0, 2)} ••• ${compact.slice(-2)}`;
}

function normalizeVehicleMediaKind(value) {
  const normalized = normalizeGarageText(value, 32).toLocaleLowerCase('tr');
  return ['photo', 'video', 'document', 'report', 'diagram'].includes(normalized)
    ? normalized
    : 'photo';
}

function normalizeObdConnectionStatus(value) {
  const normalized = normalizeGarageText(value, 32).toLocaleLowerCase('tr');
  return [
    'not_connected',
    'connecting',
    'connected',
    'collecting',
    'completed',
    'failed',
  ].includes(normalized)
    ? normalized
    : 'not_connected';
}

function normalizeObdSessionStatus(value) {
  const normalized = normalizeGarageText(value, 32).toLocaleLowerCase('tr');
  return ['created', 'connected', 'collecting', 'completed', 'failed'].includes(normalized)
    ? normalized
    : 'created';
}

function normalizeExpertiseSessionStatus(value) {
  const normalized = normalizeGarageText(value, 32).toLocaleLowerCase('tr');
  return ['created', 'precheck', 'collecting', 'analyzing', 'completed', 'failed'].includes(
    normalized,
  )
    ? normalized
    : 'created';
}

function normalizeVehicleMediaInputList(value) {
  return normalizeGarageArray(value)
    .map((item, index) => {
      if (typeof item === 'string') {
        const url = normalizeGarageText(item, 2_000);
        return url
          ? {
              url,
              kind: 'photo',
              sortOrder: index,
            }
          : null;
      }

      if (!item || typeof item !== 'object') {
        return null;
      }

      const url = normalizeGarageText(item.url || item.uri || item.source, 2_000);
      if (!url) {
        return null;
      }

      return {
        url,
        kind: normalizeVehicleMediaKind(item.kind),
        mimeType: normalizeGarageText(item.mimeType || item.type || '', 120) || null,
        fileName: normalizeGarageText(item.fileName || item.name || '', 255) || null,
        fileSize: normalizeGarageInteger(item.fileSize || item.size),
        sortOrder: normalizeGarageInteger(item.sortOrder) ?? index,
      };
    })
    .filter(Boolean);
}

function extractLegacyVehicleMediaList(legacyVehicle) {
  const explicitMedia = normalizeGarageArray(legacyVehicle?.media);
  const explicitPhotos = normalizeGarageArray(legacyVehicle?.photos || legacyVehicle?.photoUris);
  const fallbackPhoto = normalizeGarageText(
    legacyVehicle?.photoUri || legacyVehicle?.previewImageUri || legacyVehicle?.coverUri || '',
    2_000,
  );
  const merged = [
    ...explicitMedia,
    ...explicitPhotos.map((url) => ({ url, kind: 'photo' })),
    ...(fallbackPhoto ? [{ url: fallbackPhoto, kind: 'photo' }] : []),
  ];

  return normalizeVehicleMediaInputList(merged);
}

function buildGarageListingDefaults(vehicle) {
  return repairBrokenTurkishText({
    vehicleId: vehicle.id,
    title: [vehicle.year, vehicle.brand, vehicle.model, vehicle.trim].filter(Boolean).join(' '),
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    trim: vehicle.trim,
    engine: vehicle.engine,
    fuelType: vehicle.fuelType,
    transmission: vehicle.transmission,
    drivetrain: vehicle.drivetrain,
    bodyType: vehicle.bodyType,
    color: vehicle.color,
    plate: vehicle.plate,
    mileageKm: vehicle.mileageKm,
    location: vehicle.registration?.registrationCity || '',
  });
}

function serializeLegacyVehicleFromGarageVehicle(vehicle) {
  const photoUrls = vehicle.media
    .filter((item) => item.kind === 'photo')
    .map((item) => item.url)
    .filter(Boolean);
  const report = vehicle.latestExpertiseReport;

  return repairBrokenTurkishText({
    id: vehicle.id,
    type: vehicle.vehicleType,
    brand: vehicle.brand,
    model: vehicle.model,
    generation: vehicle.generation,
    year: vehicle.year ? String(vehicle.year) : '',
    packageName: vehicle.trim || '',
    engineVolume: vehicle.engine || '',
    fuelType: vehicle.fuelType || '',
    transmission: vehicle.transmission || '',
    drivetrain: vehicle.drivetrain || '',
    bodyType: vehicle.bodyType || '',
    marketRegion: vehicle.marketRegion || '',
    color: vehicle.color || '',
    plate: vehicle.plate || '',
    plateNumber: vehicle.plate || '',
    plateOrigin: vehicle.plate || '',
    mileage: vehicle.mileageKm != null ? `${vehicle.mileageKm} km` : '',
    mileageKm: vehicle.mileageKm ?? undefined,
    vin: vehicle.chassis?.chassisNo || '',
    equipment: vehicle.equipment,
    paintMap: vehicle.paintMap,
    healthScore: report?.healthScore ?? vehicle.healthScore ?? undefined,
    driveScore: report?.drivingScore ?? vehicle.drivingScore ?? undefined,
    faultCodes: Array.isArray(report?.dtcSummary) ? report.dtcSummary : [],
    obdConnectionStatus: vehicle.obdConnectionStatus,
    media: vehicle.media.map((item) => ({
      uri: item.url,
      type: item.kind,
      fileName: item.fileName || undefined,
      mimeType: item.mimeType || undefined,
    })),
    photos: photoUrls,
    photoUris: photoUrls,
    photoUri: photoUrls[0] || undefined,
    previewImageUri: photoUrls[0] || undefined,
  });
}

function mapVehicleMediaRow(row) {
  return repairBrokenTurkishText({
    id: row.id,
    vehicleId: row.vehicle_id,
    userId: row.user_id,
    url: row.url,
    kind: row.kind,
    mimeType: row.mime_type || undefined,
    fileName: row.file_name || undefined,
    fileSize: row.file_size ?? undefined,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
  });
}

function mapVehicleRegistrationRow(row) {
  if (!row) {
    return null;
  }

  return repairBrokenTurkishText({
    vehicleId: row.vehicle_id,
    userId: row.user_id,
    ownerName: row.owner_name || '',
    ownerIdentifier: row.owner_identifier || '',
    registrationCity: row.registration_city || '',
    registrationSerial: row.registration_serial || '',
    registrationNumber: row.registration_number || '',
    issuedAt: row.issued_at || null,
    raw: jsonParse(row.raw_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function mapVehicleChassisRow(row) {
  if (!row) {
    return null;
  }

  return repairBrokenTurkishText({
    vehicleId: row.vehicle_id,
    userId: row.user_id,
    chassisNo: row.chassis_no || '',
    engineNo: row.engine_no || '',
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function mapObdSessionRow(row) {
  if (!row) {
    return null;
  }

  return repairBrokenTurkishText({
    id: row.id,
    vehicleId: row.vehicle_id,
    userId: row.user_id,
    connectionType: row.connection_type,
    adapterName: row.adapter_name || '',
    adapterIdentifier: row.adapter_identifier || '',
    protocol: row.protocol || '',
    status: row.status,
    startedAt: row.started_at || null,
    endedAt: row.ended_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function mapExpertiseReportRow(row) {
  if (!row) {
    return null;
  }

  return repairBrokenTurkishText({
    id: row.id,
    expertiseSessionId: row.expertise_session_id,
    vehicleId: row.vehicle_id,
    userId: row.user_id,
    healthScore: row.health_score ?? null,
    drivingScore: row.driving_score ?? null,
    dtcSummary: jsonParse(row.dtc_summary_json, []),
    sensorSummary: jsonParse(row.sensor_summary_json, []),
    riskSummary: jsonParse(row.risk_summary_json, []),
    comparisonSummary: jsonParse(row.comparison_summary_json, []),
    report: jsonParse(row.report_json, {}),
    createdAt: row.created_at,
  });
}

async function listGarageVehicleMedia(vehicleId) {
  return (await db
    .prepare('SELECT * FROM vehicle_media WHERE vehicle_id = ? ORDER BY sort_order ASC, created_at ASC')
    .all(vehicleId)).map(mapVehicleMediaRow);
}

async function getGarageVehicleRegistration(vehicleId) {
  return mapVehicleRegistrationRow(
    await db.prepare('SELECT * FROM vehicle_registrations WHERE vehicle_id = ?').get(vehicleId),
  );
}

async function getGarageVehicleChassis(vehicleId) {
  return mapVehicleChassisRow(
    await db.prepare('SELECT * FROM vehicle_chassis WHERE vehicle_id = ?').get(vehicleId),
  );
}

async function getLatestObdSession(vehicleId) {
  return mapObdSessionRow(
    await db
      .prepare('SELECT * FROM obd_sessions WHERE vehicle_id = ? ORDER BY created_at DESC LIMIT 1')
      .get(vehicleId),
  );
}

async function getLatestExpertiseReport(vehicleId) {
  return mapExpertiseReportRow(
    await db
      .prepare('SELECT * FROM expertise_reports WHERE vehicle_id = ? ORDER BY created_at DESC LIMIT 1')
      .get(vehicleId),
  );
}

async function hydrateGarageVehicleRow(row) {
  if (!row) {
    return null;
  }

  const [media, registration, chassis, latestObdSession, latestExpertiseReport] = await Promise.all([
    listGarageVehicleMedia(row.id),
    getGarageVehicleRegistration(row.id),
    getGarageVehicleChassis(row.id),
    getLatestObdSession(row.id),
    getLatestExpertiseReport(row.id),
  ]);

  const vehicle = repairBrokenTurkishText({
    id: row.id,
    userId: row.user_id,
    vehicleType: row.vehicle_type,
    brand: row.brand,
    model: row.model,
    generation: row.generation || '',
    year: row.year ?? null,
    trim: row.trim || '',
    engine: row.engine || '',
    fuelType: row.fuel_type || '',
    transmission: row.transmission || '',
    drivetrain: row.drivetrain || '',
    bodyType: row.body_type || '',
    marketRegion: row.market_region || '',
    color: row.color || '',
    plate: row.plate || '',
    plateDisplay: row.plate_is_hidden ? maskGaragePlate(row.plate) : row.plate || '',
    plateIsHidden: Boolean(row.plate_is_hidden),
    mileageKm: row.mileage_km ?? null,
    equipment: jsonParse(row.equipment_json, []),
    paintMap: jsonParse(row.paint_map_json, {}),
    showInProfile: Boolean(row.show_in_profile),
    isPrimary: Boolean(row.is_primary),
    obdConnectionStatus: row.obd_connection_status || 'not_connected',
    healthScore: row.health_score ?? null,
    drivingScore: row.driving_score ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    media,
    registration,
    chassis,
    latestObdSession,
    latestExpertiseReport,
  });

  vehicle.listingDefaults = buildGarageListingDefaults(vehicle);
  vehicle.canCreateListing = Boolean(vehicle.brand && vehicle.model);
  return vehicle;
}

async function countGarageVehiclesForUser(userId) {
  const row = await db
    .prepare('SELECT COUNT(*) AS count FROM garage_vehicles WHERE user_id = ?')
    .get(userId);
  return row?.count ?? 0;
}

async function ensureGaragePrimaryInvariant(userId, preferredVehicleId = null) {
  const primaryRows = await db
    .prepare(
      'SELECT id FROM garage_vehicles WHERE user_id = ? AND is_primary = ? ORDER BY updated_at DESC, created_at DESC',
    )
    .all(userId, toDbBoolean(true));

  if (primaryRows.length > 1) {
    const keepId =
      primaryRows.find((item) => item.id === preferredVehicleId)?.id || primaryRows[0].id;
    await db
      .prepare('UPDATE garage_vehicles SET is_primary = ? WHERE user_id = ? AND id != ?')
      .run(toDbBoolean(false), userId, keepId);
    return keepId;
  }

  if (primaryRows.length === 1) {
    return primaryRows[0].id;
  }

  const fallback =
    (preferredVehicleId &&
      (await db
        .prepare('SELECT id FROM garage_vehicles WHERE user_id = ? AND id = ?')
        .get(userId, preferredVehicleId))) ||
    (await db
      .prepare('SELECT id FROM garage_vehicles WHERE user_id = ? ORDER BY updated_at DESC, created_at DESC LIMIT 1')
      .get(userId));

  if (!fallback?.id) {
    return null;
  }

  await db
    .prepare('UPDATE garage_vehicles SET is_primary = ? WHERE id = ?')
    .run(toDbBoolean(true), fallback.id);
  return fallback.id;
}

async function syncLegacyVehicleJsonFromGarage(userId) {
  const primaryRow =
    (await db
      .prepare(
        'SELECT * FROM garage_vehicles WHERE user_id = ? ORDER BY is_primary DESC, updated_at DESC, created_at DESC LIMIT 1',
      )
      .get(userId)) || null;

  if (!primaryRow) {
    await db
      .prepare('UPDATE users SET vehicle_json = ?, updated_at = ? WHERE id = ?')
      .run(null, nowIso(), userId);
    return null;
  }

  const vehicle = await hydrateGarageVehicleRow(primaryRow);
  await db
    .prepare('UPDATE users SET vehicle_json = ?, updated_at = ? WHERE id = ?')
    .run(encryptJson(serializeLegacyVehicleFromGarageVehicle(vehicle)), nowIso(), userId);
  return vehicle;
}

async function ensureLegacyVehicleBackfill(userId, providedUser) {
  const existingCount = await countGarageVehiclesForUser(userId);
  if (existingCount > 0) {
    return;
  }

  const user = providedUser || (await getUserById(userId));
  if (!user) {
    return;
  }

  const legacyVehicle = parseVehicle(user);
  if (!legacyVehicle || typeof legacyVehicle !== 'object') {
    return;
  }

  const vehicleType =
    normalizeGarageText(
      legacyVehicle.vehicleType || legacyVehicle.type || legacyVehicle.category || '',
      120,
    ) || 'Otomobil';
  const brand = normalizeGarageText(legacyVehicle.brand || '', 120);
  const model = normalizeGarageText(legacyVehicle.model || '', 120);
  if (!brand || !model) {
    return;
  }

  const vehicleId = randomUUID();
  const timestamp = nowIso();

  await db.prepare(
    `INSERT INTO garage_vehicles (
      id, user_id, vehicle_type, brand, model, generation, year, trim, engine, fuel_type,
      transmission, drivetrain, equipment_json, body_type, market_region, color, plate,
      plate_is_hidden, mileage_km, paint_map_json, show_in_profile, is_primary,
      obd_connection_status, health_score, driving_score, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    vehicleId,
    userId,
    vehicleType,
    brand,
    model,
    normalizeGarageText(legacyVehicle.generation || '', 120) || null,
    normalizeGarageInteger(legacyVehicle.year),
    normalizeGarageText(legacyVehicle.packageName || legacyVehicle.trim || '', 120) || null,
    normalizeGarageText(legacyVehicle.engineVolume || legacyVehicle.engine || '', 120) || null,
    normalizeGarageText(legacyVehicle.fuelType || '', 80) || null,
    normalizeGarageText(legacyVehicle.transmission || '', 80) || null,
    normalizeGarageText(legacyVehicle.drivetrain || '', 80) || null,
    jsonStringify(normalizeGarageArray(legacyVehicle.equipment, [])),
    normalizeGarageText(legacyVehicle.bodyType || '', 120) || null,
    normalizeGarageText(legacyVehicle.marketRegion || '', 120) || null,
    normalizeGarageText(legacyVehicle.color || '', 120) || null,
    normalizeGaragePlate(
      legacyVehicle.plate || legacyVehicle.plateNumber || legacyVehicle.plateOrigin || '',
    ) || null,
    toDbBoolean(true),
    normalizeGarageInteger(legacyVehicle.mileageKm ?? legacyVehicle.mileage),
    jsonStringify(normalizeGarageObject(legacyVehicle.paintMap, {})),
    toDbBoolean(true),
    toDbBoolean(true),
    normalizeObdConnectionStatus(legacyVehicle.obdConnectionStatus),
    normalizeGarageInteger(legacyVehicle.healthScore),
    normalizeGarageInteger(legacyVehicle.driveScore),
    timestamp,
    timestamp,
  );

  const legacyMedia = extractLegacyVehicleMediaList(legacyVehicle);
  for (const [index, item] of legacyMedia.entries()) {
    await db.prepare(
      `INSERT INTO vehicle_media (
        id, vehicle_id, user_id, url, kind, mime_type, file_name, file_size, sort_order, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      randomUUID(),
      vehicleId,
      userId,
      item.url,
      item.kind,
      item.mimeType || null,
      item.fileName || null,
      item.fileSize ?? null,
      item.sortOrder ?? index,
      timestamp,
    );
  }
}

async function getGarageVehicleOwnedRow(userId, vehicleId) {
  await ensureLegacyVehicleBackfill(userId);
  const row = await db
    .prepare('SELECT * FROM garage_vehicles WHERE id = ? AND user_id = ?')
    .get(vehicleId, userId);

  if (!row) {
    const error = new Error('Arac bulunamadi.');
    error.statusCode = 404;
    throw error;
  }

  return row;
}

async function listGarageVehicles(userId) {
  await ensureLegacyVehicleBackfill(userId);
  const rows = await db
    .prepare(
      'SELECT * FROM garage_vehicles WHERE user_id = ? ORDER BY is_primary DESC, updated_at DESC, created_at DESC',
    )
    .all(userId);
  return Promise.all(rows.map((row) => hydrateGarageVehicleRow(row)));
}

async function getGarageVehicle(userId, vehicleId) {
  return hydrateGarageVehicleRow(await getGarageVehicleOwnedRow(userId, vehicleId));
}

async function buildGarageSnapshot(userId, providedUser) {
  await ensureLegacyVehicleBackfill(userId, providedUser);
  const vehicles = await listGarageVehicles(userId);
  const primaryVehicle = vehicles.find((item) => item.isPrimary) || vehicles[0] || null;
  return repairBrokenTurkishText({
    vehicles,
    totalVehicles: vehicles.length,
    primaryVehicleId: primaryVehicle?.id || null,
  });
}

async function countFollowers(userId) {
  const row = await db
    .prepare('SELECT COUNT(*) AS count FROM follows WHERE followed_user_id = ?')
    .get(userId);
  return row?.count ?? 0;
}

async function countFollowing(userId) {
  const row = await db
    .prepare('SELECT COUNT(*) AS count FROM follows WHERE follower_user_id = ?')
    .get(userId);
  return row?.count ?? 0;
}

async function getFollowingHandles(userId) {
  const rows = await db
    .prepare(
      `SELECT u.handle
       FROM follows f
       JOIN users u ON u.id = f.followed_user_id
       WHERE f.follower_user_id = ?`,
    )
    .all(userId);

  return rows.map((row) => row.handle);
}

async function buildDirectoryUsers(currentUserId) {
  const rows = await db
    .prepare(
      `SELECT id, name, handle, bio, avatar_uri, cover_uri
       FROM users
       WHERE id != ?
       ORDER BY updated_at DESC, created_at DESC`,
    )
    .all(currentUserId);

  return repairBrokenTurkishText(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      handle: row.handle,
      note: row.bio || 'Profil bilgisi paylasilmadı.',
      avatarUri: row.avatar_uri ?? undefined,
      coverUri: row.cover_uri ?? undefined,
    })),
  );
}

async function countPostsForUser(userId) {
  const row = await db
    .prepare('SELECT COUNT(*) AS count FROM posts WHERE author_user_id = ?')
    .get(userId);
  return row?.count ?? 0;
}

async function countSoldListings(userId) {
  const rows = await db.prepare("SELECT listing_json FROM posts WHERE author_user_id = ? AND type = 'listing'").all(userId);
  return rows.reduce((count, row) => {
    const listing = jsonParse(row.listing_json, undefined);
    return listing?.isSold ? count + 1 : count;
  }, 0);
}

async function getReactionCount(postId, kind) {
  return ((await db.prepare('SELECT COUNT(*) AS count FROM post_reactions WHERE post_id = ? AND kind = ?').get(postId, kind)
    ?.count) ?? 0);
}

async function hasReaction(userId, postId, kind) {
  const row = await db
    .prepare('SELECT 1 AS ok FROM post_reactions WHERE user_id = ? AND post_id = ? AND kind = ?')
    .get(userId, postId, kind);

  return Boolean(
    row?.ok,
  );
}

async function getListingEventCount(postId, kind) {
  return ((await db.prepare('SELECT COUNT(*) AS count FROM listing_events WHERE post_id = ? AND kind = ?').get(postId, kind)
    ?.count) ?? 0);
}

async function getPostComments(postId) {
  const rows = await db
    .prepare(
      `SELECT c.*, u.name AS author_name, u.handle, u.avatar_uri
       FROM comments c
       JOIN users u ON u.id = c.author_user_id
       WHERE c.post_id = ?
       ORDER BY c.created_at ASC`,
    )
    .all(postId);

  return rows.map((row) => ({
      id: row.id,
      authorName: row.author_name,
      handle: row.handle,
      authorAvatarUri: row.avatar_uri ?? undefined,
      content: row.content,
      time: formatFeedTime(row.created_at),
    }));
}

async function hydrateListing(row) {
  const listing = jsonParse(row.listing_json, undefined);
  if (!listing) {
    return undefined;
  }

  const compliance = await getListingCompliance(row.id);
  const complianceStatus = compliance?.listing_compliance_status || 'published';
  const reviewRequiredReason = compliance?.review_required_reason || undefined;
  const isVisibleStatus = complianceStatus === 'published';
  const complianceBadges = [];

  if (complianceStatus === 'submitted') {
    complianceBadges.push('Incelemede');
  }
  if (complianceStatus === 'restricted') {
    complianceBadges.push('Ek dogrulama gerekli');
  }
  if (compliance?.duplicate_plate_flag) {
    complianceBadges.push('Plaka kontrolu');
  }

  return {
    ...listing,
    listingLink: listing.listingLink || makeShareLink(row.id, 'listing'),
    stats: {
      views: await getListingEventCount(row.id, 'view'),
      saves: await getReactionCount(row.id, 'save'),
      shares: await getListingEventCount(row.id, 'share'),
      messages: await getListingEventCount(row.id, 'message'),
      calls: await getListingEventCount(row.id, 'call'),
    },
    showExpertiz: listing.showExpertiz ?? true,
    factorySpecs: Array.isArray(listing.factorySpecs) ? listing.factorySpecs : [],
    reportHighlights: Array.isArray(listing.reportHighlights) ? listing.reportHighlights : [],
    specTable: Array.isArray(listing.specTable) ? listing.specTable : [],
    conditionTable: Array.isArray(listing.conditionTable) ? listing.conditionTable : [],
    equipment: Array.isArray(listing.equipment) ? listing.equipment : [],
    extraEquipment: listing.extraEquipment ?? '',
    complianceStatus,
    authorizationStatus: compliance?.authorization_status || undefined,
    eidsStatus: compliance?.eids_status || undefined,
    riskScore: Number(compliance?.risk_score || 0),
    riskLevel: compliance?.risk_level || 'low',
    reviewRequiredReason,
    duplicatePlateFlag: Boolean(compliance?.duplicate_plate_flag),
    abnormalPriceFlag: Boolean(compliance?.abnormal_price_flag),
    spamContentFlag: Boolean(compliance?.spam_content_flag),
    billingStatus: compliance?.billing_status || 'not_required',
    badges: [...(Array.isArray(listing.badges) ? listing.badges : []), ...complianceBadges].filter(
      (value, index, array) => array.indexOf(value) === index,
    ),
    isVisibleStatus,
  };
}

function canViewerSeeListing(row, listing, viewerUserId) {
  if (row.type !== 'listing') {
    return true;
  }

  if (row.author_user_id === viewerUserId) {
    return true;
  }

  return listing?.complianceStatus === 'published' || !listing?.complianceStatus;
}

async function buildListingConversationContext(postId) {
  if (!postId) {
    return undefined;
  }

  const postRow = await db.prepare('SELECT * FROM posts WHERE id = ?').get(postId);
  if (!postRow) {
    return undefined;
  }

  const listing = await hydrateListing(postRow);
  if (!listing) {
    return undefined;
  }

  const author = await getUserById(postRow.author_user_id);
  const media = jsonParse(postRow.media_json, []);
  const previewMedia = Array.isArray(media)
    ? media.find(
        (item) =>
          item?.uri &&
          (item.kind === 'image' || item.kind === 'report' || item.kind === 'video'),
      )
    : undefined;

  return {
    postId: postRow.id,
    title: listing.title,
    price: listing.price,
    location: listing.location,
    summaryLine: listing.summaryLine,
    sellerHandle: listing.sellerHandle || author?.handle || '',
    sellerName: listing.sellerName || author?.name || '',
    previewImageUri: previewMedia?.uri ?? undefined,
  };
}

async function getRepostSource(postId) {
  const row = await db.prepare('SELECT * FROM posts WHERE id = ?').get(postId);
  if (!row) {
    return undefined;
  }

  const author = await getUserById(row.author_user_id);
  if (!author) {
    return undefined;
  }

  return {
    id: row.id,
    authorName: author.name,
    handle: author.handle,
    authorAvatarUri: author.avatar_uri ?? undefined,
    content: row.content,
    media: jsonParse(row.media_json, []),
    listing: await hydrateListing(row),
    type: row.type,
  };
}

async function mapPostRow(row, currentUserId) {
  const author = await getUserById(row.author_user_id);
  if (!author) {
    return null;
  }

  const listing = await hydrateListing(row);
  if (!canViewerSeeListing(row, listing, currentUserId)) {
    return null;
  }

  const comments = await getPostComments(row.id);

  return {
    id: row.id,
    authorName: author.name,
    handle: author.handle,
    role: author.bio || 'Profil bilgisi paylasilmadı.',
    time: formatFeedTime(row.created_at),
    createdAt: row.created_at,
    authorAvatarUri: author.avatar_uri ?? undefined,
    content: row.content,
    hashtags: jsonParse(row.hashtags_json, []),
    media: jsonParse(row.media_json, []),
    likes: await getReactionCount(row.id, 'like'),
    comments: comments.length,
    reposts: (
      await db.prepare('SELECT COUNT(*) AS count FROM posts WHERE repost_source_id = ?').get(row.id)
    )?.count ?? 0,
    shares: await getListingEventCount(row.id, 'share'),
    views: await getListingEventCount(row.id, 'view'),
    type: row.type,
    likedByUser: await hasReaction(currentUserId, row.id, 'like'),
    savedByUser: await hasReaction(currentUserId, row.id, 'save'),
    repostedByUser: Boolean(
      (
        await db.prepare('SELECT 1 AS ok FROM posts WHERE author_user_id = ? AND repost_source_id = ?')
          .get(currentUserId, row.id)
      )?.ok,
    ),
    listing,
    commentList: comments,
    repostOf: row.repost_source_id ? await getRepostSource(row.repost_source_id) : undefined,
    repostSourceId: row.repost_source_id ?? undefined,
    shareLink: makeShareLink(row.id, row.type),
    lastEditedAt: row.updated_at !== row.created_at ? row.updated_at : undefined,
  };
}

async function buildRelationshipUsers(userId, mode) {
  const rows = await db
    .prepare(
      mode === 'followers'
        ? `SELECT u.id, u.name, u.handle, u.bio, u.avatar_uri, u.cover_uri
           FROM follows f
           JOIN users u ON u.id = f.follower_user_id
           WHERE f.followed_user_id = ?
           ORDER BY f.created_at DESC`
        : `SELECT u.id, u.name, u.handle, u.bio, u.avatar_uri, u.cover_uri
           FROM follows f
           JOIN users u ON u.id = f.followed_user_id
           WHERE f.follower_user_id = ?
           ORDER BY f.created_at DESC`,
    )
    .all(userId);

  return repairBrokenTurkishText(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      handle: row.handle,
      note: row.bio || 'Profil bilgisi paylasilmadı.',
      avatarUri: row.avatar_uri ?? undefined,
      coverUri: row.cover_uri ?? undefined,
      profileLink: makeProfileLink(row.handle),
    })),
  );
}

async function getPublicPostById(postId) {
  const row = await db.prepare('SELECT * FROM posts WHERE id = ?').get(postId);
  if (!row) {
    return null;
  }

  return await mapPostRow(row, '__public__');
}

async function getPublicListingById(postId) {
  const post = await getPublicPostById(postId);
  if (!post || post.type !== 'listing' || !post.listing) {
    return null;
  }

  return post;
}

async function getPublicProfileByHandle(handle) {
  const user = await getUserByHandle(normalizeHandle(handle));
  if (!user) {
    return null;
  }

  const postRows = await db
    .prepare('SELECT * FROM posts WHERE author_user_id = ? ORDER BY created_at DESC')
    .all(user.id);
  const posts = (
    await Promise.all(postRows.map((row) => mapPostRow(row, '__public__')))
  ).filter(Boolean);

  return repairBrokenTurkishText({
    profile: {
      id: user.id,
      name: user.name,
      handle: user.handle,
      bio: user.bio,
      followers: await countFollowers(user.id),
      following: await countFollowing(user.id),
      posts: await countPostsForUser(user.id),
      soldListings: await countSoldListings(user.id),
      verified: Boolean(user.verified),
      avatarUri: user.avatar_uri ?? undefined,
      coverUri: user.cover_uri ?? undefined,
      profileLink: makeProfileLink(user.handle),
    },
    posts: posts.filter((post) => post.type === 'standard'),
    listings: posts.filter((post) => post.type === 'listing'),
    followers: await buildRelationshipUsers(user.id, 'followers'),
    following: await buildRelationshipUsers(user.id, 'following'),
  });
}

async function getConversationParticipantRows(conversationId) {
  return await db
    .prepare(
      `SELECT u.id, u.name, u.handle, u.avatar_uri
       FROM conversation_participants cp
       JOIN users u ON u.id = cp.user_id
       WHERE cp.conversation_id = ?`,
    )
    .all(conversationId);
}

async function getListingTransaction(conversationId) {
  return ((await db.prepare('SELECT * FROM listing_transactions WHERE conversation_id = ?').get(conversationId)) ?? null);
}

async function getLatestSaleProcessForParticipant(listingId, userId) {
  return (
    (await db
      .prepare(
        `SELECT *
         FROM sale_processes
         WHERE listing_id = ?
           AND (buyer_user_id = ? OR seller_user_id = ?)
         ORDER BY created_at DESC
         LIMIT 1`,
      )
      .get(listingId, userId, userId)) ?? null
  );
}

function mapSaleProcessSummary(row, listingId) {
  if (!row) {
    return undefined;
  }

  const guidanceEnabled = isFeatureEnabled('enableSafePaymentGuidance');
  return {
    id: row.id,
    listingId,
    buyerUserId: row.buyer_user_id,
    sellerUserId: row.seller_user_id,
    status: row.status,
    safePaymentInfoAcceptedAt: row.safe_payment_info_accepted_at || undefined,
    safePaymentReferenceCode: row.safe_payment_reference_code || undefined,
    safePaymentProviderName: row.safe_payment_provider_name || undefined,
    safePaymentStatusNote:
      row.safe_payment_status_note ||
      'Resmi guvenli odeme sureci takip edilmelidir. Platform resmi odeme saglayicisi degildir.',
    guidanceEnabled,
    requiresGuidanceAcknowledgement:
      guidanceEnabled && !row.safe_payment_info_accepted_at,
  };
}

async function ensureListingTransaction(conversationId, postId, buyerUserId, sellerUserId) {
  const existing = await getListingTransaction(conversationId);
  if (existing) {
    return existing;
  }

  const timestamp = nowIso();
  await db.prepare(
    `INSERT INTO listing_transactions (
      conversation_id, post_id, buyer_user_id, seller_user_id, registration_json, registration_shared_at,
      insurance_quote_amount, payment_status, payment_reference, payment_requested_at, payment_paid_at,
      policy_uri, policy_sent_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, NULL, NULL, NULL, 'missing', NULL, NULL, NULL, NULL, NULL, ?, ?)`,
  ).run(conversationId, postId, buyerUserId, sellerUserId, timestamp, timestamp);

  return await getListingTransaction(conversationId);
}

async function getHiddenMessageIds(userId, conversationId) {
  const rows = await db
      .prepare(
        `SELECT mhu.message_id
         FROM message_hidden_for_users mhu
         JOIN messages m ON m.id = mhu.message_id
         WHERE mhu.user_id = ? AND m.conversation_id = ?`,
      )
      .all(userId, conversationId);

  return new Set(rows.map((row) => row.message_id));
}

async function getConversationMessageRow(conversationId, messageId) {
  return (
    (await db
      .prepare('SELECT * FROM messages WHERE id = ? AND conversation_id = ?')
      .get(messageId, conversationId)) ?? null
  );
}

async function mapConversationRow(row, currentUserId) {
  const participants = await getConversationParticipantRows(row.id);
  const hiddenMessageIds = await getHiddenMessageIds(currentUserId, row.id);
  const messages = (await db
    .prepare(
      `SELECT m.*, u.name AS sender_name, u.handle AS sender_handle
       FROM messages m
       JOIN users u ON u.id = m.sender_user_id
       WHERE m.conversation_id = ?
       ORDER BY m.created_at ASC`,
    )
    .all(row.id))
    .filter((message) => !hiddenMessageIds.has(message.id))
    .map((message) => ({
      id: message.id,
      senderHandle: message.sender_handle,
      senderName: message.sender_name,
      text: message.deleted_for_everyone_at ? 'Bu mesaj silindi.' : decryptText(message.text, ''),
      attachments: message.deleted_for_everyone_at
        ? []
        : repairBrokenTurkishText(
            decryptJson(message.attachments_json, jsonParse(message.attachments_json, [])),
          ),
      time: formatMessageTime(message.created_at),
      isMine: message.sender_user_id === currentUserId,
      editedAt: message.edited_at || undefined,
      isDeletedForEveryone: Boolean(message.deleted_for_everyone_at),
      canEdit:
        message.sender_user_id === currentUserId &&
        !message.deleted_for_everyone_at &&
        !decryptJson(message.attachments_json, jsonParse(message.attachments_json, [])).length,
      canDeleteForEveryone:
        message.sender_user_id === currentUserId && !message.deleted_for_everyone_at,
    }));

  const lastMessage = messages[messages.length - 1];
  const directOther =
    row.type === 'direct' || row.type === 'listing'
      ? participants.find((item) => item.id !== currentUserId)
      : undefined;
  const listingContext =
    row.type === 'listing' ? await buildListingConversationContext(row.context_post_id) : undefined;
  const myRole =
    row.type === 'listing'
      ? currentUserId === row.seller_user_id
        ? 'seller'
        : currentUserId === row.buyer_user_id
          ? 'buyer'
          : undefined
      : undefined;
  const buyerAgreed = Boolean(row.buyer_agreed_at);
  const sellerAgreed = Boolean(row.seller_agreed_at);
  const listingTransaction =
    row.type === 'listing'
      ? await ensureListingTransaction(row.id, row.context_post_id, row.buyer_user_id, row.seller_user_id)
      : null;
  const saleProcess =
    row.type === 'listing' && row.context_post_id
      ? mapSaleProcessSummary(
          await getLatestSaleProcessForParticipant(row.context_post_id, currentUserId),
          row.context_post_id,
        )
      : undefined;

  return {
    id: row.id,
    type: row.type,
    name: row.type === 'group' || row.type === 'listing' ? row.name : directOther?.name || row.name,
    handle: row.type === 'group' ? row.handle : directOther?.handle || row.handle,
    unread: 0,
    isOnline: false,
    lastMessage: lastMessage?.text || 'Henüz mesaj yok.',
    lastSeen: formatMessageTime(lastMessage ? nowIso() : row.created_at),
    participantHandles: participants.map((item) => item.handle),
    participantNames: participants.map((item) => item.name),
    avatarUri: directOther?.avatar_uri ?? undefined,
    messages,
    listingContext,
    agreement:
      row.type === 'listing' && myRole
        ? {
            buyerAgreed,
            sellerAgreed,
            myRole,
            myAgreed: myRole === 'seller' ? sellerAgreed : buyerAgreed,
            counterpartyAgreed: myRole === 'seller' ? buyerAgreed : sellerAgreed,
          }
        : undefined,
      insuranceStatus:
        row.type === 'listing'
          ? {
              registrationSharedAt: listingTransaction?.registration_shared_at ?? undefined,
              paymentStatus: listingTransaction?.payment_status ?? 'missing',
              quoteAmount: listingTransaction?.insurance_quote_amount ?? undefined,
              registrationInfo:
                listingTransaction?.registration_json
                  ? decryptJson(
                      listingTransaction.registration_json,
                      jsonParse(listingTransaction.registration_json, undefined),
                    )
                  : undefined,
              policyUri: listingTransaction?.policy_uri ?? undefined,
              invoiceUri: listingTransaction?.invoice_uri ?? undefined,
              policySentAt: listingTransaction?.policy_sent_at ?? undefined,
              invoiceSentAt: listingTransaction?.invoice_sent_at ?? undefined,
            }
          : undefined,
      saleProcess,
    };
  }

async function ensureConversationAccess(userId, conversationId) {
  const access = await db
    .prepare('SELECT 1 AS ok FROM conversation_participants WHERE conversation_id = ? AND user_id = ?')
    .get(conversationId, userId);

  if (!access) {
    const error = new Error('Bu sohbete erisim izniniz yok.');
    error.statusCode = 403;
    throw error;
  }
}

async function getSystemUserByHandle(handle = '@carloi') {
  return (
    (await db
      .prepare('SELECT * FROM users WHERE handle = ? LIMIT 1')
      .get(handle)) ?? null
  );
}

async function ensureSystemConversationSender() {
  let systemUser = await getSystemUserByHandle('@carloi');
  if (systemUser) {
    return systemUser;
  }

  const userId = randomUUID();
  const timestamp = nowIso();
  const storedEmail = makeInternalEmail(userId);
  const storedPhone = makeInternalPhone(userId);

  await db.prepare(
    `INSERT INTO users (
      id, name, handle, bio, email, phone, email_lookup, phone_lookup, password_hash,
      verified, settings_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    userId,
    'Carloi',
    '@carloi',
    'Platform system account',
    encryptText(storedEmail),
    encryptText(storedPhone),
    makeLookupHash(storedEmail),
    makeLookupHash(storedPhone),
    hashPassword(randomUUID()),
    1,
    encryptJson({
      ...defaultSettings,
      email: '',
      phone: '',
      legalFullName: 'Carloi',
    }),
    timestamp,
    timestamp,
  );

  systemUser = await getSystemUserByHandle('@carloi');
  return systemUser;
}

async function appendSystemConversationMessage(conversationId, text, attachments = []) {
  const conversation = await db
    .prepare('SELECT id FROM conversations WHERE id = ? LIMIT 1')
    .get(conversationId);

  if (!conversation) {
    const error = new Error('Sohbet bulunamadi.');
    error.statusCode = 404;
    throw error;
  }

  const systemUser = await ensureSystemConversationSender();
  if (!systemUser) {
    const error = new Error('Sistem kullanicisi hazirlanamadi.');
    error.statusCode = 500;
    throw error;
  }

  await db
    .prepare(
      'INSERT OR IGNORE INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)',
    )
    .run(conversationId, systemUser.id);

  await db.prepare(
    'INSERT INTO messages (id, conversation_id, sender_user_id, text, attachments_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(
    randomUUID(),
    conversationId,
    systemUser.id,
    encryptText(String(text || '').trim()),
    encryptJson(Array.isArray(attachments) ? attachments : []),
    nowIso(),
  );
}

async function bootstrapSnapshot(userId, sessionToken) {
  const user = await getUserById(userId);
  if (!user) {
    const error = new Error('Kullanıcı bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  await ensureDefaultAiMessages(userId);
  const commercial = await getCommercialStatusSummary(userId);
  const adminRoleKeys = await listAdminRoleKeysForUser(userId);
  const adminPermissions = getEffectivePermissions(adminRoleKeys);

  return repairBrokenTurkishText({
    auth: {
      isRegistered: true,
      isAuthenticated: true,
      email: sanitizeStoredEmail(user.email),
      phone: sanitizeStoredPhone(user.phone),
      passwordHash: '',
      sessionToken,
    },
    profile: {
      name: user.name,
      handle: user.handle,
      bio: user.bio,
      followers: await countFollowers(userId),
      following: await countFollowing(userId),
      posts: await countPostsForUser(userId),
      soldListings: await countSoldListings(userId),
      verified: Boolean(user.verified),
      avatarUri: user.avatar_uri ?? undefined,
      coverUri: user.cover_uri ?? undefined,
      followingHandles: await getFollowingHandles(userId),
    },
    vehicle: parseVehicle(user),
    garage: await buildGarageSnapshot(userId, user),
    settings: parseSettings(user),
    posts: (await Promise.all(
      (await db.prepare('SELECT * FROM posts ORDER BY created_at DESC').all()).map((row) =>
        mapPostRow(row, userId),
      ),
    )).filter(Boolean),
    conversations: await Promise.all(
      (await db
        .prepare(
          `SELECT c.*
           FROM conversations c
           JOIN conversation_participants cp ON cp.conversation_id = c.id
           WHERE cp.user_id = ?
           ORDER BY c.created_at DESC`,
        )
        .all(userId)).map((row) => mapConversationRow(row, userId)),
    ),
    aiMessages: (await db
      .prepare('SELECT * FROM ai_messages WHERE user_id = ? ORDER BY created_at ASC')
      .all(userId))
      .map((row) => ({
        id: row.id,
        role: row.role,
        content: decryptText(row.content, ''),
        provider: row.provider || 'fallback',
        editedAt: row.edited_at || undefined,
        canEdit: row.role === 'user',
        relatedPostIds: repairBrokenTurkishText(
          decryptJson(row.related_post_ids_json, jsonParse(row.related_post_ids_json, [])),
        ),
      })),
    profileSegment: user.profile_segment || defaultProfileSegment,
    directoryUsers: await buildDirectoryUsers(userId),
    commercial,
    admin: {
      isAdmin: adminRoleKeys.length > 0,
      roleKeys: adminRoleKeys,
      permissions: adminPermissions,
    },
  });
}

async function requireUniqueUser(handle, email, phone, excludeUserId) {
  const conditions = ['handle = ?'];
  const params = [handle];
  const emailLookup = email ? makeLookupHash(email) : '';
  const phoneLookup = phone ? makeLookupHash(phone) : '';

  if (email) {
    conditions.push('email_lookup = ?');
    params.push(emailLookup);
  }
  if (phone) {
    conditions.push('phone_lookup = ?');
    params.push(phoneLookup);
  }

  const rows = await db
    .prepare(
      `SELECT id, handle, email_lookup, phone_lookup
       FROM users
       WHERE (${conditions.join(' OR ')})
       ${excludeUserId ? 'AND id != ?' : ''}`,
    )
    .all(...(excludeUserId ? [...params, excludeUserId] : params));

  if (!rows.length) {
    return;
  }

  if (rows.some((row) => row.handle === handle)) {
    const error = new Error('Bu kullanıcı adı zaten kullanılıyor.');
    error.statusCode = 409;
    throw error;
  }
  if (email && rows.some((row) => row.email_lookup === emailLookup)) {
    const error = new Error('Bu e-posta zaten kayitli.');
    error.statusCode = 409;
    throw error;
  }

  if (!phone) {
    return;
  }

  const error = new Error('Bu telefon numarasi zaten kayitli.');
  error.statusCode = 409;
  throw error;
}

async function createSession(userId) {
  const token = makeSessionToken(userId);
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + config.sessionTtlDays * 86_400_000).toISOString();

  await db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  await db.prepare(
    'INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
  ).run(hashSessionToken(token), userId, createdAt, expiresAt);

  return token;
}

async function getUserFromToken(token) {
  if (!token) {
    return null;
  }

  const session = await db
    .prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > ?')
    .get(hashSessionToken(token), nowIso());

  if (!session) {
    return null;
  }

  return await getUserById(session.user_id);
}

function makeSecureToken() {
  return randomBytes(32).toString('base64url');
}

function hashAuthToken(rawToken) {
  return createHash('sha256').update(String(rawToken || '').trim()).digest('hex');
}

function maskRawToken(rawToken) {
  const normalized = String(rawToken || '').trim();
  if (!normalized) {
    return '';
  }

  if (normalized.length <= 8) {
    return `${normalized.slice(0, 2)}***${normalized.slice(-2)}`;
  }

  return `${normalized.slice(0, 4)}***${normalized.slice(-4)}`;
}

async function invalidateAuthTokens({ userId, type }) {
  await db
    .prepare(
      `UPDATE auth_tokens
       SET consumed_at = COALESCE(consumed_at, ?)
       WHERE user_id = ?
         AND type = ?
         AND consumed_at IS NULL`,
    )
    .run(nowIso(), userId, type);
}

async function getLatestActiveAuthToken({ userId, type }) {
  return (
    (await db
      .prepare(
        `SELECT *
         FROM auth_tokens
         WHERE user_id = ?
           AND type = ?
           AND consumed_at IS NULL
         ORDER BY created_at DESC
         LIMIT 1`,
      )
      .get(userId, type)) ?? null
  );
}

async function createAuthToken({ userId, type, ttlMs }) {
  const token = makeSecureToken();
  const now = nowIso();
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();

  await invalidateAuthTokens({ userId, type });
  await db
    .prepare(
      `INSERT INTO auth_tokens (
        id, user_id, type, token_hash, expires_at, consumed_at, created_at
      ) VALUES (?, ?, ?, ?, ?, NULL, ?)`,
    )
    .run(randomUUID(), userId, type, hashAuthToken(token), expiresAt, now);

  console.info(`${AUTH_TOKEN_LOG_PREFIX} created`, {
    type,
    userIdSuffix: String(userId || '').slice(-6),
    tokenPreview: maskRawToken(token),
    expiresAt,
  });

  return {
    token,
    expiresAt,
  };
}

async function consumeAuthToken({ rawToken, type }) {
  const normalizedToken = String(rawToken || '').trim();
  if (!normalizedToken) {
    const error = new Error('Gecersiz veya eksik token.');
    error.statusCode = 400;
    throw error;
  }

  const tokenHash = hashAuthToken(normalizedToken);
  const row = await db
    .prepare(
      `SELECT *
       FROM auth_tokens
       WHERE token_hash = ?
         AND type = ?
       LIMIT 1`,
    )
    .get(tokenHash, type);

  if (!row) {
    console.warn(`${AUTH_TOKEN_LOG_PREFIX} missing`, {
      type,
      tokenPreview: maskRawToken(normalizedToken),
    });
    const error = new Error('Token gecersiz veya suresi dolmus.');
    error.statusCode = 400;
    throw error;
  }

  if (row.consumed_at) {
    console.warn(`${AUTH_TOKEN_LOG_PREFIX} already-consumed`, {
      type,
      tokenPreview: maskRawToken(normalizedToken),
      userIdSuffix: String(row.user_id || '').slice(-6),
    });
    const error = new Error('Token daha once kullanilmis.');
    error.statusCode = 400;
    throw error;
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    console.warn(`${AUTH_TOKEN_LOG_PREFIX} expired`, {
      type,
      tokenPreview: maskRawToken(normalizedToken),
      userIdSuffix: String(row.user_id || '').slice(-6),
      expiresAt: row.expires_at,
    });
    const error = new Error('Token gecersiz veya suresi dolmus.');
    error.statusCode = 400;
    throw error;
  }

  await db.prepare('UPDATE auth_tokens SET consumed_at = ? WHERE id = ?').run(nowIso(), row.id);

  console.info(`${AUTH_TOKEN_LOG_PREFIX} consumed`, {
    type,
    userIdSuffix: String(row.user_id || '').slice(-6),
    tokenPreview: maskRawToken(normalizedToken),
  });

  return row;
}

async function createVerificationRequest({ channel, destination, purpose = 'signup' }) {
  const normalizedDestination =
    channel === 'email' ? normalizeEmail(destination) : normalizePhone(destination);

  if (!normalizedDestination) {
    const error = new Error(
      channel === 'email' ? 'Geçerli bir e-posta girin.' : 'Geçerli bir telefon numarası girin.',
    );
    error.statusCode = 400;
    throw error;
  }

  if (purpose === 'signup' && (await getUserByIdentifier(normalizedDestination))) {
    const error = new Error(
      channel === 'email'
        ? 'Bu e-posta adresi zaten kayıtlı.'
        : 'Bu telefon numarası zaten kayıtlı.',
    );
    error.statusCode = 409;
    throw error;
  }

  await db.prepare('DELETE FROM verification_codes WHERE destination_lookup = ? AND purpose = ?').run(
    makeLookupHash(normalizedDestination),
    purpose,
  );

  const verificationId = randomUUID();
  const code = makeVerificationCode();
  if (!isSixDigitVerificationCode(code)) {
    const error = new Error('Uretilen dogrulama kodu gecersiz. Lutfen tekrar deneyin.');
    error.statusCode = 500;
    throw error;
  }
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();

  await db.prepare(
    `INSERT INTO verification_codes (
      id, channel, purpose, destination, destination_lookup, code_hash, attempts, expires_at, consumed_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, NULL, ?)`,
  ).run(
    verificationId,
    channel,
    purpose,
    encryptText(normalizedDestination),
    makeLookupHash(normalizedDestination),
    hashVerificationCode(verificationId, code),
    expiresAt,
    createdAt,
  );

  console.info(`${VERIFICATION_LOG_PREFIX} code-created`, {
    channel,
    purpose,
    destination: maskVerificationDestination(channel, normalizedDestination),
    codeLength: code.length,
    expiresAt,
    verificationIdSuffix: verificationId.slice(-6),
  });

  return { verificationId, code, expiresAt, destination: normalizedDestination };
}

async function consumeVerificationRequest(
  {
    verificationId,
    verificationCode,
    channel,
    destination,
    purpose = 'signup',
  }
) {
  const row = await db.prepare('SELECT * FROM verification_codes WHERE id = ?').get(verificationId);
  if (!row) {
    console.warn(`${VERIFICATION_LOG_PREFIX} consume-missing-request`, {
      channel,
      purpose,
      verificationIdSuffix: String(verificationId || '').slice(-6),
    });
    const error = new Error('Doğrulama kodu bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  if (row.channel !== channel || row.purpose !== purpose) {
    console.warn(`${VERIFICATION_LOG_PREFIX} consume-purpose-mismatch`, {
      channel,
      purpose,
      verificationIdSuffix: String(verificationId || '').slice(-6),
      storedChannel: row.channel,
      storedPurpose: row.purpose,
    });
    const error = new Error('Doğrulama isteği bu işlem için geçerli değil.');
    error.statusCode = 400;
    throw error;
  }

  if (row.consumed_at) {
    console.warn(`${VERIFICATION_LOG_PREFIX} consume-already-used`, {
      channel,
      purpose,
      verificationIdSuffix: String(verificationId || '').slice(-6),
    });
    const error = new Error('Bu doğrulama kodu daha önce kullanıldı.');
    error.statusCode = 400;
    throw error;
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    console.warn(`${VERIFICATION_LOG_PREFIX} consume-expired`, {
      channel,
      purpose,
      verificationIdSuffix: String(verificationId || '').slice(-6),
      expiresAt: row.expires_at,
    });
    const error = new Error('Doğrulama kodunun süresi doldu.');
    error.statusCode = 400;
    throw error;
  }

  if ((row.attempts ?? 0) >= 5) {
    console.warn(`${VERIFICATION_LOG_PREFIX} consume-attempt-limit`, {
      channel,
      purpose,
      verificationIdSuffix: String(verificationId || '').slice(-6),
      attempts: row.attempts ?? 0,
    });
    const error = new Error('Bu doğrulama isteği için deneme hakkı doldu.');
    error.statusCode = 429;
    throw error;
  }

  if (!isSixDigitVerificationCode(verificationCode)) {
    console.warn(`${VERIFICATION_LOG_PREFIX} consume-invalid-code-format`, {
      channel,
      purpose,
      verificationIdSuffix: String(verificationId || '').slice(-6),
      codeLength: String(verificationCode || '').trim().length,
    });
    const error = new Error('Dogrulama kodu 6 haneli sayisal olmalidir.');
    error.statusCode = 400;
    throw error;
  }

  const normalizedDestination =
    channel === 'email' ? normalizeEmail(destination) : normalizePhone(destination);
  const storedDestination = decryptText(row.destination, '');

  if (
    storedDestination !== normalizedDestination ||
    !verifyCodeHash(verificationId, verificationCode, row.code_hash)
  ) {
    await db.prepare('UPDATE verification_codes SET attempts = attempts + 1 WHERE id = ?').run(
      verificationId,
    );

    console.warn(`${VERIFICATION_LOG_PREFIX} consume-invalid-code`, {
      channel,
      purpose,
      destination: maskVerificationDestination(channel, normalizedDestination),
      verificationIdSuffix: String(verificationId || '').slice(-6),
      codeLength: String(verificationCode || '').trim().length,
      attempts: (row.attempts ?? 0) + 1,
    });

    const error = new Error('Doğrulama kodu hatalı.');
    error.statusCode = 400;
    throw error;
  }

  await db.prepare('UPDATE verification_codes SET consumed_at = ? WHERE id = ?').run(nowIso(), verificationId);
  console.info(`${VERIFICATION_LOG_PREFIX} consume-success`, {
    channel,
    purpose,
    destination: maskVerificationDestination(channel, normalizedDestination),
    verificationIdSuffix: String(verificationId || '').slice(-6),
  });
  return normalizedDestination;
}

async function consumeVerificationRequestByDestination(
  {
    verificationCode,
    channel,
    destination,
    purpose = 'email_verification',
  }
) {
  const row = await getLatestVerificationRequestByDestination({
    channel,
    destination,
    purpose,
  });

  if (!row) {
    const error = new Error('Doğrulama kodu bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  return await consumeVerificationRequest({
    verificationId: row.id,
    verificationCode,
    channel,
    destination,
    purpose,
  });
}

async function issueEmailVerificationCode(email) {
  const request = await createVerificationRequest({
    channel: 'email',
    destination: email,
    purpose: 'email_verification',
  });

  let delivery;
  try {
    delivery = await sendVerificationCode({
      channel: 'email',
      destination: request.destination,
      code: request.code,
    });
  } catch (cause) {
    await db.prepare('DELETE FROM verification_codes WHERE id = ?').run(request.verificationId);
    console.error(`${VERIFICATION_LOG_PREFIX} delivery-failed`, {
      channel: 'email',
      purpose: 'email_verification',
      destination: maskVerificationDestination('email', request.destination),
      codeLength: String(request.code || '').length,
      verificationIdSuffix: String(request.verificationId || '').slice(-6),
      errorMessage: cause?.message || 'unknown',
    });
    throw createVerificationMailDeliveryError(cause);
  }

  return {
    verificationId: request.verificationId,
    expiresAt: request.expiresAt,
    maskedDestination: delivery.maskedDestination,
  };
}

function createSmsServiceUnavailableError(flags) {
  const error = new Error(
    flags.smsDisabled
      ? 'SMS dogrulama servisi su anda aktif degil.'
      : 'SMS dogrulama servisi su anda yapilandirilmadi.',
  );
  error.statusCode = 503;
  error.smsDisabled = Boolean(flags.smsDisabled);
  error.smsNotConfigured = Boolean(flags.smsNotConfigured);
  return error;
}

function resolveSmsPhoneForUser(user, providedPhone) {
  const settings = parseSettings(user);
  const phone = normalizePhone(providedPhone || settings.phone || sanitizeStoredPhone(user.phone));

  if (!phone) {
    const error = new Error('SMS dogrulamasi icin gecerli bir telefon numarasi gerekli.');
    error.statusCode = 400;
    throw error;
  }

  return phone;
}

async function sendSmsVerificationCode(userId, providedPhone) {
  const user = await getUserById(userId);
  if (!user) {
    const error = new Error('Kullanici bulunamadi.');
    error.statusCode = 404;
    throw error;
  }

  const smsState = getSmsAvailabilityFlags();
  if (!smsState.smsAvailable) {
    throw createSmsServiceUnavailableError(smsState);
  }

  const phone = resolveSmsPhoneForUser(user, providedPhone);
  const maskedDestination = maskVerificationDestination('phone', phone);

  const latestCode = await db
    .prepare(
      `SELECT *
       FROM sms_verification_codes
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .get(userId);

  if (latestCode?.created_at) {
    const elapsedMs = Date.now() - new Date(latestCode.created_at).getTime();
    if (elapsedMs < 60_000) {
      const error = new Error('Yeni SMS kodu istemeden once 60 saniye bekleyin.');
      error.statusCode = 429;
      throw error;
    }
  }

  const id = randomUUID();
  const code = makeVerificationCode();
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();

  await db.prepare(
    `INSERT INTO sms_verification_codes (
      id, user_id, phone, phone_lookup, code, expires_at, used, used_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, userId, phone, makeLookupHash(phone), code, expiresAt, toDbBoolean(false), null, createdAt);

  try {
    const delivery = await sendBrevoSms({
      recipient: phone,
      content: `CARLOI: Dogrulama kodunuz: ${code}`,
      tag: 'auth_sms_verification',
    });

    await appendAuditLog({
      actorType: 'user',
      actorId: userId,
      targetType: 'sms_verification_code',
      targetId: id,
      action: 'auth.sms_code_sent',
      metadata: {
        maskedDestination,
        expiresAt,
        messageId: delivery.messageId || null,
      },
      ipAddress: null,
      userAgent: null,
    });

    return {
      verificationId: id,
      expiresAt,
      maskedDestination: delivery.maskedDestination || maskedDestination,
    };
  } catch (cause) {
    await db.prepare('DELETE FROM sms_verification_codes WHERE id = ?').run(id);
    logError('auth.sms_code.send_failed', {
      userIdSuffix: String(userId || '').slice(-6),
      destination: maskedDestination,
      errorMessage: cause?.message || 'unknown',
      statusCode: cause?.statusCode || 500,
    });
    throw cause;
  }
}

async function verifySmsCode(userId, verificationCode, providedPhone) {
  const normalizedCode = String(verificationCode || '').trim();
  if (!isSixDigitVerificationCode(normalizedCode)) {
    const error = new Error('SMS dogrulama kodu 6 haneli sayisal olmalidir.');
    error.statusCode = 400;
    throw error;
  }

  const user = await getUserById(userId);
  if (!user) {
    const error = new Error('Kullanici bulunamadi.');
    error.statusCode = 404;
    throw error;
  }

  const phone = providedPhone ? resolveSmsPhoneForUser(user, providedPhone) : '';
  const row = phone
    ? await db
        .prepare(
          `SELECT *
           FROM sms_verification_codes
           WHERE user_id = ?
             AND phone_lookup = ?
             AND used = ?
           ORDER BY created_at DESC
           LIMIT 1`,
        )
        .get(userId, makeLookupHash(phone), toDbBoolean(false))
    : await db
        .prepare(
          `SELECT *
           FROM sms_verification_codes
           WHERE user_id = ?
             AND used = ?
           ORDER BY created_at DESC
           LIMIT 1`,
        )
        .get(userId, toDbBoolean(false));

  if (!row) {
    const error = new Error('SMS dogrulama kodu bulunamadi.');
    error.statusCode = 404;
    throw error;
  }

  if (row.used) {
    const error = new Error('Bu SMS dogrulama kodu daha once kullanildi.');
    error.statusCode = 400;
    throw error;
  }

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    const error = new Error('SMS dogrulama kodunun suresi doldu.');
    error.statusCode = 400;
    throw error;
  }

  if (String(row.code || '').trim() !== normalizedCode) {
    const error = new Error('SMS dogrulama kodu hatali.');
    error.statusCode = 400;
    throw error;
  }

  await db.prepare(
    `UPDATE sms_verification_codes
     SET used = ?, used_at = ?
     WHERE id = ?`,
  ).run(toDbBoolean(true), nowIso(), row.id);

  await appendAuditLog({
    actorType: 'user',
    actorId: userId,
    targetType: 'sms_verification_code',
    targetId: row.id,
    action: 'auth.sms_code_verified',
    metadata: {
      maskedDestination: maskVerificationDestination('phone', row.phone),
    },
    ipAddress: null,
    userAgent: null,
  });

  return {
    verified: true,
    maskedDestination: maskVerificationDestination('phone', row.phone),
    verifiedAt: nowIso(),
  };
}

async function deliverEmailVerificationToken({
  email,
  userId,
  token,
  invalidateOnFailure = false,
  disableRetry = false,
}) {
  const normalizedEmail = normalizeEmail(email);

  try {
    const delivery = await sendVerificationTokenMail(
      {
        destination: normalizedEmail,
        token,
      },
      {
        disableRetry,
      },
    );

    if (delivery?.skipped) {
      logWarn('auth.verification_mail.skipped', {
        userIdSuffix: String(userId || '').slice(-6),
        destination: maskVerificationDestination('email', normalizedEmail),
      });
    } else {
      logInfo('auth.verification_mail.sent', {
        userIdSuffix: String(userId || '').slice(-6),
        destination: maskVerificationDestination('email', normalizedEmail),
      });
    }

    return {
      maskedDestination: delivery.maskedDestination || maskVerificationDestination('email', normalizedEmail),
      skipped: Boolean(delivery?.skipped),
      emailDisabled: Boolean(delivery?.emailDisabled),
      emailNotConfigured: Boolean(delivery?.emailNotConfigured),
    };
  } catch (cause) {
    if (invalidateOnFailure) {
      await invalidateAuthTokens({ userId, type: 'email_verification' });
    }

    logError('auth.verification_mail.failed', {
      userIdSuffix: String(userId || '').slice(-6),
      destination: maskVerificationDestination('email', normalizedEmail),
      tokenPreview: maskRawToken(token),
      invalidateOnFailure,
      errorMessage: cause?.message || 'unknown',
      statusCode: cause?.statusCode || 500,
    });
    throw createVerificationMailDeliveryError(cause);
  }
}

async function issueEmailVerificationToken(email, userId, options = {}) {
  const normalizedEmail = normalizeEmail(email);
  const authToken = await createAuthToken({
    userId,
    type: 'email_verification',
    ttlMs: EMAIL_VERIFICATION_TOKEN_TTL_MS,
  });
  const maskedDestination = maskVerificationDestination('email', normalizedEmail);
  const mailState = getMailAvailabilityFlags();

  if (!mailState.emailAvailable) {
    logWarn('auth.verification_mail.unavailable', {
      userIdSuffix: String(userId || '').slice(-6),
      destination: maskedDestination,
      emailDisabled: mailState.emailDisabled,
      emailNotConfigured: mailState.emailNotConfigured,
      deferDelivery: Boolean(options.deferDelivery),
    });

    return {
      expiresAt: authToken.expiresAt,
      maskedDestination,
      deliveryFailed: true,
      deliveryDeferred: false,
      skipped: true,
      emailDisabled: mailState.emailDisabled,
      emailNotConfigured: mailState.emailNotConfigured,
    };
  }

  if (options.deferDelivery) {
    runDetachedTask('auth.verification_mail.background_failed', async () => {
      await deliverEmailVerificationToken({
        email: normalizedEmail,
        userId,
        token: authToken.token,
        invalidateOnFailure: false,
        disableRetry: true,
      });
    });

    logInfo('auth.verification_mail.queued', {
      userIdSuffix: String(userId || '').slice(-6),
      destination: maskedDestination,
      emailDisabled: false,
      emailNotConfigured: false,
    });

    return {
      expiresAt: authToken.expiresAt,
      maskedDestination,
      deliveryFailed: false,
      deliveryDeferred: true,
      skipped: false,
      emailDisabled: false,
      emailNotConfigured: false,
    };
  }

  const delivery = await deliverEmailVerificationToken({
    email: normalizedEmail,
    userId,
    token: authToken.token,
    invalidateOnFailure: true,
    disableRetry: Boolean(options.disableRetry),
  });

  return {
    expiresAt: authToken.expiresAt,
    maskedDestination: delivery.maskedDestination || maskedDestination,
    deliveryFailed: Boolean(delivery.skipped),
    skipped: Boolean(delivery.skipped),
    emailDisabled: Boolean(delivery.emailDisabled),
    emailNotConfigured: Boolean(delivery.emailNotConfigured),
  };
}

function buildUserAuditContext(userId, requestMeta = {}) {
  return {
    actorType: 'user',
    actorId: userId,
    ipAddress: requestMeta?.ipAddress || null,
    userAgent: requestMeta?.userAgent || null,
  };
}

async function storeContextualConsents(userId, consents, requirement, requestMeta) {
  return recordUserConsents({
    userId,
    consents,
    defaultSourceScreen: requirement.sourceScreen,
    auditContext: buildUserAuditContext(userId, requestMeta),
  });
}

function shouldApplyListingConsentRequirements(payload, existing) {
  if (!payload?.listingDraft) {
    return false;
  }

  if (!existing) {
    return true;
  }

  return Boolean(
    Array.isArray(payload.consents) ||
      payload.listingDraft.sellerRelationType ||
      payload.listingDraft.registrationOwnerFullNameDeclared ||
      payload.listingDraft.authorizationDeclarationText ||
      typeof payload.listingDraft.isOwnerSameAsAccountHolder === 'boolean',
  );
}

async function acknowledgeSafePaymentInformation(userId, postId, consents, requestMeta) {
  const normalizedConsents = assertSafePaymentConsent(consents);
  await storeContextualConsents(
    userId,
    normalizedConsents,
    CONSENT_REQUIREMENTS.safePayment,
    requestMeta,
  );
  await saveListingCompliance(postId, {
    safePaymentInfoAccepted: true,
    safePaymentInfoAcceptedAt: nowIso(),
  });
}

function getTurkeyActivityYear() {
  return Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
    }).format(new Date()),
  );
}

function maxRiskLevel(currentLevel, nextLevel) {
  const levels = ['low', 'medium', 'high'];
  const currentIndex = levels.indexOf(currentLevel || 'low');
  const nextIndex = levels.indexOf(nextLevel || 'low');
  return levels[Math.max(currentIndex, nextIndex)] || 'low';
}

async function adjustYearlyActivityCounters(
  userId,
  { listingDelta = 0, saleDelta = 0, relatedPostId = null } = {},
  requestMeta = {},
) {
  if (!listingDelta && !saleDelta) {
    return null;
  }

  const year = getTurkeyActivityYear();
  const currentRow = await db
    .prepare(
      `SELECT *
       FROM user_yearly_activity
       WHERE user_id = ?
         AND year = ?
       LIMIT 1`,
    )
    .get(userId, year);

  const currentListingCount = Number(currentRow?.vehicle_listing_count || 0);
  const currentSaleCount = Number(currentRow?.vehicle_sale_count || 0);
  const nextListingCount = Math.max(0, currentListingCount + Number(listingDelta || 0));
  const nextSaleCount = Math.max(0, currentSaleCount + Number(saleDelta || 0));
  const timestamp = nowIso();

  if (currentRow) {
    await db
      .prepare(
        `UPDATE user_yearly_activity
         SET vehicle_listing_count = ?,
             vehicle_sale_count = ?,
             updated_at = ?
         WHERE id = ?`,
      )
      .run(nextListingCount, nextSaleCount, timestamp, currentRow.id);
  } else {
    await db
      .prepare(
        `INSERT INTO user_yearly_activity (
          id, user_id, year, vehicle_sale_count, vehicle_listing_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(randomUUID(), userId, year, nextSaleCount, nextListingCount, timestamp, timestamp);
  }

  const userRow = await db
    .prepare(
      `SELECT commercial_behavior_flag, risk_score, risk_level
       FROM users
       WHERE id = ?
       LIMIT 1`,
    )
    .get(userId);

  const signal = evaluateCommercialBehaviorSignal({
    yearlyVehicleSaleCount: nextSaleCount,
    yearlyVehicleListingCount: nextListingCount,
  });
  const alreadyFlagged = Boolean(userRow?.commercial_behavior_flag);
  const nextRiskScore = signal.triggered
    ? Math.max(Number(userRow?.risk_score || 0), signal.type === 'excessive_sales' ? 45 : 25)
    : Number(userRow?.risk_score || 0);
  const nextRiskLevel = signal.triggered
    ? maxRiskLevel(userRow?.risk_level || 'low', signal.severity === 'high' ? 'high' : signal.severity)
    : userRow?.risk_level || 'low';

  await db
    .prepare(
      `UPDATE users
       SET yearly_vehicle_listing_count = ?,
           yearly_vehicle_sale_count = ?,
           commercial_behavior_flag = ?,
           risk_score = ?,
           risk_level = ?,
           updated_at = ?
       WHERE id = ?`,
    )
    .run(
      nextListingCount,
      nextSaleCount,
      toDbBoolean(alreadyFlagged || signal.triggered),
      nextRiskScore,
      nextRiskLevel,
      timestamp,
      userId,
    );

  if (signal.triggered && !alreadyFlagged) {
    await maybeCreateCommercialBehaviorFlag(userId, {
      yearlyVehicleSaleCount: nextSaleCount,
      yearlyVehicleListingCount: nextListingCount,
    });

    await appendAuditLog({
      actorType: 'system',
      actorId: null,
      targetType: 'user',
      targetId: userId,
      action: 'user.commercial_behavior_flagged',
      metadata: {
        year,
        yearlyVehicleListingCount: nextListingCount,
        yearlyVehicleSaleCount: nextSaleCount,
        relatedPostId,
        signalType: signal.type,
      },
      ipAddress: requestMeta?.ipAddress || null,
      userAgent: requestMeta?.userAgent || null,
    });
  }

  return {
    year,
    yearlyVehicleListingCount: nextListingCount,
    yearlyVehicleSaleCount: nextSaleCount,
    commercialBehaviorFlag: alreadyFlagged || signal.triggered,
  };
}

async function registerAccount(payload, requestMeta) {
  const name = payload.name?.trim();
  const email = normalizeEmail(payload.email);
  const phone = normalizePhone(payload.phone);
  const password = payload.password?.trim();
  const handle = normalizeHandle(payload.handle || '');
  const accountType = normalizeAccountType(payload.accountType);
  const primaryChannel = normalizePrimaryChannel(payload.primaryChannel);
  const signupVerificationCode = String(
    payload.signupVerification?.code || payload.smsCode || payload.verificationCode || '',
  ).trim();
  const commercialRegistrationDraft =
    accountType === 'commercial' ? buildCommercialRegistrationDraft(payload) : null;
  const signupConsents = assertRequiredConsentTypes(
    payload.consents,
    CONSENT_REQUIREMENTS.signup.required,
    {
      defaultSourceScreen: CONSENT_REQUIREMENTS.signup.sourceScreen,
      message:
        'Kayit icin kullanim kosullari, gizlilik politikasi ve icerik sorumlulugu onaylari gereklidir.',
    },
  );

  logInfo('auth.register.requested', {
    accountType,
    primaryChannel,
    emailMasked: maskVerificationDestination('email', email),
    phoneMasked: maskVerificationDestination('phone', phone),
    handle,
    hasCommercialProfile: Boolean(commercialRegistrationDraft),
    consentTypes: signupConsents.map((consent) => consent.type),
    ipAddress: requestMeta?.ipAddress || null,
  });

  if (!name || !password || (!email && !phone)) {
    const error = new Error('Ad, e-posta veya telefon ve sifre zorunludur.');
    error.statusCode = 400;
    throw error;
  }

  if (password.length < 8) {
    const error = new Error('Sifre en az 8 karakter olmalidir.');
    error.statusCode = 400;
    throw error;
  }

  if (accountType === 'commercial') {
    if (!isFeatureEnabled('enableCommercialOnboarding')) {
      const error = new Error('Ticari hesap basvurusu su anda kullanima acik degil.');
      error.statusCode = 403;
      throw error;
    }

    validateCommercialRegistrationDraft(commercialRegistrationDraft);
  }

  if (primaryChannel === 'email' && !email) {
    const error = new Error('E-posta ile kayit icin gecerli bir e-posta adresi girin.');
    error.statusCode = 400;
    throw error;
  }

  if (primaryChannel === 'phone' && !phone) {
    const error = new Error('Telefon ile kayit icin gecerli bir telefon numarasi girin.');
    error.statusCode = 400;
    throw error;
  }

  const lookupIdentifier = primaryChannel === 'phone' ? phone : email || phone;
  const existingUser = await getUserByIdentifier(lookupIdentifier);
  if (existingUser?.verified) {
    const error = new Error(
      primaryChannel === 'phone'
        ? 'Bu telefon numarasi zaten kayitli.'
        : 'Bu e-posta adresi zaten kayitli.',
    );
    error.statusCode = 409;
    throw error;
  }

  const wasExistingUnverifiedUser = Boolean(existingUser);
  let userId = existingUser?.id;

  logInfo('auth.register.validated', {
    accountType,
    primaryChannel,
    emailMasked: maskVerificationDestination('email', email),
    phoneMasked: maskVerificationDestination('phone', phone),
    existingUnverifiedUser: wasExistingUnverifiedUser,
  });

  let phoneVerifiedDuringSignup = false;
  if (primaryChannel === 'phone') {
    const smsState = getSmsAvailabilityFlags();
    if (!smsState.smsAvailable) {
      throw createSmsServiceUnavailableError(smsState);
    }
    if (!signupVerificationCode) {
      const error = new Error('Telefon ile kayit icin SMS dogrulama kodu zorunludur.');
      error.statusCode = 400;
      throw error;
    }

    await consumeVerificationRequestByDestination({
      verificationCode: signupVerificationCode,
      channel: 'phone',
      destination: phone,
      purpose: 'signup',
    });
    phoneVerifiedDuringSignup = true;
  }

  let finalStoredEmail = email || makeInternalEmail(existingUser?.id || randomUUID());
  let finalStoredPhone = phone || makeInternalPhone(existingUser?.id || randomUUID());

  if (existingUser) {
    await requireUniqueUser(
      handle,
      sanitizeStoredEmail(finalStoredEmail),
      sanitizeStoredPhone(finalStoredPhone),
      existingUser.id,
    );

    await db.prepare(
      `UPDATE users
       SET name = ?, handle = ?, bio = ?, email = ?, phone = ?, email_lookup = ?, phone_lookup = ?,
           password_hash = ?, verified = ?, settings_json = ?, account_type = ?, updated_at = ?
       WHERE id = ?`,
    ).run(
      name,
      handle,
      payload.bio?.trim() || '',
      encryptText(finalStoredEmail),
      encryptText(finalStoredPhone),
      makeLookupHash(finalStoredEmail),
      makeLookupHash(finalStoredPhone),
      hashPassword(password),
      phoneVerifiedDuringSignup ? toDbBoolean(true) : existingUser.verified,
      encryptJson({
        ...parseSettings(existingUser),
        email: sanitizeStoredEmail(finalStoredEmail),
        phone: sanitizeStoredPhone(finalStoredPhone),
      }),
      accountType,
      nowIso(),
      existingUser.id,
    );
  } else {
    const nextUserId = randomUUID();
    const nextStoredEmail = email || makeInternalEmail(nextUserId);
    const nextStoredPhone = phone || makeInternalPhone(nextUserId);
    finalStoredEmail = nextStoredEmail;
    finalStoredPhone = nextStoredPhone;

    await requireUniqueUser(handle, sanitizeStoredEmail(nextStoredEmail), sanitizeStoredPhone(nextStoredPhone), '');

    userId = nextUserId;
    const timestamp = nowIso();

    await db.prepare(
      `INSERT INTO users (
        id, name, handle, bio, email, phone, email_lookup, phone_lookup, password_hash,
        verified, settings_json, account_type, commercial_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      userId,
      name,
      handle,
      payload.bio?.trim() || '',
      encryptText(nextStoredEmail),
      encryptText(nextStoredPhone),
      makeLookupHash(nextStoredEmail),
      makeLookupHash(nextStoredPhone),
      hashPassword(password),
      toDbBoolean(phoneVerifiedDuringSignup),
      encryptJson({
        ...defaultSettings,
        email: sanitizeStoredEmail(nextStoredEmail),
        phone: sanitizeStoredPhone(nextStoredPhone),
      }),
      accountType,
      accountType === 'commercial' ? 'not_applied' : 'not_applied',
      timestamp,
      timestamp,
    );

    await ensureDefaultAiMessages(userId);
  }

  logInfo('auth.register.user_upserted', {
    accountType,
    primaryChannel,
    userIdSuffix: String(userId || '').slice(-6),
    existingUnverifiedUser: wasExistingUnverifiedUser,
    phoneVerifiedDuringSignup,
  });

  await storeContextualConsents(userId, signupConsents, CONSENT_REQUIREMENTS.signup, requestMeta);

  if (accountType === 'commercial' && userId) {
    await updateUserCommercialState(userId, {
      accountType: 'commercial',
      commercialStatus: 'not_applied',
      commercialApprovedAt: null,
      commercialRejectedReason: null,
      canCreatePaidListings: false,
    });

    await saveCommercialProfile(userId, commercialRegistrationDraft, buildUserAuditContext(userId, requestMeta));
  }

  await appendAuditLog({
    actorType: 'user',
    actorId: userId,
    targetType: 'user',
    targetId: userId,
    action: 'auth.register_created',
    metadata: {
      accountType,
      commercialDraftCreated: Boolean(accountType === 'commercial'),
      existingUnverifiedUser: wasExistingUnverifiedUser,
    },
    ipAddress: requestMeta?.ipAddress || null,
    userAgent: requestMeta?.userAgent || null,
  });

  if (primaryChannel === 'phone') {
    const token = await createSession(userId);
    const snapshot = await bootstrapSnapshot(userId, token);
    const phoneMessage =
      accountType === 'commercial'
        ? 'Hesap olusturuldu ve SMS ile dogrulandi. Ticari belge yukleme ve platform inceleme adimina gecebilirsiniz.'
        : 'Hesabiniz olusturuldu ve SMS ile dogrulandi.';

    logInfo('auth.register.response_ready', {
      accountType,
      primaryChannel,
      userIdSuffix: String(userId || '').slice(-6),
      phoneMasked: maskVerificationDestination('phone', phone),
      verifiedInline: true,
    });

    return {
      token,
      snapshot,
      email: sanitizeStoredEmail(finalStoredEmail),
      phone: sanitizeStoredPhone(finalStoredPhone),
      maskedDestination: maskVerificationDestination('phone', phone),
      verificationChannel: 'phone',
      message: phoneMessage,
    };
  }

  const verification = await issueEmailVerificationToken(email, userId, {
    deferDelivery: true,
  });

  logInfo('auth.register.response_ready', {
    accountType,
    primaryChannel,
    userIdSuffix: String(userId || '').slice(-6),
    emailMasked: maskVerificationDestination('email', email),
    phoneMasked: maskVerificationDestination('phone', phone),
    deliveryDeferred: Boolean(verification.deliveryDeferred),
    deliveryFailed: Boolean(verification.deliveryFailed),
    emailDisabled: Boolean(verification.emailDisabled),
    emailNotConfigured: Boolean(verification.emailNotConfigured),
  });

  return {
    email,
    phone: sanitizeStoredPhone(finalStoredPhone),
    expiresAt: verification.expiresAt,
    maskedDestination: verification.maskedDestination,
    verificationChannel: 'email',
    message:
      verification.deliveryFailed && accountType === 'commercial'
        ? 'Ticari hesap olusturuldu. E-posta gonderimi su anda kapali veya kullanilamiyor. Dogrulama e-postasini daha sonra tekrar isteyebilirsiniz.'
        : verification.deliveryFailed
          ? REGISTER_VERIFICATION_PENDING_MESSAGE
          : accountType === 'commercial'
            ? 'Hesap olusturuldu. E-posta dogrulamasindan sonra ticari belge yukleme ve platform inceleme adimina gecebilirsiniz.'
            : 'Hesap olusturuldu. Dogrulama baglantisi e-posta adresinize gonderiliyor.',
    deliveryFailed: Boolean(verification.deliveryFailed),
    emailDisabled: Boolean(verification.emailDisabled),
    emailNotConfigured: Boolean(verification.emailNotConfigured),
  };
}

async function loginAccount(identifier, password) {
  const user = await getUserByIdentifier(identifier?.trim() || '');
  if (!user || !verifyPassword(password?.trim() || '', user.password_hash)) {
    const error = new Error('E-posta/telefon veya şifre hatalı.');
    error.statusCode = 401;
    throw error;
  }

  if (!user.verified) {
    const error = new Error(
      'E-posta adresiniz henüz doğrulanmadı. Mailinize gelen doğrulama bağlantısını açarak hesabınızı etkinleştirin.',
    );
    error.statusCode = 403;
    throw error;
  }

  const token = await createSession(user.id);
  return { token, snapshot: await bootstrapSnapshot(user.id, token) };
}

async function verifyEmailCode(email, code) {
  const normalizedEmail = normalizeEmail(email);
  const verificationCode = String(code || '').trim();

  console.info(`${VERIFICATION_LOG_PREFIX} verify-email-request`, {
    email: maskVerificationDestination('email', normalizedEmail),
    codeLength: verificationCode.length,
  });

  if (!normalizedEmail || !verificationCode) {
    console.warn(`${VERIFICATION_LOG_PREFIX} verify-email-invalid-input`, {
      emailProvided: Boolean(normalizedEmail),
      codeLength: verificationCode.length,
      reason: 'missing-email-or-code',
    });
    const error = new Error('E-posta ve doğrulama kodu zorunludur.');
    error.statusCode = 400;
    throw error;
  }

  if (!isSixDigitVerificationCode(verificationCode)) {
    console.warn(`${VERIFICATION_LOG_PREFIX} verify-email-invalid-input`, {
      email: maskVerificationDestination('email', normalizedEmail),
      codeLength: verificationCode.length,
      reason: 'invalid-code-format',
    });
    const error = new Error('Dogrulama kodu 6 haneli sayisal olmalidir.');
    error.statusCode = 400;
    throw error;
  }

  const user = await getUserByIdentifier(normalizedEmail);
  if (!user) {
    console.warn(`${VERIFICATION_LOG_PREFIX} verify-email-failed`, {
      email: maskVerificationDestination('email', normalizedEmail),
      reason: 'user-not-found',
    });
    const error = new Error('Doğrulama isteği geçersiz veya süresi dolmuş.');
    error.statusCode = 400;
    throw error;
  }

  if (user.verified) {
    console.warn(`${VERIFICATION_LOG_PREFIX} verify-email-failed`, {
      email: maskVerificationDestination('email', normalizedEmail),
      reason: 'already-verified',
    });
    const error = new Error('Bu e-posta adresi zaten doğrulandı.');
    error.statusCode = 409;
    throw error;
  }

  await consumeVerificationRequestByDestination({
    verificationCode,
    channel: 'email',
    destination: normalizedEmail,
    purpose: 'email_verification',
  });

  await db.prepare('UPDATE users SET verified = 1, updated_at = ? WHERE id = ?').run(nowIso(), user.id);

  console.info(`${VERIFICATION_LOG_PREFIX} verify-email-success`, {
    email: maskVerificationDestination('email', normalizedEmail),
    userIdSuffix: String(user.id || '').slice(-6),
  });

  const token = await createSession(user.id);
  return {
    token,
    snapshot: await bootstrapSnapshot(user.id, token),
  };
}

async function verifyEmailToken(rawToken) {
  console.info(`${AUTH_TOKEN_LOG_PREFIX} verify-email-request`, {
    tokenPreview: maskRawToken(rawToken),
  });

  const tokenRow = await consumeAuthToken({
    rawToken,
    type: 'email_verification',
  });

  const user = await getUserById(tokenRow.user_id);
  if (!user) {
    const error = new Error('Dogrulama baglantisi gecersiz veya suresi dolmus.');
    error.statusCode = 400;
    throw error;
  }

  if (!user.verified) {
    await db.prepare('UPDATE users SET verified = 1, updated_at = ? WHERE id = ?').run(nowIso(), user.id);
  }

  await invalidateAuthTokens({ userId: user.id, type: 'email_verification' });

  console.info(`${AUTH_TOKEN_LOG_PREFIX} verify-email-success`, {
    userIdSuffix: String(user.id || '').slice(-6),
    tokenPreview: maskRawToken(rawToken),
  });

  const token = await createSession(user.id);
  return {
    token,
    snapshot: await bootstrapSnapshot(user.id, token),
    message: 'E-posta doğrulandı.',
  };
}

async function resendEmailVerificationCode(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    const error = new Error('Doğrulama kodu şu anda yeniden gönderilemedi.');
    error.statusCode = 400;
    throw error;
  }

  const user = await getUserByIdentifier(normalizedEmail);
  if (!user || user.verified) {
    return {
      email: normalizedEmail,
      expiresAt: '',
      maskedDestination: '',
      skipped: true,
    };
  }

  const latestRequest = await getLatestUnconsumedVerificationRequest({
    channel: 'email',
    destination: normalizedEmail,
    purpose: 'email_verification',
  });
  const latestToken = await getLatestActiveAuthToken({
    userId: user.id,
    type: 'email_verification',
  });
  const latestCreatedAt =
    latestToken?.created_at ||
    latestRequest?.created_at ||
    '';

  if (latestCreatedAt) {
    const elapsedMs = Date.now() - new Date(latestCreatedAt).getTime();
    if (elapsedMs < 60_000) {
      const error = new Error('Yeni doğrulama e-postası istemeden önce 60 saniye bekleyin.');
      error.statusCode = 429;
      throw error;
    }
  }

  const verification = await issueEmailVerificationToken(normalizedEmail, user.id);
  return {
    email: normalizedEmail,
    expiresAt: verification.expiresAt,
    maskedDestination: verification.maskedDestination,
    deliveryFailed: Boolean(verification.deliveryFailed),
    skipped: Boolean(verification.skipped),
    emailDisabled: Boolean(verification.emailDisabled),
    emailNotConfigured: Boolean(verification.emailNotConfigured),
  };
}

async function issuePasswordResetToken(email, userId) {
  const normalizedEmail = normalizeEmail(email);
  const authToken = await createAuthToken({
    userId,
    type: 'password_reset',
    ttlMs: PASSWORD_RESET_TOKEN_TTL_MS,
  });

  try {
    const delivery = await sendPasswordResetTokenMail({
      destination: normalizedEmail,
      token: authToken.token,
    });

    if (delivery?.skipped) {
      await invalidateAuthTokens({ userId, type: 'password_reset' });
      return {
        expiresAt: authToken.expiresAt,
        deliveryFailed: true,
        emailDisabled: Boolean(delivery.emailDisabled),
        emailNotConfigured: Boolean(delivery.emailNotConfigured),
      };
    }
  } catch (cause) {
    await invalidateAuthTokens({ userId, type: 'password_reset' });
    console.error(`${AUTH_TOKEN_LOG_PREFIX} delivery-failed`, {
      type: 'password_reset',
      userIdSuffix: String(userId || '').slice(-6),
      destination: maskVerificationDestination('email', normalizedEmail),
      tokenPreview: maskRawToken(authToken.token),
      errorMessage: cause?.message || 'unknown',
    });
    throw cause;
  }

  return {
    expiresAt: authToken.expiresAt,
  };
}

async function requestPasswordReset(email) {
  const normalizedEmail = normalizeEmail(email);
  const mailState = getMailAvailabilityFlags();
  if (!mailState.emailAvailable) {
    return {
      accepted: true,
      emailDisabled: mailState.emailDisabled,
      emailNotConfigured: mailState.emailNotConfigured,
    };
  }

  if (!normalizedEmail) {
    return { accepted: true };
  }

  const user = await getUserByIdentifier(normalizedEmail);
  if (!user) {
    return { accepted: true };
  }

  const latestToken = await getLatestActiveAuthToken({
    userId: user.id,
    type: 'password_reset',
  });

  if (latestToken) {
    const elapsedMs = Date.now() - new Date(latestToken.created_at).getTime();
    if (elapsedMs < 60_000) {
      return { accepted: true };
    }
  }

  try {
    const delivery = await issuePasswordResetToken(normalizedEmail, user.id);
    return {
      accepted: true,
      deliveryFailed: Boolean(delivery?.deliveryFailed),
      emailDisabled: Boolean(delivery?.emailDisabled),
      emailNotConfigured: Boolean(delivery?.emailNotConfigured),
    };
  } catch (cause) {
    return {
      accepted: true,
      emailDisabled: Boolean(cause?.emailDisabled),
      emailNotConfigured: Boolean(cause?.emailNotConfigured),
    };
  }
}

async function resetPasswordWithCode(email, code, password) {
  const normalizedEmail = normalizeEmail(email);
  const verificationCode = String(code || '').trim();
  const nextPassword = String(password || '').trim();

  if (!normalizedEmail || !verificationCode || !nextPassword) {
    const error = new Error('E-posta, kod ve yeni şifre zorunludur.');
    error.statusCode = 400;
    throw error;
  }

  if (nextPassword.length < 8) {
    const error = new Error('Sifre en az 8 karakter olmalidir.');
    error.statusCode = 400;
    throw error;
  }

  const user = await getUserByIdentifier(normalizedEmail);
  if (!user) {
    const error = new Error('Şifre sıfırlama isteği geçersiz veya süresi dolmuş.');
    error.statusCode = 400;
    throw error;
  }

  await consumeVerificationRequestByDestination({
    verificationCode,
    channel: 'email',
    destination: normalizedEmail,
    purpose: 'password_reset',
  });

  await db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(
    hashPassword(nextPassword),
    nowIso(),
    user.id,
  );

  await db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
  const token = await createSession(user.id);
  return { token, snapshot: await bootstrapSnapshot(user.id, token) };
}

async function resetPasswordWithToken(rawToken, password) {
  const nextPassword = String(password || '').trim();
  if (!rawToken || !nextPassword) {
    const error = new Error('Token ve yeni şifre zorunludur.');
    error.statusCode = 400;
    throw error;
  }

  if (nextPassword.length < 8) {
    const error = new Error('Sifre en az 8 karakter olmalidir.');
    error.statusCode = 400;
    throw error;
  }

  const tokenRow = await consumeAuthToken({
    rawToken,
    type: 'password_reset',
  });
  const user = await getUserById(tokenRow.user_id);

  if (!user) {
    const error = new Error('Şifre sıfırlama isteği geçersiz veya süresi dolmuş.');
    error.statusCode = 400;
    throw error;
  }

  await db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(
    hashPassword(nextPassword),
    nowIso(),
    user.id,
  );

  await invalidateAuthTokens({ userId: user.id, type: 'password_reset' });
  await db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
  const token = await createSession(user.id);
  return {
    token,
    snapshot: await bootstrapSnapshot(user.id, token),
  };
}

async function signInWithSocialIdentity(payload) {
  const provider = payload?.provider === 'apple' ? 'apple' : 'google';
  const subject = String(payload?.subject || '').trim();
  const normalizedEmail = normalizeEmail(payload?.email);
  const displayName = String(payload?.fullName || '').trim();
  const avatarUri = String(payload?.avatarUri || '').trim();
  const socialColumn = provider === 'apple' ? 'apple_sub' : 'google_sub';

  if (!subject) {
    const error = new Error('Sosyal giriş için güvenli kullanıcı kimliği alınamadı.');
    error.statusCode = 400;
    throw error;
  }

  let user = await getUserBySocialIdentity(provider, subject);
  if (!user && normalizedEmail) {
    user = await getUserByIdentifier(normalizedEmail);
  }

  if (!user) {
    const userId = randomUUID();
    const timestamp = nowIso();
    const handle = await buildAvailableHandle(
      normalizedEmail ? normalizedEmail.split('@')[0] : displayName || provider,
    );
    const storedEmail = normalizedEmail || makeInternalEmail(userId);
    const storedPhone = makeInternalPhone(userId);

    await db.prepare(
      `INSERT INTO users (
        id, name, handle, bio, email, phone, email_lookup, phone_lookup, password_hash,
        google_sub, apple_sub, verified, avatar_uri, settings_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      userId,
      displayName || (provider === 'apple' ? 'Apple kullanıcısı' : 'Google kullanıcısı'),
      handle,
      '',
      encryptText(storedEmail),
      encryptText(storedPhone),
      normalizedEmail ? makeLookupHash(storedEmail) : null,
      makeLookupHash(storedPhone),
      hashPassword(randomUUID()),
      provider === 'google' ? subject : null,
      provider === 'apple' ? subject : null,
      1,
      avatarUri || null,
      encryptJson({
        ...defaultSettings,
        email: normalizedEmail || '',
        phone: '',
      }),
      timestamp,
      timestamp,
    );

    await ensureDefaultAiMessages(userId);
    const token = await createSession(userId);
    return { token, snapshot: await bootstrapSnapshot(userId, token) };
  }

  const nextName = displayName || user.name;
  const nextEmail = normalizedEmail || user.email;
  const nextAvatarUri = avatarUri || user.avatar_uri || null;
  const nextSettings = {
    ...parseSettings(user),
    email: sanitizeStoredEmail(nextEmail),
  };

  await db.prepare(
    `UPDATE users
     SET name = ?, email = ?, email_lookup = ?, avatar_uri = ?, ${socialColumn} = ?, verified = 1, settings_json = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    nextName,
    encryptText(nextEmail),
    sanitizeStoredEmail(nextEmail) ? makeLookupHash(nextEmail) : null,
    nextAvatarUri,
    subject,
    encryptJson(nextSettings),
    nowIso(),
    user.id,
  );

  const token = await createSession(user.id);
  return { token, snapshot: await bootstrapSnapshot(user.id, token) };
}

async function startSignupVerification(channel, destination) {
  const request = await createVerificationRequest({
    channel,
    destination,
    purpose: 'signup',
  });
  const delivery = await sendVerificationCode({
    channel,
    destination: request.destination,
    code: request.code,
  });

  return {
    verificationId: request.verificationId,
    expiresAt: request.expiresAt,
    maskedDestination: delivery.maskedDestination,
  };
}

async function logoutAccount(token) {
  await db.prepare('DELETE FROM sessions WHERE token = ?').run(hashSessionToken(token));
}

function buildListingDetails(user, vehicle, draft, postId, previousListing) {
  if (!vehicle) {
    return undefined;
  }

  const settings = parseSettings(user);
  const city = draft.city?.trim() || '';
  const district = draft.district?.trim() || '';
  const location =
    draft.location?.trim() || [district, city].filter(Boolean).join(' / ') || 'Konum belirtilmedi';
  const healthText =
    typeof vehicle.healthScore === 'number' ? `%${vehicle.healthScore} araç sağlığı` : 'OBD verisi yok';
  const registrationInfo = {
    ownerName:
      draft.registrationOwnerName?.trim() || settings.registrationOwnerName || settings.legalFullName || user.name,
    ownerIdentityNumber:
      draft.registrationOwnerIdentityNumber?.trim() ||
      settings.registrationOwnerIdentityNumber ||
      settings.identityNumber ||
      '',
    serialNumber:
      draft.registrationSerialNumber?.trim() || settings.registrationSerialNumber || '',
    documentNumber:
      draft.registrationDocumentNumber?.trim() || settings.registrationDocumentNumber || '',
    plateNumber:
      draft.plateNumber?.trim() || settings.defaultPlateNumber || draft.plateOrigin?.trim() || '',
  };
  const hasRegistrationInfo = Object.values(registrationInfo).some(Boolean);

  return {
    title: draft.title?.trim() || `${vehicle.year} ${vehicle.brand} ${vehicle.model}`,
    price: draft.price?.trim() || 'Fiyat belirtilmedi',
    location,
    city,
    district,
    latitude: Number.isFinite(Number(draft.latitude)) ? Number(draft.latitude) : undefined,
    longitude: Number.isFinite(Number(draft.longitude)) ? Number(draft.longitude) : undefined,
    contactPhone: draft.phone?.trim() || undefined,
    sellerName: user.name,
    sellerHandle: user.handle,
    description: draft.description?.trim() || '',
    summaryLine: [vehicle.year, vehicle.mileage, vehicle.engineVolume, vehicle.fuelType]
      .filter(Boolean)
      .join(' • '),
    listingLink: makeShareLink(postId, 'listing'),
    badges: [
      healthText,
      city || 'Konum eklendi',
      draft.includeExpertiz ? 'VCARX ekspertizli' : 'Ekspertiz eklenmedi',
    ],
    factorySpecs: [
      `${vehicle.year} ${vehicle.brand} ${vehicle.model} ${vehicle.packageName}`,
      `${vehicle.engineVolume} • ${draft.fuelType?.trim() || vehicle.fuelType || 'Belirtilmedi'} • ${
        draft.transmission?.trim() || 'Belirtilmedi'
      }`,
      `${vehicle.mileage} • ${draft.bodyType?.trim() || 'Belirtilmedi'} • ${
        draft.color?.trim() || 'Belirtilmedi'
      }`,
    ],
    reportHighlights: draft.includeExpertiz
      ? [
          typeof vehicle.healthScore === 'number'
            ? `Araç sağlık skoru ${vehicle.healthScore}%`
            : 'Araç sağlık skoru için OBD verisi gerekli',
          typeof vehicle.driveScore === 'number'
            ? `Sürüş puanı ${vehicle.driveScore}/100`
            : 'Sürüş puanı için OBD sürüş verisi gerekli',
          vehicle.faultCodes?.length
            ? `Aktif DTC: ${vehicle.faultCodes.map((item) => item.code).join(', ')}`
            : 'Aktif DTC bulunmuyor',
        ].filter(Boolean)
      : ['Ekspertiz görseli kullanıcı tercihiyle paylaşılmadı.'],
    specTable: [
      { label: 'Marka', value: vehicle.brand },
      { label: 'Model', value: vehicle.model },
      { label: 'Yil', value: vehicle.year },
      { label: 'Paket', value: vehicle.packageName },
      { label: 'Kilometre', value: vehicle.mileage },
      { label: 'Motor', value: vehicle.engineVolume },
      { label: 'Yakit', value: draft.fuelType?.trim() || vehicle.fuelType || 'Belirtilmedi' },
      { label: 'Vites', value: draft.transmission?.trim() || 'Belirtilmedi' },
      { label: 'Kasa tipi', value: draft.bodyType?.trim() || 'Belirtilmedi' },
      { label: 'Renk', value: draft.color?.trim() || 'Belirtilmedi' },
      { label: 'Plaka', value: draft.plateOrigin?.trim() || 'Belirtilmedi' },
      { label: 'VIN', value: vehicle.vin },
    ],
    conditionTable: [
      { label: 'Hasar kaydi', value: draft.damageRecord?.trim() || 'Belirtilmedi' },
      { label: 'Boya', value: draft.paintInfo?.trim() || 'Belirtilmedi' },
      { label: 'Degisen', value: draft.changedParts?.trim() || 'Belirtilmedi' },
      { label: 'Kaza', value: draft.accidentInfo?.trim() || 'Belirtilmedi' },
      { label: 'Konum', value: location },
      { label: 'Ilan sahibi', value: user.name },
    ],
    equipment: Array.isArray(vehicle.equipment) ? vehicle.equipment : [],
    extraEquipment: draft.extraEquipment?.trim() || '',
    showExpertiz: Boolean(draft.includeExpertiz),
    isSold: Boolean(previousListing?.isSold),
    soldAt: previousListing?.soldAt,
    registrationInfo: hasRegistrationInfo ? registrationInfo : previousListing?.registrationInfo,
    stats: {
      views: 0,
      saves: 0,
      shares: 0,
      messages: 0,
      calls: 0,
    },
  };
}

function createMediaFromPayload(payload) {
  const selectedMedia = Array.isArray(payload.selectedMedia) ? payload.selectedMedia : [];
  const fallbackMedia =
    selectedMedia.length > 0
      ? selectedMedia
      : Array.isArray(payload.selectedMediaKinds)
        ? payload.selectedMediaKinds.map((kind) => ({
            kind,
            label:
              kind === 'image' ? 'Eklenen gorsel' : kind === 'video' ? 'Eklenen video' : 'Eklenen GIF',
            hint:
              kind === 'image' ? 'Kullanıcı medyası' : kind === 'video' ? 'Eklenen video' : 'Eklenen GIF',
          }))
        : [];

  return fallbackMedia.map((item, index) => ({
    id: `media-${Date.now()}-${index}`,
    kind: item.kind || 'image',
    label: item.label || 'Ekli medya',
    hint: item.hint || '',
    uri: item.uri,
    tone:
      item.kind === 'video'
        ? 'slate'
        : item.kind === 'gif'
          ? 'amber'
          : item.kind === 'report'
            ? 'emerald'
            : 'cyan',
  }));
}

function buildListingDraftFromFlow(flow, fallbackDraft = {}) {
  return {
    title: flow.vehicleInformation.title || fallbackDraft.title || '',
    price: flow.pricingDescription.price || fallbackDraft.price || '',
    city: flow.vehicleInformation.city || fallbackDraft.city || '',
    district: flow.vehicleInformation.district || fallbackDraft.district || '',
    location: flow.vehicleInformation.location || fallbackDraft.location || '',
    latitude: flow.vehicleInformation.latitude ?? fallbackDraft.latitude,
    longitude: flow.vehicleInformation.longitude ?? fallbackDraft.longitude,
    phone: flow.vehicleInformation.phone || fallbackDraft.phone || '',
    transmission: flow.vehicleInformation.transmission || fallbackDraft.transmission || '',
    fuelType: flow.vehicleInformation.fuelType || fallbackDraft.fuelType || '',
    bodyType: flow.vehicleInformation.bodyType || fallbackDraft.bodyType || '',
    color: flow.vehicleInformation.color || fallbackDraft.color || '',
    plateOrigin: flow.vehicleInformation.plateOrigin || fallbackDraft.plateOrigin || '',
    damageRecord: flow.pricingDescription.damageRecord || fallbackDraft.damageRecord || '',
    paintInfo: flow.pricingDescription.paintInfo || fallbackDraft.paintInfo || '',
    changedParts: flow.pricingDescription.changedParts || fallbackDraft.changedParts || '',
    accidentInfo: flow.pricingDescription.accidentInfo || fallbackDraft.accidentInfo || '',
    description: flow.pricingDescription.description || fallbackDraft.description || '',
    extraEquipment: flow.pricingDescription.extraEquipment || fallbackDraft.extraEquipment || '',
    includeExpertiz:
      flow.vehicleInformation.includeExpertiz ?? fallbackDraft.includeExpertiz ?? true,
    registrationOwnerName:
      flow.ownershipAuthorization.registrationOwnerName || fallbackDraft.registrationOwnerName || '',
    registrationOwnerIdentityNumber:
      flow.ownershipAuthorization.registrationOwnerIdentityNumber ||
      fallbackDraft.registrationOwnerIdentityNumber ||
      '',
    registrationSerialNumber:
      flow.ownershipAuthorization.registrationSerialNumber ||
      fallbackDraft.registrationSerialNumber ||
      '',
    registrationDocumentNumber:
      flow.ownershipAuthorization.registrationDocumentNumber ||
      fallbackDraft.registrationDocumentNumber ||
      '',
    plateNumber: flow.vehicleInformation.plateNumber || fallbackDraft.plateNumber || '',
    sellerRelationType:
      flow.ownershipAuthorization.sellerRelationType || fallbackDraft.sellerRelationType || 'owner',
    registrationOwnerFullNameDeclared:
      flow.ownershipAuthorization.registrationOwnerFullNameDeclared ||
      fallbackDraft.registrationOwnerFullNameDeclared ||
      '',
    isOwnerSameAsAccountHolder:
      flow.ownershipAuthorization.isOwnerSameAsAccountHolder ??
      fallbackDraft.isOwnerSameAsAccountHolder ??
      true,
    authorizationDeclarationText:
      flow.ownershipAuthorization.authorizationDeclarationText ||
      fallbackDraft.authorizationDeclarationText ||
      '',
    authorizationStatus:
      flow.ownershipAuthorization.authorizationStatus || fallbackDraft.authorizationStatus,
    eidsStatus: flow.ownershipAuthorization.eidsStatus || fallbackDraft.eidsStatus,
  };
}

async function createOrUpdatePost(userId, payload, requestMeta) {
  const user = await getUserById(userId);
  if (!user) {
    const error = new Error('Kullanıcı bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  const vehicle = parseVehicle(user);
  const timestamp = nowIso();
  const postId = payload.editingPostId || randomUUID();
  const type = payload.postType === 'listing' ? 'listing' : 'standard';
  const media = createMediaFromPayload(payload);
  const includeReport = type === 'listing' && payload.listingDraft?.includeExpertiz && vehicle;
  const fullMedia = includeReport
      ? [
        {
          id: `report-${postId}`,
          kind: 'report',
          label: 'VCARX expertiz raporu',
          hint: 'Arac sagligi, DTC kodlari ve OBD ozeti',
          tone: 'emerald',
        },
        ...media,
      ]
    : media;

  const existing = payload.editingPostId
    ? await db.prepare('SELECT * FROM posts WHERE id = ? AND author_user_id = ?').get(payload.editingPostId, userId)
    : null;
  const previousListing = existing ? jsonParse(existing.listing_json, undefined) : undefined;
  const listingFlowEvaluation =
    type === 'listing' && payload.listingDraft
      ? await evaluateListingCreateFlow({
          user,
          hasVehicle: Boolean(vehicle),
          payload,
          existingPostId: existing?.id || null,
        })
      : null;
  const nextListingDraft =
    type === 'listing' && listingFlowEvaluation
      ? buildListingDraftFromFlow(listingFlowEvaluation.flow, payload.listingDraft)
      : payload.listingDraft;

  const listing =
    type === 'listing' && nextListingDraft
      ? buildListingDetails(user, vehicle, nextListingDraft, postId, previousListing)
      : undefined;

  const hashtags =
    type === 'listing'
      ? ['#ilan', '#VCARX', '#satilik']
      : String(payload.content || '')
          .split(/\s+/)
          .filter((item) => item.startsWith('#'))
          .slice(0, 5);

  if (payload.editingPostId && !existing) {
    const error = new Error('Duzenlenecek gonderi bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  if (existing) {
    await db.prepare(
      `UPDATE posts
       SET type = ?, content = ?, hashtags_json = ?, media_json = ?, listing_json = ?, updated_at = ?
       WHERE id = ?`,
    ).run(
      type,
      payload.content?.trim() || '',
      jsonStringify(hashtags),
      jsonStringify(fullMedia),
      jsonStringify(listing),
      timestamp,
      postId,
    );

    if (type === 'listing' && listingFlowEvaluation) {
      await persistListingCreateFlowArtifacts({
        postId,
        userId,
        evaluation: listingFlowEvaluation,
        requestMeta,
      });

      if (listingFlowEvaluation.finalState === 'payment_pending') {
        const paymentResult = await ensureListingPayment({
          user,
          listingId: postId,
          billingStep: listingFlowEvaluation.flow.billingListingFee,
          consents: payload.consents,
          requestMeta,
        });

        if (paymentResult.paymentRecord) {
          await saveListingCompliance(postId, {
            ...listingFlowEvaluation.compliancePayload,
            billingRequired: paymentResult.paymentRequired,
            billingStatus: paymentResult.paymentStatus,
            paymentRecordId: paymentResult.paymentRecord.id,
          });

          listingFlowEvaluation.payment.paymentStatus = paymentResult.paymentStatus;
          listingFlowEvaluation.compliancePayload.billingStatus = paymentResult.paymentStatus;
          listingFlowEvaluation.compliancePayload.paymentRecordId = paymentResult.paymentRecord.id;
        }

        listingFlowEvaluation.payment.paymentUrl = paymentResult.paymentUrl || null;
      }

      await storeContextualConsents(
        userId,
        listingFlowEvaluation.listingConsents,
        CONSENT_REQUIREMENTS.listingCreation,
        requestMeta,
      );
    }

    if (existing.type !== 'listing' && type === 'listing') {
      await adjustYearlyActivityCounters(
        userId,
        {
          listingDelta: 1,
          relatedPostId: postId,
        },
        requestMeta,
      );
    }
    return {
      postId,
      message:
        listingFlowEvaluation?.message ||
        (type === 'listing' ? 'Ilan guncellendi.' : 'Gonderi guncellendi.'),
      url: listingFlowEvaluation?.payment?.paymentUrl || undefined,
      listingFlow: listingFlowEvaluation
        ? {
            finalState: listingFlowEvaluation.finalState,
            riskLevel: listingFlowEvaluation.riskAssessment.level,
            riskScore: listingFlowEvaluation.riskAssessment.score,
            paymentRequired: listingFlowEvaluation.payment.paymentRequired,
            paymentStatus: listingFlowEvaluation.payment.paymentStatus,
            paymentRecordId:
              listingFlowEvaluation.compliancePayload.paymentRecordId || undefined,
            reviewRequiredReason: listingFlowEvaluation.reviewRequiredReason || undefined,
          }
        : undefined,
    };
  }

  await db.prepare(
    `INSERT INTO posts (
      id, author_user_id, type, content, hashtags_json, media_json, listing_json, repost_source_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
  ).run(
    postId,
    userId,
    type,
    payload.content?.trim() || '',
    jsonStringify(hashtags),
    jsonStringify(fullMedia),
    jsonStringify(listing),
    timestamp,
    timestamp,
  );

  if (type === 'listing') {
    if (listingFlowEvaluation) {
      await persistListingCreateFlowArtifacts({
        postId,
        userId,
        evaluation: listingFlowEvaluation,
        requestMeta,
      });

      if (listingFlowEvaluation.finalState === 'payment_pending') {
        const paymentResult = await ensureListingPayment({
          user,
          listingId: postId,
          billingStep: listingFlowEvaluation.flow.billingListingFee,
          consents: payload.consents,
          requestMeta,
        });

        if (paymentResult.paymentRecord) {
          await saveListingCompliance(postId, {
            ...listingFlowEvaluation.compliancePayload,
            billingRequired: paymentResult.paymentRequired,
            billingStatus: paymentResult.paymentStatus,
            paymentRecordId: paymentResult.paymentRecord.id,
          });

          listingFlowEvaluation.payment.paymentStatus = paymentResult.paymentStatus;
          listingFlowEvaluation.compliancePayload.billingStatus = paymentResult.paymentStatus;
          listingFlowEvaluation.compliancePayload.paymentRecordId = paymentResult.paymentRecord.id;
        }

        listingFlowEvaluation.payment.paymentUrl = paymentResult.paymentUrl || null;
      }
    }

    if (listingFlowEvaluation?.listingConsents.length) {
      await storeContextualConsents(
        userId,
        listingFlowEvaluation.listingConsents,
        CONSENT_REQUIREMENTS.listingCreation,
        requestMeta,
      );
    }

    await adjustYearlyActivityCounters(
      userId,
      {
        listingDelta: 1,
        relatedPostId: postId,
      },
      requestMeta,
    );
  }

  return {
    postId,
    message:
      listingFlowEvaluation?.message ||
      (type === 'listing' ? 'Ilan kaydedildi.' : 'Gonderi paylasildi.'),
    url: listingFlowEvaluation?.payment?.paymentUrl || undefined,
    listingFlow: listingFlowEvaluation
      ? {
          finalState: listingFlowEvaluation.finalState,
          riskLevel: listingFlowEvaluation.riskAssessment.level,
          riskScore: listingFlowEvaluation.riskAssessment.score,
          paymentRequired: listingFlowEvaluation.payment.paymentRequired,
          paymentStatus: listingFlowEvaluation.payment.paymentStatus,
          paymentRecordId:
            listingFlowEvaluation.compliancePayload.paymentRecordId || undefined,
          reviewRequiredReason: listingFlowEvaluation.reviewRequiredReason || undefined,
        }
      : undefined,
  };
}

async function toggleReaction(userId, postId, kind) {
  const existing = await db
    .prepare('SELECT 1 AS ok FROM post_reactions WHERE user_id = ? AND post_id = ? AND kind = ?')
    .get(userId, postId, kind);

  if (existing) {
    await db.prepare('DELETE FROM post_reactions WHERE user_id = ? AND post_id = ? AND kind = ?').run(
      userId,
      postId,
      kind,
    );
    return false;
  }

  await db.prepare('INSERT INTO post_reactions (user_id, post_id, kind, created_at) VALUES (?, ?, ?, ?)').run(
    userId,
    postId,
    kind,
    nowIso(),
  );
  return true;
}

async function toggleRepost(userId, postId) {
  const existing = await db
    .prepare('SELECT id FROM posts WHERE author_user_id = ? AND repost_source_id = ?')
    .get(userId, postId);

  if (existing) {
    await db.prepare('DELETE FROM posts WHERE id = ?').run(existing.id);
    return false;
  }

  await db.prepare(
    `INSERT INTO posts (
      id, author_user_id, type, content, hashtags_json, media_json, listing_json, repost_source_id, created_at, updated_at
    ) VALUES (?, ?, 'standard', '', '[]', '[]', NULL, ?, ?, ?)`,
  ).run(randomUUID(), userId, postId, nowIso(), nowIso());

  return true;
}

async function addComment(userId, postId, content) {
  await db.prepare(
    'INSERT INTO comments (id, post_id, author_user_id, content, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(randomUUID(), postId, userId, content.trim(), nowIso());
}

async function deletePost(userId, postId) {
  const post = await db.prepare('SELECT * FROM posts WHERE id = ? AND author_user_id = ?').get(postId, userId);
  if (!post) {
    const error = new Error('Silinecek gönderi bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  await db.prepare('DELETE FROM posts WHERE id = ?').run(postId);
}

async function setListingSoldStatus(userId, postId, isSold) {
  const post = await db.prepare('SELECT * FROM posts WHERE id = ? AND author_user_id = ?').get(postId, userId);
  if (!post || post.type !== 'listing') {
    const error = new Error('İlan bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  const listing = jsonParse(post.listing_json, undefined);
  if (!listing) {
    const error = new Error('İlan verisi bulunamadı.');
    error.statusCode = 400;
    throw error;
  }

  const nextListing = {
    ...listing,
    isSold: Boolean(isSold),
    soldAt: isSold ? nowIso() : undefined,
  };
  const previousSold = Boolean(listing.isSold);

  await db.prepare('UPDATE posts SET listing_json = ?, updated_at = ? WHERE id = ?').run(
    jsonStringify(nextListing),
    nowIso(),
    postId,
  );

  const saleDelta =
    !previousSold && Boolean(isSold) ? 1 : previousSold && !Boolean(isSold) ? -1 : 0;
  if (saleDelta !== 0) {
    await adjustYearlyActivityCounters(
      userId,
      {
        saleDelta,
        relatedPostId: postId,
      },
      {},
    );
  }
}

async function toggleFollow(userId, handle) {
  const target = await getUserByHandle(handle);
  if (!target || target.id === userId) {
    const error = new Error('Takip edilecek kullanıcı bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  const existing = await db
    .prepare('SELECT 1 AS ok FROM follows WHERE follower_user_id = ? AND followed_user_id = ?')
    .get(userId, target.id);

  if (existing) {
    await db.prepare('DELETE FROM follows WHERE follower_user_id = ? AND followed_user_id = ?').run(
      userId,
      target.id,
    );
    return false;
  }

  await db.prepare(
    'INSERT INTO follows (follower_user_id, followed_user_id, created_at) VALUES (?, ?, ?)',
  ).run(userId, target.id, nowIso());
  return true;
}

async function trackListing(userId, postId, kind) {
  await db.prepare(
    'INSERT INTO listing_events (id, post_id, user_id, kind, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(randomUUID(), postId, userId || null, kind, nowIso());
}

async function createGarageVehicle(userId, payload) {
  const user = await getUserById(userId);
  if (!user) {
    const error = new Error('Kullanıcı bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  await ensureLegacyVehicleBackfill(userId, user);

  const vehicleType = normalizeGarageText(payload?.vehicleType, 120);
  const brand = normalizeGarageText(payload?.brand, 120);
  const model = normalizeGarageText(payload?.model, 120);
  if (!vehicleType || !brand || !model) {
    const error = new Error('Vasıta tipi, marka ve model zorunludur.');
    error.statusCode = 400;
    throw error;
  }

  const vehicleId = randomUUID();
  const timestamp = nowIso();
  const shouldBePrimary =
    normalizeGarageBoolean(payload?.isPrimary, false) ||
    (await countGarageVehiclesForUser(userId)) === 0;

  await db.prepare(
    `INSERT INTO garage_vehicles (
      id, user_id, vehicle_type, brand, model, generation, year, trim, engine, fuel_type,
      transmission, drivetrain, equipment_json, body_type, market_region, color, plate,
      plate_is_hidden, mileage_km, paint_map_json, show_in_profile, is_primary,
      obd_connection_status, health_score, driving_score, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    vehicleId,
    userId,
    vehicleType,
    brand,
    model,
    normalizeGarageText(payload?.generation, 120) || null,
    normalizeGarageInteger(payload?.year),
    normalizeGarageText(payload?.trim, 120) || null,
    normalizeGarageText(payload?.engine, 120) || null,
    normalizeGarageText(payload?.fuelType, 80) || null,
    normalizeGarageText(payload?.transmission, 80) || null,
    normalizeGarageText(payload?.drivetrain, 80) || null,
    jsonStringify(normalizeGarageArray(payload?.equipment, [])),
    normalizeGarageText(payload?.bodyType, 120) || null,
    normalizeGarageText(payload?.marketRegion, 120) || null,
    normalizeGarageText(payload?.color, 120) || null,
    normalizeGaragePlate(payload?.plate) || null,
    toDbBoolean(normalizeGarageBoolean(payload?.plateIsHidden, true)),
    normalizeGarageInteger(payload?.mileageKm),
    jsonStringify(normalizeGarageObject(payload?.paintMap, {})),
    toDbBoolean(normalizeGarageBoolean(payload?.showInProfile, true)),
    toDbBoolean(shouldBePrimary),
    normalizeObdConnectionStatus(payload?.obdConnectionStatus),
    normalizeGarageInteger(payload?.healthScore),
    normalizeGarageInteger(payload?.drivingScore),
    timestamp,
    timestamp,
  );

  const mediaItems = normalizeVehicleMediaInputList(payload?.media || payload?.photos);
  for (const [index, item] of mediaItems.entries()) {
    await db.prepare(
      `INSERT INTO vehicle_media (
        id, vehicle_id, user_id, url, kind, mime_type, file_name, file_size, sort_order, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      randomUUID(),
      vehicleId,
      userId,
      item.url,
      item.kind,
      item.mimeType || null,
      item.fileName || null,
      item.fileSize ?? null,
      item.sortOrder ?? index,
      timestamp,
    );
  }

  await ensureGaragePrimaryInvariant(userId, shouldBePrimary ? vehicleId : null);
  await syncLegacyVehicleJsonFromGarage(userId);
  return getGarageVehicle(userId, vehicleId);
}

async function updateGarageVehicle(userId, vehicleId, patch) {
  const row = await getGarageVehicleOwnedRow(userId, vehicleId);
  const timestamp = nowIso();
  const nextIsPrimary = hasOwnValue(patch, 'isPrimary')
    ? normalizeGarageBoolean(patch.isPrimary, Boolean(row.is_primary))
    : Boolean(row.is_primary);
  let preferredPrimaryId = nextIsPrimary ? vehicleId : null;
  if (!nextIsPrimary) {
    preferredPrimaryId =
      (await db
        .prepare(
          'SELECT id FROM garage_vehicles WHERE user_id = ? AND id != ? ORDER BY updated_at DESC, created_at DESC LIMIT 1',
        )
        .get(userId, vehicleId))?.id || vehicleId;
  }

  await db.prepare(
    `UPDATE garage_vehicles
     SET vehicle_type = ?, brand = ?, model = ?, generation = ?, year = ?, trim = ?, engine = ?,
         fuel_type = ?, transmission = ?, drivetrain = ?, equipment_json = ?, body_type = ?,
         market_region = ?, color = ?, plate = ?, plate_is_hidden = ?, mileage_km = ?,
         paint_map_json = ?, show_in_profile = ?, is_primary = ?, obd_connection_status = ?,
         health_score = ?, driving_score = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`,
  ).run(
    hasOwnValue(patch, 'vehicleType')
      ? normalizeGarageText(patch.vehicleType, 120) || row.vehicle_type
      : row.vehicle_type,
    hasOwnValue(patch, 'brand') ? normalizeGarageText(patch.brand, 120) || row.brand : row.brand,
    hasOwnValue(patch, 'model') ? normalizeGarageText(patch.model, 120) || row.model : row.model,
    hasOwnValue(patch, 'generation')
      ? normalizeGarageText(patch.generation, 120) || null
      : row.generation,
    hasOwnValue(patch, 'year') ? normalizeGarageInteger(patch.year) : row.year,
    hasOwnValue(patch, 'trim') ? normalizeGarageText(patch.trim, 120) || null : row.trim,
    hasOwnValue(patch, 'engine') ? normalizeGarageText(patch.engine, 120) || null : row.engine,
    hasOwnValue(patch, 'fuelType')
      ? normalizeGarageText(patch.fuelType, 80) || null
      : row.fuel_type,
    hasOwnValue(patch, 'transmission')
      ? normalizeGarageText(patch.transmission, 80) || null
      : row.transmission,
    hasOwnValue(patch, 'drivetrain')
      ? normalizeGarageText(patch.drivetrain, 80) || null
      : row.drivetrain,
    hasOwnValue(patch, 'equipment')
      ? jsonStringify(normalizeGarageArray(patch.equipment, []))
      : row.equipment_json,
    hasOwnValue(patch, 'bodyType')
      ? normalizeGarageText(patch.bodyType, 120) || null
      : row.body_type,
    hasOwnValue(patch, 'marketRegion')
      ? normalizeGarageText(patch.marketRegion, 120) || null
      : row.market_region,
    hasOwnValue(patch, 'color') ? normalizeGarageText(patch.color, 120) || null : row.color,
    hasOwnValue(patch, 'plate') ? normalizeGaragePlate(patch.plate) || null : row.plate,
    hasOwnValue(patch, 'plateIsHidden')
      ? toDbBoolean(normalizeGarageBoolean(patch.plateIsHidden, Boolean(row.plate_is_hidden)))
      : row.plate_is_hidden,
    hasOwnValue(patch, 'mileageKm') ? normalizeGarageInteger(patch.mileageKm) : row.mileage_km,
    hasOwnValue(patch, 'paintMap')
      ? jsonStringify(normalizeGarageObject(patch.paintMap, {}))
      : row.paint_map_json,
    hasOwnValue(patch, 'showInProfile')
      ? toDbBoolean(normalizeGarageBoolean(patch.showInProfile, Boolean(row.show_in_profile)))
      : row.show_in_profile,
    toDbBoolean(nextIsPrimary),
    hasOwnValue(patch, 'obdConnectionStatus')
      ? normalizeObdConnectionStatus(patch.obdConnectionStatus)
      : row.obd_connection_status,
    hasOwnValue(patch, 'healthScore') ? normalizeGarageInteger(patch.healthScore) : row.health_score,
    hasOwnValue(patch, 'drivingScore')
      ? normalizeGarageInteger(patch.drivingScore)
      : row.driving_score,
    timestamp,
    vehicleId,
    userId,
  );

  await ensureGaragePrimaryInvariant(userId, preferredPrimaryId);
  await syncLegacyVehicleJsonFromGarage(userId);
  return getGarageVehicle(userId, vehicleId);
}

async function deleteGarageVehicle(userId, vehicleId) {
  await getGarageVehicleOwnedRow(userId, vehicleId);
  const result = await db
    .prepare('DELETE FROM garage_vehicles WHERE id = ? AND user_id = ?')
    .run(vehicleId, userId);

  if (!result?.changes) {
    const error = new Error('Arac silinemedi.');
    error.statusCode = 404;
    throw error;
  }

  await ensureGaragePrimaryInvariant(userId);
  await syncLegacyVehicleJsonFromGarage(userId);
  return { vehicleId, deleted: true };
}

async function addGarageVehicleMedia(userId, vehicleId, payload) {
  await getGarageVehicleOwnedRow(userId, vehicleId);
  const url = normalizeGarageText(payload?.url, 2_000);
  if (!url) {
    const error = new Error('Arac medyasi icin gecerli bir URL zorunludur.');
    error.statusCode = 400;
    throw error;
  }

  const sortOrder =
    normalizeGarageInteger(payload?.sortOrder) ??
    ((await db
      .prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM vehicle_media WHERE vehicle_id = ?')
      .get(vehicleId))?.next_order ?? 0);

  const timestamp = nowIso();
  const mediaId = randomUUID();
  await db.prepare(
    `INSERT INTO vehicle_media (
      id, vehicle_id, user_id, url, kind, mime_type, file_name, file_size, sort_order, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    mediaId,
    vehicleId,
    userId,
    url,
    normalizeVehicleMediaKind(payload?.kind),
    normalizeGarageText(payload?.mimeType, 120) || null,
    normalizeGarageText(payload?.fileName, 255) || null,
    normalizeGarageInteger(payload?.fileSize),
    sortOrder,
    timestamp,
  );

  await syncLegacyVehicleJsonFromGarage(userId);
  return mapVehicleMediaRow(
    await db.prepare('SELECT * FROM vehicle_media WHERE id = ?').get(mediaId),
  );
}

async function saveGarageVehicleRegistration(userId, vehicleId, payload) {
  await getGarageVehicleOwnedRow(userId, vehicleId);
  const timestamp = nowIso();
  const registration = {
    ownerName: normalizeGarageText(payload?.ownerName, 160),
    ownerIdentifier: normalizeGarageText(payload?.ownerIdentifier, 64),
    registrationCity: normalizeGarageText(payload?.registrationCity, 120),
    registrationSerial: normalizeGarageText(payload?.registrationSerial, 64),
    registrationNumber: normalizeGarageText(payload?.registrationNumber, 64),
    issuedAt: normalizeGarageText(payload?.issuedAt, 80) || null,
  };

  await db.prepare(
    `INSERT INTO vehicle_registrations (
      vehicle_id, user_id, owner_name, owner_identifier, registration_city, registration_serial,
      registration_number, issued_at, raw_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(vehicle_id) DO UPDATE SET
      owner_name = excluded.owner_name,
      owner_identifier = excluded.owner_identifier,
      registration_city = excluded.registration_city,
      registration_serial = excluded.registration_serial,
      registration_number = excluded.registration_number,
      issued_at = excluded.issued_at,
      raw_json = excluded.raw_json,
      updated_at = excluded.updated_at`,
  ).run(
    vehicleId,
    userId,
    registration.ownerName || null,
    registration.ownerIdentifier || null,
    registration.registrationCity || null,
    registration.registrationSerial || null,
    registration.registrationNumber || null,
    registration.issuedAt,
    jsonStringify(normalizeGarageObject(payload, {})),
    timestamp,
    timestamp,
  );

  await syncLegacyVehicleJsonFromGarage(userId);
  return {
    registration: await getGarageVehicleRegistration(vehicleId),
    vehicle: await getGarageVehicle(userId, vehicleId),
  };
}

async function saveGarageVehicleChassis(userId, vehicleId, payload) {
  await getGarageVehicleOwnedRow(userId, vehicleId);
  const timestamp = nowIso();

  await db.prepare(
    `INSERT INTO vehicle_chassis (
      vehicle_id, user_id, chassis_no, engine_no, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(vehicle_id) DO UPDATE SET
      chassis_no = excluded.chassis_no,
      engine_no = excluded.engine_no,
      notes = excluded.notes,
      updated_at = excluded.updated_at`,
  ).run(
    vehicleId,
    userId,
    normalizeGarageText(payload?.chassisNo, 128) || null,
    normalizeGarageText(payload?.engineNo, 128) || null,
    normalizeGarageText(payload?.notes, 1_500) || null,
    timestamp,
    timestamp,
  );

  await syncLegacyVehicleJsonFromGarage(userId);
  return {
    chassis: await getGarageVehicleChassis(vehicleId),
    vehicle: await getGarageVehicle(userId, vehicleId),
  };
}

async function createObdSession(userId, vehicleId, payload) {
  const vehicleRow = await getGarageVehicleOwnedRow(userId, vehicleId);
  const sessionId = randomUUID();
  const timestamp = nowIso();
  const status = normalizeObdSessionStatus(payload?.status);
  const connectionType = normalizeGarageText(payload?.connectionType, 48);
  if (!connectionType) {
    const error = new Error('OBD baglanti tipi zorunludur.');
    error.statusCode = 400;
    throw error;
  }

  await db.prepare(
    `INSERT INTO obd_sessions (
      id, vehicle_id, user_id, connection_type, adapter_name, adapter_identifier, protocol,
      status, started_at, ended_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    sessionId,
    vehicleId,
    userId,
    connectionType,
    normalizeGarageText(payload?.adapterName, 160) || null,
    normalizeGarageText(payload?.adapterIdentifier, 160) || null,
    normalizeGarageText(payload?.protocol, 120) || null,
    status,
    normalizeGarageText(payload?.startedAt, 80) || timestamp,
    normalizeGarageText(payload?.endedAt, 80) || null,
    timestamp,
    timestamp,
  );

  await db
    .prepare('UPDATE garage_vehicles SET obd_connection_status = ?, updated_at = ? WHERE id = ?')
    .run(
      status === 'failed' ? 'not_connected' : status === 'completed' ? 'completed' : 'connected',
      timestamp,
      vehicleRow.id,
    );

  return mapObdSessionRow(await db.prepare('SELECT * FROM obd_sessions WHERE id = ?').get(sessionId));
}

async function appendObdReadings(userId, vehicleId, sessionId, payload) {
  await getGarageVehicleOwnedRow(userId, vehicleId);
  const session = await db
    .prepare('SELECT * FROM obd_sessions WHERE id = ? AND vehicle_id = ? AND user_id = ?')
    .get(sessionId, vehicleId, userId);

  if (!session) {
    const error = new Error('OBD oturumu bulunamadi.');
    error.statusCode = 404;
    throw error;
  }

  const readings = normalizeGarageArray(payload?.readings, []).filter(
    (item) => item && typeof item === 'object',
  );
  if (!readings.length) {
    const error = new Error('Kaydedilecek OBD okumasi bulunamadi.');
    error.statusCode = 400;
    throw error;
  }

  const timestamp = nowIso();
  for (const item of readings) {
    await db.prepare(
      `INSERT INTO obd_readings (
        id, session_id, vehicle_id, user_id, reading_type, payload_json, captured_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      randomUUID(),
      sessionId,
      vehicleId,
      userId,
      normalizeGarageText(item.type || item.readingType, 80) || 'live_sensor',
      jsonStringify(normalizeGarageObject(item.payload, item)),
      normalizeGarageText(item.capturedAt, 80) || timestamp,
    );
  }

  await db
    .prepare('UPDATE obd_sessions SET status = ?, updated_at = ? WHERE id = ?')
    .run('collecting', timestamp, sessionId);
  await db
    .prepare('UPDATE garage_vehicles SET obd_connection_status = ?, updated_at = ? WHERE id = ?')
    .run('connected', timestamp, vehicleId);

  return {
    session: mapObdSessionRow(await db.prepare('SELECT * FROM obd_sessions WHERE id = ?').get(sessionId)),
    insertedCount: readings.length,
  };
}

async function createExpertiseSession(userId, vehicleId, payload) {
  await getGarageVehicleOwnedRow(userId, vehicleId);
  const expertiseSessionId = randomUUID();
  const timestamp = nowIso();
  const hasReportPayload =
    hasOwnValue(payload, 'report') ||
    hasOwnValue(payload, 'healthScore') ||
    hasOwnValue(payload, 'drivingScore') ||
    normalizeGarageArray(payload?.dtcSummary, []).length > 0 ||
    normalizeGarageArray(payload?.sensorSummary, []).length > 0 ||
    normalizeGarageArray(payload?.riskSummary, []).length > 0 ||
    normalizeGarageArray(payload?.comparisonSummary, []).length > 0;
  const status = normalizeExpertiseSessionStatus(
    payload?.status || (hasReportPayload ? 'completed' : 'collecting'),
  );

  await db.prepare(
    `INSERT INTO expertise_sessions (
      id, vehicle_id, user_id, obd_session_id, status, drive_duration_seconds, started_at, ended_at,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    expertiseSessionId,
    vehicleId,
    userId,
    normalizeGarageText(payload?.obdSessionId, 120) || null,
    status,
    normalizeGarageInteger(payload?.driveDurationSeconds) ?? 0,
    normalizeGarageText(payload?.startedAt, 80) || timestamp,
    status === 'completed'
      ? normalizeGarageText(payload?.endedAt, 80) || timestamp
      : normalizeGarageText(payload?.endedAt, 80) || null,
    timestamp,
    timestamp,
  );

  let report = null;
  if (hasReportPayload) {
    const reportId = randomUUID();
    await db.prepare(
      `INSERT INTO expertise_reports (
        id, expertise_session_id, vehicle_id, user_id, health_score, driving_score,
        dtc_summary_json, sensor_summary_json, risk_summary_json, comparison_summary_json,
        report_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      reportId,
      expertiseSessionId,
      vehicleId,
      userId,
      normalizeGarageInteger(payload?.healthScore),
      normalizeGarageInteger(payload?.drivingScore),
      jsonStringify(normalizeGarageArray(payload?.dtcSummary, [])),
      jsonStringify(normalizeGarageArray(payload?.sensorSummary, [])),
      jsonStringify(normalizeGarageArray(payload?.riskSummary, [])),
      jsonStringify(normalizeGarageArray(payload?.comparisonSummary, [])),
      jsonStringify(normalizeGarageObject(payload?.report, {})),
      timestamp,
    );

    await db
      .prepare(
        'UPDATE garage_vehicles SET health_score = ?, driving_score = ?, updated_at = ? WHERE id = ?',
      )
      .run(
        normalizeGarageInteger(payload?.healthScore),
        normalizeGarageInteger(payload?.drivingScore),
        timestamp,
        vehicleId,
      );

    report = mapExpertiseReportRow(
      await db.prepare('SELECT * FROM expertise_reports WHERE id = ?').get(reportId),
    );
  }

  await syncLegacyVehicleJsonFromGarage(userId);

  return {
    session: {
      id: expertiseSessionId,
      vehicleId,
      userId,
      obdSessionId: normalizeGarageText(payload?.obdSessionId, 120) || null,
      status,
      driveDurationSeconds: normalizeGarageInteger(payload?.driveDurationSeconds) ?? 0,
      startedAt: normalizeGarageText(payload?.startedAt, 80) || timestamp,
      endedAt:
        status === 'completed'
          ? normalizeGarageText(payload?.endedAt, 80) || timestamp
          : normalizeGarageText(payload?.endedAt, 80) || null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    report,
  };
}

async function listExpertiseReports(userId, vehicleId) {
  await getGarageVehicleOwnedRow(userId, vehicleId);
  const rows = await db
    .prepare('SELECT * FROM expertise_reports WHERE vehicle_id = ? ORDER BY created_at DESC')
    .all(vehicleId);
  return rows.map(mapExpertiseReportRow);
}

async function saveOnboarding(userId, payload) {
  const user = await getUserById(userId);
  if (!user) {
    const error = new Error('Kullanıcı bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  const profile = payload.profile || {};
  const settings = {
    ...parseSettings(user),
    ...(payload.settings || {}),
  };

  const nextHandle = normalizeHandle(profile.handle || user.handle);
  const nextEmail = payload.settings?.email?.trim() ? normalizeEmail(payload.settings.email) : user.email;
  const nextPhone = payload.settings?.phone?.trim() ? normalizePhone(payload.settings.phone) : user.phone;

  await requireUniqueUser(
    nextHandle,
    sanitizeStoredEmail(nextEmail),
    sanitizeStoredPhone(nextPhone),
    userId,
  );

  await db.prepare(
    `UPDATE users
     SET name = ?, handle = ?, bio = ?, email = ?, phone = ?, email_lookup = ?, phone_lookup = ?,
         avatar_uri = ?, cover_uri = ?, membership_plan = ?, settings_json = ?, vehicle_json = ?,
         profile_segment = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    profile.name?.trim() || user.name,
    nextHandle,
    profile.bio?.trim() || user.bio,
    encryptText(nextEmail),
    encryptText(nextPhone),
    makeLookupHash(nextEmail),
    makeLookupHash(nextPhone),
    profile.avatarUri || user.avatar_uri || null,
    profile.coverUri || user.cover_uri || null,
    settings.membershipPlan || user.membership_plan,
    encryptJson({
      ...settings,
      email: sanitizeStoredEmail(nextEmail),
      phone: sanitizeStoredPhone(nextPhone),
    }),
    payload.vehicle ? encryptJson(payload.vehicle) : user.vehicle_json || null,
    payload.profileSegment || user.profile_segment || defaultProfileSegment,
    nowIso(),
    userId,
  );
}

async function updateSettings(userId, patch) {
  const user = await getUserById(userId);
  if (!user) {
    const error = new Error('Kullanıcı bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  const nextSettings = {
    ...parseSettings(user),
    ...patch,
  };
  const nextEmail = patch.email?.trim() ? normalizeEmail(patch.email) : user.email;
  const nextPhone = patch.phone?.trim() ? normalizePhone(patch.phone) : user.phone;

  await requireUniqueUser(
    user.handle,
    sanitizeStoredEmail(nextEmail),
    sanitizeStoredPhone(nextPhone),
    userId,
  );

  await db.prepare(
    `UPDATE users
     SET email = ?, phone = ?, email_lookup = ?, phone_lookup = ?, membership_plan = ?,
         settings_json = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    encryptText(nextEmail),
    encryptText(nextPhone),
    makeLookupHash(nextEmail),
    makeLookupHash(nextPhone),
    nextSettings.membershipPlan || user.membership_plan,
    encryptJson({
      ...nextSettings,
      email: sanitizeStoredEmail(nextEmail),
      phone: sanitizeStoredPhone(nextPhone),
    }),
    nowIso(),
    userId,
  );
}

async function updateProfileMedia(userId, payload) {
  await db.prepare(
    'UPDATE users SET avatar_uri = COALESCE(?, avatar_uri), cover_uri = COALESCE(?, cover_uri), updated_at = ? WHERE id = ?',
  ).run(payload.avatarUri || null, payload.coverUri || null, nowIso(), userId);
}

function resolveMembershipPlan(productId) {
  const normalized = String(productId || '').toLocaleLowerCase('tr');
  if (normalized.includes('year')) {
    return 'Premium Yıllık';
  }
  if (normalized.includes('month') || normalized.includes('aylik') || normalized.includes('monthly')) {
    return 'Premium Aylık';
  }

  return 'Premium Üyelik';
}

async function updateUserMembership(userId, payload) {
  const user = await getUserById(userId);
  if (!user) {
    const error = new Error('Kullanıcı bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  const nextSettings = {
    ...parseSettings(user),
    membershipPlan: payload.membershipPlan,
    membershipSource: payload.membershipSource,
    membershipProductId: payload.productId,
    membershipActivatedAt: payload.activatedAt,
    membershipExpiresAt: payload.expiresAt || '',
  };

  await db.prepare(
    `UPDATE users
     SET membership_plan = ?, settings_json = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    payload.membershipPlan,
    encryptJson({
      ...nextSettings,
      email: sanitizeStoredEmail(user.email),
      phone: sanitizeStoredPhone(user.phone),
    }),
    nowIso(),
    userId,
  );
}

async function activatePremiumMembership(userId, payload, requestMeta) {
  if (!payload?.productId || !payload?.purchaseToken || !payload?.transactionId) {
    const error = new Error('Premium satın alma kaydında ürün, purchase token ve transaction bilgisi zorunludur.');
    error.statusCode = 400;
    throw error;
  }

  const subscriptionConsents = assertSubscriptionTermsConsent(payload.consents, {
    message:
      'Premium veya abonelik aktivasyonu icin dijital hizmet ve abonelik kosullarini kabul etmelisiniz.',
  });

  let verification;
  let membershipSource = 'google_play';

  if (payload.platform === 'android') {
    verification = await verifyGooglePlaySubscriptionPurchase({
      packageName: payload.packageName || config.googlePlayPackageName,
      productId: payload.productId,
      purchaseToken: payload.purchaseToken,
    });

    if (!verification.isEntitlementActive) {
      const error = new Error('Google Play kaydı aktif premium üyelik göstermiyor.');
      error.statusCode = 400;
      throw error;
    }
  } else if (payload.platform === 'ios') {
    verification = await verifyAppStoreSubscriptionPurchase({
      transactionId: payload.transactionId,
      productId: payload.productId,
    });

    if (!verification.isEntitlementActive) {
      const error = new Error('App Store kaydı aktif premium üyelik göstermiyor.');
      error.statusCode = 400;
      throw error;
    }

    membershipSource = 'app_store';
  } else {
    const error = new Error('Premium üyelik doğrulamasında desteklenmeyen platform.');
    error.statusCode = 400;
    throw error;
  }

  const activatedAt = nowIso();
  const membershipPlan = resolveMembershipPlan(verification.productId || payload.productId);
  const tokenLookup = makeLookupHash(payload.purchaseToken);

  await db.prepare(
    `INSERT INTO digital_purchases (
      id, user_id, platform, product_id, purchase_token_lookup, purchase_token, transaction_id,
      order_id, status, purchase_payload_json, verification_payload_json, expires_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(purchase_token_lookup) DO UPDATE SET
      user_id = excluded.user_id,
      platform = excluded.platform,
      product_id = excluded.product_id,
      transaction_id = excluded.transaction_id,
      order_id = excluded.order_id,
      status = excluded.status,
      purchase_payload_json = excluded.purchase_payload_json,
      verification_payload_json = excluded.verification_payload_json,
      expires_at = excluded.expires_at,
      updated_at = excluded.updated_at`,
  ).run(
    randomUUID(),
    userId,
    payload.platform,
    verification.productId || payload.productId,
    tokenLookup,
    encryptText(payload.purchaseToken),
    payload.transactionId,
    verification.latestOrderId || verification.orderId || '',
    verification.subscriptionState || verification.environment || 'ACTIVE',
    encryptJson(payload),
    encryptJson(verification.raw || verification.decoded || {}),
    verification.expiryTime || verification.expiresAt || '',
    activatedAt,
    activatedAt,
  );

  await updateUserMembership(userId, {
    membershipPlan,
    membershipSource,
    productId: verification.productId || payload.productId,
    activatedAt,
    expiresAt: verification.expiryTime || verification.expiresAt || '',
  });

  await storeContextualConsents(
    userId,
    subscriptionConsents,
    CONSENT_REQUIREMENTS.subscription,
    requestMeta,
  );

  return {
    membershipPlan,
    membershipExpiresAt: verification.expiryTime || verification.expiresAt || '',
    membershipSource,
  };
}

async function getDirectConversationBetween(firstUserId, secondUserId) {
  const rows = await db
    .prepare(
      `SELECT c.id
       FROM conversations c
       JOIN conversation_participants cp ON cp.conversation_id = c.id
       WHERE c.type = 'direct'
       GROUP BY c.id
       HAVING SUM(CASE WHEN cp.user_id = ? THEN 1 ELSE 0 END) > 0
          AND SUM(CASE WHEN cp.user_id = ? THEN 1 ELSE 0 END) > 0
          AND COUNT(*) = 2`,
    )
    .all(firstUserId, secondUserId);

  return rows[0]?.id ?? null;
}

async function getListingConversationBetween(firstUserId, secondUserId, postId) {
  const rows = await db
    .prepare(
      `SELECT c.id
       FROM conversations c
       JOIN conversation_participants cp ON cp.conversation_id = c.id
       WHERE c.type = 'listing' AND c.context_post_id = ?
       GROUP BY c.id
       HAVING SUM(CASE WHEN cp.user_id = ? THEN 1 ELSE 0 END) > 0
          AND SUM(CASE WHEN cp.user_id = ? THEN 1 ELSE 0 END) > 0
          AND COUNT(*) = 2`,
    )
    .all(postId, firstUserId, secondUserId);

  return rows[0]?.id ?? null;
}

async function ensureDirectConversation(userId, handle) {
  const target = await getUserByHandle(handle);
  if (!target) {
    const error = new Error('Mesajlaşılacak kullanıcı bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  const existing = await getDirectConversationBetween(userId, target.id);
  if (existing) {
    return existing;
  }

  const conversationId = randomUUID();
  await db.prepare(
    'INSERT INTO conversations (id, type, name, handle, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(conversationId, 'direct', target.name, target.handle, nowIso());

  const insert = db.prepare(
    'INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)',
  );
  await insert.run(conversationId, userId);
  await insert.run(conversationId, target.id);

  return conversationId;
}

async function ensureListingConversation(userId, postId) {
  const post = await db.prepare('SELECT * FROM posts WHERE id = ?').get(postId);
  if (!post || post.type !== 'listing') {
    const error = new Error('Ilan bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  if (post.author_user_id === userId) {
    const error = new Error('Kendi ilaniniza ilan sohbeti acamazsiniz.');
    error.statusCode = 400;
    throw error;
  }

  const listing = await hydrateListing(post);
  if (!canViewerSeeListing(post, listing, userId)) {
    const error = new Error('Bu ilan su anda ek inceleme surecinde oldugu icin sohbet acilamaz.');
    error.statusCode = 403;
    throw error;
  }

  const seller = await getUserById(post.author_user_id);
  if (!seller) {
    const error = new Error('Ilan sahibi bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  const existing = await getListingConversationBetween(userId, seller.id, postId);
  if (existing) {
    await ensureListingTransaction(existing, postId, userId, seller.id);
    return existing;
  }

  const conversationId = randomUUID();
  await db.prepare(
    `INSERT INTO conversations (
      id, type, name, handle, context_post_id, buyer_user_id, seller_user_id, buyer_agreed_at, seller_agreed_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    conversationId,
    'listing',
    listing?.title || seller.name,
    seller.handle,
    postId,
    userId,
    seller.id,
    null,
    null,
    nowIso(),
  );

  const insert = db.prepare(
    'INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)',
  );
  await insert.run(conversationId, userId);
  await insert.run(conversationId, seller.id);

  await ensureListingTransaction(conversationId, postId, userId, seller.id);

  return conversationId;
}

async function createGroupConversation(userId, handles, name) {
  const users = (
    await Promise.all([...new Set(handles)].map((handle) => getUserByHandle(handle)))
  ).filter(Boolean);

  const conversationId = randomUUID();
  await db.prepare(
    'INSERT INTO conversations (id, type, name, handle, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(
    conversationId,
    'group',
    name?.trim() || 'Yeni grup',
    `#grup-${conversationId.slice(0, 8)}`,
    nowIso(),
  );

  const insert = db.prepare(
    'INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)',
  );
  await insert.run(conversationId, userId);
  for (const user of users) {
    await insert.run(conversationId, user.id);
  }

  return conversationId;
}

async function toggleListingAgreement(userId, conversationId) {
  await ensureConversationAccess(userId, conversationId);

  const conversation = await db
    .prepare('SELECT * FROM conversations WHERE id = ?')
    .get(conversationId);

  if (!conversation || conversation.type !== 'listing') {
    const error = new Error('Ilan sohbeti bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  if (conversation.buyer_user_id === userId) {
    const nextValue = conversation.buyer_agreed_at ? null : nowIso();
    await db.prepare('UPDATE conversations SET buyer_agreed_at = ? WHERE id = ?').run(
      nextValue,
      conversationId,
    );
    await appendAuditLog({
      actorType: 'user',
      actorId: userId,
      targetType: 'conversation',
      targetId: conversationId,
      action: 'deal.agreement_toggled',
      metadata: {
        role: 'buyer',
        agreed: Boolean(nextValue),
        listingId: conversation.context_post_id || null,
      },
    });
    return;
  }

  if (conversation.seller_user_id === userId) {
    const nextValue = conversation.seller_agreed_at ? null : nowIso();
    await db.prepare('UPDATE conversations SET seller_agreed_at = ? WHERE id = ?').run(
      nextValue,
      conversationId,
    );
    await appendAuditLog({
      actorType: 'user',
      actorId: userId,
      targetType: 'conversation',
      targetId: conversationId,
      action: 'deal.agreement_toggled',
      metadata: {
        role: 'seller',
        agreed: Boolean(nextValue),
        listingId: conversation.context_post_id || null,
      },
    });
    return;
  }

  const error = new Error('Bu ilan sohbetinde anlasma islemi yapamazsiniz.');
  error.statusCode = 403;
  throw error;
}

async function shareListingRegistration(userId, conversationId, payload = {}, requestMeta) {
  await ensureConversationAccess(userId, conversationId);

  const conversation = await db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId);
  if (!conversation || conversation.type !== 'listing') {
    const error = new Error('İlan sohbeti bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  if (conversation.seller_user_id !== userId) {
    const error = new Error('Ruhsat bilgilerini yalnızca satıcı paylaşabilir.');
    error.statusCode = 403;
    throw error;
  }

  if (!conversation.buyer_agreed_at || !conversation.seller_agreed_at) {
    const error = new Error('Ruhsat paylaşımı için iki tarafın da anlaştık onayı gerekir.');
    error.statusCode = 400;
    throw error;
  }

  await acknowledgeSafePaymentInformation(
    userId,
    conversation.context_post_id,
    payload.consents,
    requestMeta,
  );

  const post = await db.prepare('SELECT * FROM posts WHERE id = ?').get(conversation.context_post_id);
  const listing = post ? jsonParse(post.listing_json, undefined) : undefined;
  const registrationInfo = listing?.registrationInfo;

  if (!registrationInfo || !Object.values(registrationInfo).every(Boolean)) {
    const error = new Error('İlan üzerinde eksiksiz ruhsat bilgisi bulunmuyor.');
    error.statusCode = 400;
    throw error;
  }

  await ensureListingTransaction(
    conversationId,
    conversation.context_post_id,
    conversation.buyer_user_id,
    conversation.seller_user_id,
  );

  await db.prepare(
    `UPDATE listing_transactions
     SET registration_json = ?, registration_shared_at = ?, payment_status = ?, updated_at = ?
     WHERE conversation_id = ?`,
  ).run(
    encryptJson(registrationInfo),
    nowIso(),
    'awaiting_quote',
    nowIso(),
    conversationId,
  );

  await appendAuditLog({
    actorType: 'user',
    actorId: userId,
    targetType: 'conversation',
    targetId: conversationId,
    action: 'deal.registration_shared',
    metadata: {
      listingId: conversation.context_post_id,
      paymentStatus: 'awaiting_quote',
      fieldsShared: Object.keys(registrationInfo || {}),
    },
    ipAddress: requestMeta?.ipAddress || null,
    userAgent: requestMeta?.userAgent || null,
  });
}

async function listAdminDeals() {
  const rows = await db
    .prepare(
      `SELECT lt.*, c.context_post_id, c.buyer_agreed_at, c.seller_agreed_at
       FROM listing_transactions lt
       JOIN conversations c ON c.id = lt.conversation_id
       ORDER BY lt.updated_at DESC, lt.created_at DESC`,
    )
    .all();

  return await Promise.all(
    rows.map(async (row) => {
      const post = await db.prepare('SELECT * FROM posts WHERE id = ?').get(row.post_id);
      const buyer = await getUserById(row.buyer_user_id);
      const seller = await getUserById(row.seller_user_id);
      const listing = post ? jsonParse(post.listing_json, undefined) : undefined;
      const buyerSettings = buyer ? parseSettings(buyer) : undefined;
      const sellerSettings = seller ? parseSettings(seller) : undefined;
      const registrationInfo = row.registration_json
        ? decryptJson(row.registration_json, jsonParse(row.registration_json, undefined))
        : undefined;

      return repairBrokenTurkishText({
        conversationId: row.conversation_id,
        postId: row.post_id,
        status: row.payment_status,
        quoteAmount: row.insurance_quote_amount || '',
        paymentReference: row.payment_reference || '',
        registrationSharedAt: row.registration_shared_at || '',
        paymentRequestedAt: row.payment_requested_at || '',
        paymentPaidAt: row.payment_paid_at || '',
        policyUri: row.policy_uri || '',
        invoiceUri: row.invoice_uri || '',
        policySentAt: row.policy_sent_at || '',
        buyerAgreed: Boolean(row.buyer_agreed_at),
        sellerAgreed: Boolean(row.seller_agreed_at),
        listing: listing
          ? {
              title: listing.title,
              price: listing.price,
              location: listing.location,
              isSold: Boolean(listing.isSold),
            }
          : undefined,
        buyer: buyer
          ? {
              id: buyer.id,
              name: buyer.name,
              handle: buyer.handle,
              email: sanitizeStoredEmail(buyer.email),
              phone: sanitizeStoredPhone(buyer.phone),
              identityNumber: buyerSettings?.identityNumber || '',
              birthDate: buyerSettings?.birthDate || '',
              addressLine: buyerSettings?.addressLine || '',
              city: buyerSettings?.city || '',
              district: buyerSettings?.district || '',
            }
          : undefined,
        seller: seller
          ? {
              id: seller.id,
              name: seller.name,
              handle: seller.handle,
              email: sanitizeStoredEmail(seller.email),
              phone: sanitizeStoredPhone(seller.phone),
              identityNumber: sellerSettings?.identityNumber || '',
              birthDate: sellerSettings?.birthDate || '',
              addressLine: sellerSettings?.addressLine || '',
              city: sellerSettings?.city || '',
              district: sellerSettings?.district || '',
            }
          : undefined,
        registrationInfo,
      });
    }),
  );
}

async function setInsuranceQuote(conversationId, amount, options = {}) {
  const transaction = await getListingTransaction(conversationId);
  if (!transaction) {
    const error = new Error('Sigorta işlemi bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  const normalizedAmount = String(amount || '').trim();
  if (!normalizedAmount) {
    const error = new Error('Sigorta teklif tutarı zorunludur.');
    error.statusCode = 400;
    throw error;
  }

  await db.prepare(
    `UPDATE listing_transactions
     SET insurance_quote_amount = ?, payment_status = ?, updated_at = ?
     WHERE conversation_id = ?`,
  ).run(normalizedAmount, 'quoted', nowIso(), conversationId);

  await appendAuditLog({
    actorType: 'admin',
    actorId: options?.adminId || null,
    targetType: 'insurance_quote',
    targetId: conversationId,
    action: 'insurance.quote_set',
    metadata: {
      amount: normalizedAmount,
      listingId: transaction.post_id,
      buyerUserId: transaction.buyer_user_id,
      sellerUserId: transaction.seller_user_id,
    },
    ipAddress: options?.ipAddress || null,
    userAgent: options?.userAgent || null,
  });
}

async function createInsurancePayment(userId, conversationId, payload = {}, requestMeta) {
  await ensureConversationAccess(userId, conversationId);

  const conversation = await db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationId);
  const transaction = await getListingTransaction(conversationId);
  if (!conversation || conversation.type !== 'listing' || !transaction) {
    const error = new Error('Sigorta işlemi bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  if (conversation.buyer_user_id !== userId) {
    const error = new Error('Sigorta ödeme adımı yalnızca alıcı için açıktır.');
    error.statusCode = 403;
    throw error;
  }

  if (!transaction.registration_shared_at) {
    const error = new Error('Önce satıcının ruhsat bilgilerini paylaşması gerekir.');
    error.statusCode = 400;
    throw error;
  }

  if (!transaction.insurance_quote_amount) {
    const error = new Error('Admin tarafından sigorta teklifi henüz girilmedi.');
    error.statusCode = 400;
    throw error;
  }

  if (!config.paymentProxyUrl) {
    const error = new Error('Ödeme altyapısı yapılandırılmadı.');
    error.statusCode = 503;
    throw error;
  }

  await acknowledgeSafePaymentInformation(
    userId,
    conversation.context_post_id,
    payload.consents,
    requestMeta,
  );

  const buyer = await getUserById(conversation.buyer_user_id);
  const seller = await getUserById(conversation.seller_user_id);
  const post = await db.prepare('SELECT * FROM posts WHERE id = ?').get(conversation.context_post_id);
  const listing = post ? jsonParse(post.listing_json, undefined) : undefined;

  const existingPaymentRecord = await findLatestListingPaymentRecord(
    userId,
    conversation.context_post_id,
    ['insurance_related'],
    [
      PAYMENT_STATUS_INITIATED,
      PAYMENT_STATUS_PENDING,
      PAYMENT_STATUS_SUCCESS,
      PAYMENT_STATUS_FAILED,
      LEGACY_PAYMENT_STATUS_PAID,
      LEGACY_PAYMENT_STATUS_REDIRECT_READY,
      LEGACY_PAYMENT_STATUS_CANCELLED,
    ],
  );

  if (existingPaymentRecord && isPaymentSuccessLike(existingPaymentRecord.status)) {
    return buildInsurancePaymentStatusSummary(existingPaymentRecord, transaction, listing);
  }

  if (
    existingPaymentRecord &&
    isPaymentPendingLike(existingPaymentRecord.status) &&
    existingPaymentRecord?.metadata?.redirectUrl &&
    existingPaymentRecord?.externalRef
  ) {
    return buildInsurancePaymentStatusSummary(existingPaymentRecord, transaction, listing);
  }

  if (existingPaymentRecord && isRetryablePaymentStatus(existingPaymentRecord.status) && !canRetryPaymentRecord(existingPaymentRecord)) {
    const updatedForReview = await updatePaymentRecordById(existingPaymentRecord.id, {
      status: PAYMENT_STATUS_FAILED,
      metadata: {
        manualReviewRequired: true,
        manualReviewReason: 'insurance_retry_limit_reached',
        manualReviewRequestedAt: nowIso(),
      },
    });

    await appendAuditLog({
      actorType: 'system',
      actorId: null,
      targetType: 'payment',
      targetId: updatedForReview.id,
      action: 'billing.payment_manual_review_required',
      metadata: {
        conversationId,
        listingId: conversation.context_post_id,
        reason: 'insurance_retry_limit_reached',
      },
      ipAddress: requestMeta?.ipAddress || null,
      userAgent: requestMeta?.userAgent || null,
    });

    const error = new Error(
      'Odeme islemi birden fazla kez basarisiz oldu. Kayit manuel incelemeye alindi.',
    );
    error.statusCode = 409;
    throw error;
  }

  const paymentRecord =
    existingPaymentRecord && canRetryPaymentRecord(existingPaymentRecord)
      ? await updatePaymentRecordById(existingPaymentRecord.id, {
          status: PAYMENT_STATUS_INITIATED,
          amount: transaction.insurance_quote_amount,
          currency: 'TRY',
          provider: 'garanti_virtual_pos',
          metadata: {
            conversationId,
            listingId: conversation.context_post_id,
            insuranceType: payload.insuranceType || 'Trafik sigortasi',
            listingTitle: listing?.title || '',
            listingPrice: listing?.price || '',
            listingLocation: listing?.location || '',
            retryCount: getPaymentRetryCount(existingPaymentRecord) + 1,
            manualReviewRequired: false,
            manualReviewReason: null,
          },
        })
      : existingPaymentRecord && isPaymentPendingLike(existingPaymentRecord.status)
      ? existingPaymentRecord
      : await createPaymentRecord({
          userId,
          listingId: conversation.context_post_id,
          type: 'insurance_related',
          amount: transaction.insurance_quote_amount,
          currency: 'TRY',
          provider: 'garanti_virtual_pos',
          status: PAYMENT_STATUS_INITIATED,
          metadata: {
            conversationId,
            listingId: conversation.context_post_id,
            insuranceType: payload.insuranceType || 'Trafik sigortasi',
            listingTitle: listing?.title || '',
            listingPrice: listing?.price || '',
            listingLocation: listing?.location || '',
            retryCount: 0,
          },
        });

  await appendAuditLog({
    actorType: 'user',
    actorId: userId,
    targetType: 'payment',
    targetId: paymentRecord.id,
    action: 'payment.start',
    metadata: {
      conversationId,
      listingId: conversation.context_post_id,
      amount: transaction.insurance_quote_amount,
      provider: 'garanti_virtual_pos',
      paymentRecordId: paymentRecord.id,
    },
    ipAddress: requestMeta?.ipAddress || null,
    userAgent: requestMeta?.userAgent || null,
  });

  let response;
  let data;
  try {
    response = await fetch(`${config.paymentProxyUrl}/api/pay/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
        body: JSON.stringify({
          conversationId,
          orderType: 'insurance',
          paymentRecordId: paymentRecord.id,
          amount: transaction.insurance_quote_amount,
          currency: 'TRY',
          customerIpAddress: requestMeta?.ipAddress || '',
          callbackUrl: `${config.publicBaseUrl}/api/billing/garanti/callback`,
          buyer: buyer
            ? {
              name: buyer.name,
              email: sanitizeStoredEmail(buyer.email),
              phone: sanitizeStoredPhone(buyer.phone),
              settings: parseSettings(buyer),
            }
          : undefined,
        seller: seller
          ? {
              name: seller.name,
              email: sanitizeStoredEmail(seller.email),
              phone: sanitizeStoredPhone(seller.phone),
              settings: parseSettings(seller),
            }
          : undefined,
        listing,
        metadata: {
          userId,
          listingId: conversation.context_post_id,
          conversationId,
          insuranceType: payload.insuranceType || 'Trafik sigortasi',
          listingTitle: listing?.title || '',
          listingPrice: listing?.price || '',
          listingLocation: listing?.location || '',
          paymentPageBaseUrl: config.paymentPageBaseUrl,
        },
      }),
    });
    data = await response.json().catch(() => ({}));
  } catch (error) {
    await updatePaymentRecordById(paymentRecord.id, {
      status: PAYMENT_STATUS_FAILED,
      metadata: {
        checkoutError: error.message,
        checkoutFailedAt: nowIso(),
      },
    });

    await appendAuditLog({
      actorType: 'user',
      actorId: userId,
      targetType: 'payment',
      targetId: paymentRecord.id,
      action: 'payment.result',
      metadata: {
        conversationId,
        listingId: conversation.context_post_id,
        result: PAYMENT_STATUS_FAILED,
        reason: 'checkout_init_failed',
        errorMessage: error.message,
      },
      ipAddress: requestMeta?.ipAddress || null,
      userAgent: requestMeta?.userAgent || null,
    });

    throw error;
  }

  if (!response.ok || !data?.paymentReference || !data?.paymentUrl) {
    await updatePaymentRecordById(paymentRecord.id, {
      status: PAYMENT_STATUS_FAILED,
      metadata: {
        checkoutError: data?.message || 'payment_proxy_error',
        checkoutFailedAt: nowIso(),
      },
    });

    await appendAuditLog({
      actorType: 'user',
      actorId: userId,
      targetType: 'payment',
      targetId: paymentRecord.id,
      action: 'payment.result',
      metadata: {
        conversationId,
        listingId: conversation.context_post_id,
        result: PAYMENT_STATUS_FAILED,
        reason: 'checkout_init_failed',
        errorMessage: data?.message || 'Odeme istegi olusturulamadi.',
      },
      ipAddress: requestMeta?.ipAddress || null,
      userAgent: requestMeta?.userAgent || null,
    });

    const error = new Error(data?.message || 'Ödeme isteği oluşturulamadı.');
    error.statusCode = response.status || 502;
    throw error;
  }

  const returnUrls = data?.returnUrls || buildPaymentReturnUrls(data.paymentReference, conversationId);
  const updatedPaymentRecord = await updatePaymentRecordById(paymentRecord.id, {
    status: PAYMENT_STATUS_PENDING,
    externalRef: data.paymentReference,
    metadata: {
      conversationId,
      listingId: conversation.context_post_id,
      insuranceType: payload.insuranceType || 'Trafik sigortasi',
      listingTitle: listing?.title || '',
      listingPrice: listing?.price || '',
      listingLocation: listing?.location || '',
      redirectUrl: data.paymentUrl,
      gatewayUrl: data.gatewayUrl || '',
      returnUrls,
      lastRedirectReadyAt: nowIso(),
    },
  });

  await db.prepare(
    `UPDATE listing_transactions
       SET payment_reference = ?, payment_requested_at = ?, payment_status = ?, updated_at = ?
       WHERE conversation_id = ?`,
  ).run(data.paymentReference, nowIso(), 'payment_pending', nowIso(), conversationId);

  await appendAuditLog({
    actorType: 'user',
    actorId: userId,
    targetType: 'payment',
    targetId: updatedPaymentRecord?.id || data.paymentReference,
    action: 'payment.redirect',
    metadata: {
      conversationId,
      listingId: conversation.context_post_id,
      amount: transaction.insurance_quote_amount,
      provider: 'garanti_virtual_pos',
      paymentReference: data.paymentReference,
      redirectUrl: data.paymentUrl,
      gatewayUrl: data.gatewayUrl || '',
    },
    ipAddress: requestMeta?.ipAddress || null,
    userAgent: requestMeta?.userAgent || null,
  });

  await appendAuditLog({
    actorType: 'user',
    actorId: userId,
    targetType: 'payment',
    targetId: data.paymentReference,
    action: 'insurance.payment_requested',
    metadata: {
      conversationId,
      listingId: conversation.context_post_id,
      amount: transaction.insurance_quote_amount,
      provider: 'garanti_virtual_pos',
      paymentReference: data.paymentReference,
      redirectUrl: data.paymentUrl,
    },
    ipAddress: requestMeta?.ipAddress || null,
    userAgent: requestMeta?.userAgent || null,
  });

  return buildInsurancePaymentStatusSummary(updatedPaymentRecord, transaction, listing);
}

async function getPaymentSession(paymentReference) {
  const normalizedReference = String(paymentReference || '').trim();
  if (!normalizedReference) {
    const error = new Error('Odeme referansi zorunludur.');
    error.statusCode = 400;
    throw error;
  }

  const paymentRecord = await getPaymentRecordByExternalRef(normalizedReference);
  if (!paymentRecord) {
    const error = new Error('Odeme oturumu bulunamadi.');
    error.statusCode = 404;
    throw error;
  }

  const conversationId = paymentRecord.metadata?.conversationId || '';
  const transaction = conversationId ? await getListingTransaction(conversationId) : null;
  const postId = paymentRecord.listingId || transaction?.post_id || null;
  const post = postId ? await db.prepare('SELECT * FROM posts WHERE id = ?').get(postId) : null;
  const listing = post ? jsonParse(post.listing_json, undefined) : undefined;

  return buildInsurancePaymentStatusSummary(paymentRecord, transaction, listing);
}

async function recordInsurancePayment(conversationId, paymentReference) {
  const transaction = await getListingTransaction(conversationId);
  if (!transaction) {
    const error = new Error('Sigorta işlemi bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  if (
    transaction.payment_paid_at &&
    ['processing', 'policy_sent'].includes(String(transaction.payment_status || ''))
  ) {
    return;
  }

  await db.prepare(
      `UPDATE listing_transactions
       SET payment_reference = COALESCE(?, payment_reference), payment_paid_at = ?, payment_status = ?, updated_at = ?
       WHERE conversation_id = ?`,
  ).run(paymentReference || transaction.payment_reference, nowIso(), 'processing', nowIso(), conversationId);

  await appendAuditLog({
    actorType: 'system',
    actorId: null,
    targetType: 'payment',
    targetId: paymentReference || transaction.payment_reference,
    action: 'insurance.payment_confirmed',
    metadata: {
      conversationId,
      listingId: transaction.post_id,
      buyerUserId: transaction.buyer_user_id,
      sellerUserId: transaction.seller_user_id,
      nextStatus: 'processing',
    },
  });

  const buyer = await getUserById(transaction.buyer_user_id);
  const post = await db.prepare('SELECT * FROM posts WHERE id = ?').get(transaction.post_id);
  const listing = post ? jsonParse(post.listing_json, undefined) : undefined;
  const buyerEmail = buyer ? sanitizeStoredEmail(buyer.email) : '';

    if (buyerEmail) {
      await sendTemplatedMail({
        to: buyerEmail,
        subject: 'Carloi sigorta odemeniz alindi',
        text:
        `Merhaba,\n\n${listing?.title || 'Araciniz'} icin sigorta odemeniz basariyla alindi.\n` +
        'Sigorta kesim islemi kisa sure icinde baslatilacaktir.\n\nCarloi',
      html:
        `<p>Merhaba,</p><p><strong>${listing?.title || 'Araciniz'}</strong> icin sigorta odemeniz basariyla alindi.</p>` +
        '<p>Sigorta kesim islemi kisa sure icinde baslatilacaktir.</p><p>Carloi</p>',
    });
    }

    await appendSystemConversationMessage(
      conversationId,
      'Sigorta isleminiz baslatildi.',
    );
  }

async function sendInsurancePolicyMail(conversationId, payload = {}, options = {}) {
  const transaction = await getListingTransaction(conversationId);
  if (!transaction) {
    const error = new Error('Sigorta işlemi bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  const buyer = await getUserById(transaction.buyer_user_id);
  const post = await db.prepare('SELECT * FROM posts WHERE id = ?').get(transaction.post_id);
  const listing = post ? jsonParse(post.listing_json, undefined) : undefined;
  const buyerEmail = buyer ? sanitizeStoredEmail(buyer.email) : '';

  if (!buyerEmail) {
    const error = new Error('Alıcı için e-posta adresi bulunamadı.');
    error.statusCode = 400;
    throw error;
  }

  const policyUrl = String(
    typeof payload === 'string' ? payload : payload?.policyUrl || '',
  ).trim();
  const invoiceUrl = String(
    typeof payload === 'string' ? '' : payload?.invoiceUrl || '',
  ).trim();

  if (!policyUrl || !invoiceUrl) {
    const error = new Error('Poliçe ve fatura baglantilari zorunludur.');
    error.statusCode = 400;
    throw error;
  }

  if (!isSafePdfDeliveryUrl(policyUrl) || !isSafePdfDeliveryUrl(invoiceUrl)) {
    await appendAuditLog({
      actorType: 'admin',
      actorId: options?.adminId || null,
      targetType: 'insurance_delivery',
      targetId: conversationId,
      action: 'insurance.delivery_blocked',
      metadata: {
        reason: 'unsafe_attachment_url',
        hasPolicyUrl: Boolean(policyUrl),
        hasInvoiceUrl: Boolean(invoiceUrl),
      },
      ipAddress: options?.ipAddress || null,
      userAgent: options?.userAgent || null,
    });
    logWarn('insurance.delivery.blocked', {
      conversationId,
      reason: 'unsafe_attachment_url',
      policyUrl,
      invoiceUrl,
    });
    const error = new Error('Poliçe veya fatura baglantisi guvenli bir PDF adresi degil.');
    error.statusCode = 400;
    throw error;
  }

  try {
    await sendTemplatedMail({
      to: buyerEmail,
      subject: 'Carloi sigorta evraklariniz hazir',
      text:
        `Merhaba,\n\n${listing?.title || 'Araciniz'} icin sigorta isleminiz tamamlandi.\n` +
        `Policeniz: ${policyUrl}\n` +
        `Faturaniz: ${invoiceUrl}\n\n` +
        'Platform resmi odeme saglayicisi degildir; resmi surec takip edilmelidir.\n\nCarloi',
      html:
        `<p>Merhaba,</p><p><strong>${listing?.title || 'Araciniz'}</strong> icin sigorta isleminiz tamamlandi.</p>` +
        `<p>Policenize buradan ulasabilirsiniz:</p><p><a href="${policyUrl}">${policyUrl}</a></p>` +
        `<p>Faturaniza buradan ulasabilirsiniz:</p><p><a href="${invoiceUrl}">${invoiceUrl}</a></p>` +
        '<p>Platform resmi odeme saglayicisi degildir; resmi surec takip edilmelidir.</p><p>Carloi</p>',
      attachments: [
        {
          filename: 'carloi-sigorta-policesi.pdf',
          path: policyUrl,
          contentType: 'application/pdf',
        },
        {
          filename: 'carloi-sigorta-faturasi.pdf',
          path: invoiceUrl,
          contentType: 'application/pdf',
        },
      ],
    });
  } catch (error) {
    logError('insurance.delivery.mail_failed', {
      conversationId,
      buyerUserId: transaction.buyer_user_id,
      buyerEmail,
      policyUrl,
      invoiceUrl,
      error,
    });
    throw error;
  }

  await db.prepare(
    `UPDATE listing_transactions
     SET policy_uri = ?, invoice_uri = ?, policy_sent_at = ?, invoice_sent_at = ?, payment_status = ?, updated_at = ?
     WHERE conversation_id = ?`,
  ).run(policyUrl, invoiceUrl, nowIso(), nowIso(), 'policy_sent', nowIso(), conversationId);

  await appendSystemConversationMessage(conversationId, 'Sigorta policeniz olusturulmustur.', [
    {
      id: `policy-${conversationId}`,
      kind: 'report',
      label: 'Sigorta policesi PDF',
      uri: policyUrl,
      mimeType: 'application/pdf',
    },
    {
      id: `invoice-${conversationId}`,
      kind: 'report',
      label: 'Sigorta faturasi PDF',
      uri: invoiceUrl,
      mimeType: 'application/pdf',
    },
  ]);

  await appendAuditLog({
    actorType: 'admin',
    actorId: options?.adminId || null,
    targetType: 'insurance_delivery',
    targetId: conversationId,
    action: 'insurance.policy_delivered',
    metadata: {
      listingId: transaction.post_id,
      buyerUserId: transaction.buyer_user_id,
      policyUrl,
      invoiceUrl,
    },
    ipAddress: options?.ipAddress || null,
    userAgent: options?.userAgent || null,
  });
}

async function sendConversationMessage(userId, conversationId, text, attachments = []) {
  await ensureConversationAccess(userId, conversationId);

  const trimmedText = String(text || '').trim();
  const nextAttachments = Array.isArray(attachments) ? attachments : [];

  if (!trimmedText && !nextAttachments.length) {
    const error = new Error('Boş mesaj gönderilemez.');
    error.statusCode = 400;
    throw error;
  }

  await db.prepare(
    'INSERT INTO messages (id, conversation_id, sender_user_id, text, attachments_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(
    randomUUID(),
    conversationId,
    userId,
    encryptText(trimmedText),
    encryptJson(nextAttachments),
    nowIso(),
  );
}

async function editConversationMessage(userId, conversationId, messageId, text) {
  ensureConversationAccess(userId, conversationId);

  const message = await getConversationMessageRow(conversationId, messageId);
  if (!message) {
    const error = new Error('Mesaj bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  if (message.sender_user_id !== userId) {
    const error = new Error('Yalnızca kendi mesajınızı düzenleyebilirsiniz.');
    error.statusCode = 403;
    throw error;
  }

  if (message.deleted_for_everyone_at) {
    const error = new Error('Silinen mesaj düzenlenemez.');
    error.statusCode = 400;
    throw error;
  }

  const trimmedText = String(text || '').trim();
  if (!trimmedText) {
    const error = new Error('Mesaj içeriği boş olamaz.');
    error.statusCode = 400;
    throw error;
  }

  await db.prepare('UPDATE messages SET text = ?, edited_at = ? WHERE id = ?').run(
    encryptText(trimmedText),
    nowIso(),
    messageId,
  );
}

async function deleteConversationMessage(userId, conversationId, messageId, scope = 'self') {
  await ensureConversationAccess(userId, conversationId);

  const message = await getConversationMessageRow(conversationId, messageId);
  if (!message) {
    const error = new Error('Mesaj bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  if (scope === 'everyone') {
    if (message.sender_user_id !== userId) {
      const error = new Error('Bu mesajı herkesten silme yetkiniz yok.');
      error.statusCode = 403;
      throw error;
    }

    if (message.deleted_for_everyone_at) {
      return;
    }

    await db.prepare(
      'UPDATE messages SET text = ?, attachments_json = ?, deleted_for_everyone_at = ?, edited_at = NULL WHERE id = ?',
    ).run(encryptText(''), encryptJson([]), nowIso(), messageId);
    return;
  }

  await db.prepare(
    'INSERT OR IGNORE INTO message_hidden_for_users (message_id, user_id, created_at) VALUES (?, ?, ?)',
  ).run(messageId, userId, nowIso());
}

async function appendAiMessage(userId, role, content, options = {}) {
  await db.prepare(
    'INSERT INTO ai_messages (id, user_id, role, content, provider, related_post_ids_json, edited_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(
    randomUUID(),
    userId,
    role,
    encryptText(content),
    options.provider || 'fallback',
    encryptJson(Array.isArray(options.relatedPostIds) ? options.relatedPostIds : []),
    options.editedAt || null,
    nowIso(),
  );
}

async function getAiMessageRow(userId, messageId) {
  return (await db.prepare('SELECT * FROM ai_messages WHERE id = ? AND user_id = ?').get(messageId, userId)) ?? null;
}

async function updateAiMessageContent(userId, messageId, content) {
  const message = await getAiMessageRow(userId, messageId);
  if (!message) {
    const error = new Error('AI mesajı bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  if (message.role !== 'user') {
    const error = new Error('Sadece kendi yazdığınız AI mesajlarını düzenleyebilirsiniz.');
    error.statusCode = 400;
    throw error;
  }

  const trimmedContent = String(content || '').trim();
  if (!trimmedContent) {
    const error = new Error('Mesaj içeriği boş olamaz.');
    error.statusCode = 400;
    throw error;
  }

  await db.prepare('UPDATE ai_messages SET content = ?, edited_at = ?, provider = ? WHERE id = ? AND user_id = ?').run(
    encryptText(trimmedContent),
    nowIso(),
    'fallback',
    messageId,
    userId,
  );

  return {
    ...message,
    content: trimmedContent,
  };
}

async function deleteAiMessagesAfter(userId, createdAt) {
  await db.prepare('DELETE FROM ai_messages WHERE user_id = ? AND created_at > ?').run(userId, createdAt);
}

async function deleteAiMessage(userId, messageId) {
  const message = await getAiMessageRow(userId, messageId);
  if (!message) {
    const error = new Error('AI mesajı bulunamadı.');
    error.statusCode = 404;
    throw error;
  }

  await db.prepare('DELETE FROM ai_messages WHERE id = ? AND user_id = ?').run(messageId, userId);

  if (message.role === 'user') {
    const nextAssistant = await db
      .prepare(
        `SELECT id
         FROM ai_messages
         WHERE user_id = ? AND created_at > ? AND role = 'assistant'
         ORDER BY created_at ASC
         LIMIT 1`,
      )
      .get(userId, message.created_at);

    if (nextAssistant?.id) {
      await db.prepare('DELETE FROM ai_messages WHERE id = ? AND user_id = ?').run(nextAssistant.id, userId);
    }
  }
}

async function clearAiMessages(userId) {
  await db.prepare('DELETE FROM ai_messages WHERE user_id = ?').run(userId);
}

module.exports = {
  addComment,
  activatePremiumMembership,
  addGarageVehicleMedia,
  appendAiMessage,
  appendObdReadings,
  bootstrapSnapshot,
  clearAiMessages,
  createExpertiseSession,
  createGarageVehicle,
  createInsurancePayment,
  createGroupConversation,
  createObdSession,
  createOrUpdatePost,
  deleteAiMessage,
  deleteAiMessagesAfter,
  deleteConversationMessage,
  deleteGarageVehicle,
  deletePost,
  editConversationMessage,
  ensureDirectConversation,
  ensureListingConversation,
  getAiMessageRow,
  getGarageVehicle,
  getPaymentSession,
  getPublicListingById,
  getPublicPostById,
  getPublicProfileByHandle,
  getUserByHandle,
  getUserById,
  getUserFromToken,
  listAdminDeals,
  listExpertiseReports,
  listGarageVehicles,
  loginAccount,
  logoutAccount,
  recordInsurancePayment,
  registerAccount,
  requestPasswordReset,
  resetPasswordWithCode,
  resetPasswordWithToken,
  resendEmailVerificationCode,
  saveGarageVehicleChassis,
  saveGarageVehicleRegistration,
  saveOnboarding,
  sendConversationMessage,
  sendInsurancePolicyMail,
  sendSmsVerificationCode,
  signInWithSocialIdentity,
  setInsuranceQuote,
  setListingSoldStatus,
  shareListingRegistration,
  startSignupVerification,
  toggleFollow,
  toggleListingAgreement,
  toggleReaction,
  toggleRepost,
  trackListing,
  initializeStore,
  updateAiMessageContent,
  updateGarageVehicle,
  updateProfileMedia,
  updateSettings,
  verifyEmailCode,
  verifySmsCode,
  verifyEmailToken,
};
