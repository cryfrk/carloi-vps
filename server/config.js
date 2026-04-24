const path = require('node:path');

require('dotenv').config({ path: path.join(process.cwd(), '.env') });

const storageDriver = String(
  process.env.STORAGE_DRIVER || process.env.VCARX_STORAGE_DRIVER || process.env.VCAR_STORAGE_DRIVER || 'local',
)
  .trim()
  .toLowerCase();
const uploadsPrefix = String(process.env.UPLOADS_PREFIX || process.env.GCS_UPLOADS_PREFIX || 'media').replace(
  /^\/+|\/+$/g,
  '',
);
const uploadsBasePath = (() => {
  const raw = String(process.env.UPLOADS_BASE_PATH || '/uploads').trim();
  if (!raw) {
    return '/uploads';
  }

  const normalized = `/${raw.replace(/^\/+|\/+$/g, '')}`;
  return normalized === '/' ? '/uploads' : normalized;
})();

function normalizeMailFrom(mailFrom, smtpUser) {
  const raw = String(mailFrom || '').trim();
  const fallbackAddress = String(smtpUser || '').trim() || 'noreply@carloi.com';

  if (!raw) {
    return `Carloi <${fallbackAddress}>`;
  }

  if (raw.includes('<') && raw.includes('>')) {
    return raw;
  }

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
    return `Carloi <${raw}>`;
  }

  return raw;
}

const config = {
  nodeEnv: String(process.env.NODE_ENV || 'development').trim().toLowerCase(),
  host: process.env.HOST || '0.0.0.0',
  port: Number(
    process.env.PORT ||
      process.env.API_PORT ||
      process.env.VCARX_SERVER_PORT ||
      process.env.VCAR_SERVER_PORT ||
      8080,
  ),
  corsOrigin: process.env.VCARX_CORS_ORIGIN || process.env.VCAR_CORS_ORIGIN || '*',
  publicBaseUrl:
    process.env.VCARX_PUBLIC_BASE_URL || process.env.VCAR_PUBLIC_BASE_URL || 'http://localhost:4000',
  shareBaseUrl:
    process.env.APP_BASE_URL ||
    process.env.VCARX_SHARE_BASE_URL ||
    process.env.NEXT_PUBLIC_SHARE_BASE_URL ||
    process.env.VCAR_SHARE_BASE_URL ||
    process.env.VCARX_PUBLIC_BASE_URL ||
    process.env.VCAR_PUBLIC_BASE_URL ||
    'http://localhost:3000',
  appBaseUrl:
    process.env.APP_BASE_URL ||
    process.env.VCARX_SHARE_BASE_URL ||
    process.env.NEXT_PUBLIC_SHARE_BASE_URL ||
    process.env.VCAR_SHARE_BASE_URL ||
    process.env.VCARX_PUBLIC_BASE_URL ||
    process.env.VCAR_PUBLIC_BASE_URL ||
    'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL || '',
  databaseSsl:
    process.env.DATABASE_SSL === 'true' ||
    process.env.PGSSLMODE === 'require' ||
    process.env.PGSSLMODE === 'verify-full',
  dbPath: ':memory:',
  storageDriver,
  uploadsPrefix,
  uploadDir: path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')),
  uploadsBasePath,
  uploadsPublicBaseUrl: String(process.env.UPLOADS_PUBLIC_BASE_URL || '').replace(/\/+$/g, ''),
  gcpProjectId:
    process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || '',
  gcsBucketName: process.env.GCS_BUCKET_NAME || '',
  gcsUploadsPrefix: uploadsPrefix,
  gcsPublicBaseUrl: String(process.env.GCS_PUBLIC_BASE_URL || '').replace(/\/+$/g, ''),
  gcsSignedUrlTtlSeconds: Number(process.env.GCS_SIGNED_URL_TTL_SECONDS || 3600),
  cloudSqlInstanceConnectionName: process.env.CLOUD_SQL_CONNECTION_NAME || '',
  sessionTtlDays: Number(process.env.VCARX_SESSION_TTL_DAYS || process.env.VCAR_SESSION_TTL_DAYS || 30),
  sessionSecret: process.env.VCARX_SESSION_SECRET || process.env.VCAR_SESSION_SECRET || 'vcarx-local-secret',
  dataEncryptionSecret:
    process.env.VCARX_DATA_ENCRYPTION_SECRET ||
    process.env.VCAR_DATA_ENCRYPTION_SECRET ||
    process.env.VCARX_SESSION_SECRET ||
    process.env.VCAR_SESSION_SECRET ||
    'vcarx-local-secret',
  lookupSecret:
    process.env.VCARX_LOOKUP_SECRET ||
    process.env.VCAR_LOOKUP_SECRET ||
    process.env.VCARX_SESSION_SECRET ||
    process.env.VCAR_SESSION_SECRET ||
    'vcarx-local-secret',
  requireHttps: process.env.VCARX_REQUIRE_HTTPS === 'true' || process.env.VCAR_REQUIRE_HTTPS === 'true',
  trustProxy: process.env.VCARX_TRUST_PROXY === 'true' || process.env.VCAR_TRUST_PROXY === 'true',
  skipStartupValidation:
    String(process.env.VCARX_SKIP_VALIDATION || process.env.VCAR_SKIP_VALIDATION || 'false')
      .trim()
      .toLowerCase() === 'true',
  aiProvider: String(process.env.AI_PROVIDER || '').trim().toLowerCase(),
  genericAiApiKey: process.env.AI_API_KEY || '',
  deepSeekApiKey:
    process.env.DEEPSEEK_API_KEY ||
    (String(process.env.AI_PROVIDER || '').trim().toLowerCase() === 'deepseek'
      ? process.env.AI_API_KEY || ''
      : ''),
  deepSeekModel: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  deepSeekEndpoint: 'https://api.deepseek.com/chat/completions',
  openAIApiKey:
    process.env.OPENAI_API_KEY ||
    (String(process.env.AI_PROVIDER || '').trim().toLowerCase() === 'openai'
      ? process.env.AI_API_KEY || ''
      : ''),
  openAIModel: process.env.OPENAI_MODEL || 'gpt-5',
  openAIEndpoint: 'https://api.openai.com/v1/responses',
  paymentProxyUrl: process.env.VCARX_PAYMENT_PROXY_URL || process.env.VCAR_PAYMENT_PROXY_URL || '',
  billingPaymentProxyUrl:
    process.env.VCARX_BILLING_PAYMENT_PROXY_URL ||
    process.env.VCAR_BILLING_PAYMENT_PROXY_URL ||
    process.env.VCARX_PAYMENT_PROXY_URL ||
    process.env.VCAR_PAYMENT_PROXY_URL ||
    '',
  paymentPageBaseUrl:
    process.env.VCARX_PAYMENT_PAGE_BASE_URL ||
    process.env.VCAR_PAYMENT_PAGE_BASE_URL ||
    process.env.APP_BASE_URL ||
    process.env.VCARX_SHARE_BASE_URL ||
    process.env.NEXT_PUBLIC_SHARE_BASE_URL ||
    'http://localhost:3000',
  paymentReturnScheme:
    process.env.VCARX_PAYMENT_RETURN_SCHEME ||
    process.env.VCAR_PAYMENT_RETURN_SCHEME ||
    'carloi://payment-result',
  paymentCallbackToken:
    process.env.VCARX_PAYMENT_CALLBACK_TOKEN || process.env.VCAR_PAYMENT_CALLBACK_TOKEN || '',
  paymentCallbackSignatureSecret:
    process.env.VCARX_PAYMENT_CALLBACK_SIGNATURE_SECRET ||
    process.env.VCAR_PAYMENT_CALLBACK_SIGNATURE_SECRET ||
    '',
  paymentCallbackSignatureHeader:
    process.env.VCARX_PAYMENT_CALLBACK_SIGNATURE_HEADER ||
    process.env.VCAR_PAYMENT_CALLBACK_SIGNATURE_HEADER ||
    'x-payment-signature',
  paymentCallbackMaxAgeSeconds: Number(
    process.env.VCARX_PAYMENT_CALLBACK_MAX_AGE_SECONDS ||
      process.env.VCAR_PAYMENT_CALLBACK_MAX_AGE_SECONDS ||
      900,
  ),
  paymentMaxRetryCount: Number(
    process.env.VCARX_PAYMENT_MAX_RETRY_COUNT || process.env.VCAR_PAYMENT_MAX_RETRY_COUNT || 3,
  ),
  adminToken: process.env.VCARX_ADMIN_TOKEN || process.env.VCAR_ADMIN_TOKEN || '',
  allowLegacyAdminTokenInProduction:
    String(
      process.env.VCARX_ENABLE_LEGACY_ADMIN_TOKEN_IN_PRODUCTION ||
        process.env.VCAR_ENABLE_LEGACY_ADMIN_TOKEN_IN_PRODUCTION ||
        'false',
    )
      .trim()
      .toLowerCase() === 'true',
  googlePlayPackageName:
    process.env.VCARX_GOOGLE_PLAY_PACKAGE_NAME ||
    process.env.EXPO_PUBLIC_ANDROID_PACKAGE_NAME ||
    'com.carloi.mobile',
  googleAndroidClientId:
    process.env.VCARX_GOOGLE_ANDROID_CLIENT_ID ||
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
    '',
  googleIosClientId:
    process.env.VCARX_GOOGLE_IOS_CLIENT_ID ||
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
    '',
  googleWebClientId:
    process.env.VCARX_GOOGLE_WEB_CLIENT_ID ||
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
    '',
  googlePlayServiceAccountEmail:
    process.env.VCARX_GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL ||
    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL ||
    '',
  googlePlayPrivateKey:
    (process.env.VCARX_GOOGLE_PLAY_PRIVATE_KEY || process.env.GOOGLE_PLAY_PRIVATE_KEY || '').replace(
      /\\n/g,
      '\n',
    ),
  appStoreIssuerId: process.env.VCARX_APP_STORE_ISSUER_ID || process.env.APP_STORE_ISSUER_ID || '',
  appStoreKeyId: process.env.VCARX_APP_STORE_KEY_ID || process.env.APP_STORE_KEY_ID || '',
  appStorePrivateKey:
    (process.env.VCARX_APP_STORE_PRIVATE_KEY || process.env.APP_STORE_PRIVATE_KEY || '').replace(
      /\\n/g,
      '\n',
    ),
  appStoreBundleId:
    process.env.VCARX_APP_STORE_BUNDLE_ID ||
    process.env.APP_STORE_BUNDLE_ID ||
    'com.carloi.mobile',
  appleSocialAudience:
    process.env.VCARX_APPLE_SOCIAL_AUDIENCE ||
    process.env.EXPO_PUBLIC_APPLE_SOCIAL_AUDIENCE ||
    process.env.VCARX_APP_STORE_BUNDLE_ID ||
    process.env.APP_STORE_BUNDLE_ID ||
    'com.carloi.mobile',
  appStoreEnvironment:
    process.env.VCARX_APP_STORE_ENVIRONMENT ||
    process.env.APP_STORE_ENVIRONMENT ||
    'auto',
  smtpHost: process.env.SMTP_HOST || process.env.VCARX_SMTP_HOST || process.env.VCAR_SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || process.env.VCARX_SMTP_PORT || process.env.VCAR_SMTP_PORT || 0),
  smtpSecure:
    process.env.SMTP_SECURE === 'true' ||
    process.env.VCARX_SMTP_SECURE === 'true' ||
    process.env.VCAR_SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER || process.env.VCARX_SMTP_USER || process.env.VCAR_SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || process.env.VCARX_SMTP_PASS || process.env.VCAR_SMTP_PASS || '',
  disableEmail:
    String(process.env.VCARX_DISABLE_EMAIL || process.env.SMTP_DISABLED || 'false')
      .trim()
      .toLowerCase() === 'true',
  smtpFrom: normalizeMailFrom(
    process.env.SMTP_FROM ||
      process.env.MAIL_FROM ||
      process.env.VCARX_SMTP_FROM ||
      process.env.VCAR_SMTP_FROM ||
      '',
    process.env.SMTP_USER || process.env.VCARX_SMTP_USER || process.env.VCAR_SMTP_USER || '',
  ),
  smtpConnectionTimeoutMs: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 5000),
  smtpGreetingTimeoutMs: Number(process.env.SMTP_GREETING_TIMEOUT_MS || 5000),
  smtpSocketTimeoutMs: Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 8000),
  smtpOperationTimeoutMs: Number(process.env.SMTP_OPERATION_TIMEOUT_MS || 6000),
  smtpTlsRejectUnauthorized:
    String(process.env.SMTP_TLS_REJECT_UNAUTHORIZED || 'true').trim().toLowerCase() !== 'false',
  smtpEnableLegacyTlsInProduction:
    String(process.env.SMTP_ENABLE_LEGACY_TLS_IN_PRODUCTION || 'false').trim().toLowerCase() === 'true',
  smtpTlsServername: String(process.env.SMTP_TLS_SERVERNAME || '').trim(),
  twilioAccountSid: process.env.VCARX_TWILIO_ACCOUNT_SID || process.env.VCAR_TWILIO_ACCOUNT_SID || '',
  twilioAuthToken: process.env.VCARX_TWILIO_AUTH_TOKEN || process.env.VCAR_TWILIO_AUTH_TOKEN || '',
  twilioFrom: process.env.VCARX_TWILIO_FROM || process.env.VCAR_TWILIO_FROM || '',
};

if (config.sessionSecret === 'vcarx-local-secret') {
  console.warn('Security warning: VCARX_SESSION_SECRET varsayilan degerde. Production icin guclu bir secret kullanin.');
}

module.exports = {
  config,
};
