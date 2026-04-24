const { config } = require('./config');
const { validateStartupConfig } = require('./startupChecks');

function bool(value) {
  return Boolean(String(value || '').trim());
}

function buildSystemReadiness() {
  const monthlyProductId = process.env.EXPO_PUBLIC_PREMIUM_MONTHLY_PRODUCT_ID || '';
  const yearlyProductId = process.env.EXPO_PUBLIC_PREMIUM_YEARLY_PRODUCT_ID || '';

  const googlePlayReady = Boolean(
    config.googlePlayPackageName &&
      config.googlePlayServiceAccountEmail &&
      config.googlePlayPrivateKey &&
      monthlyProductId &&
      yearlyProductId,
  );

  const appStoreReady = Boolean(
    config.appStoreIssuerId &&
      config.appStoreKeyId &&
      config.appStorePrivateKey &&
      config.appStoreBundleId &&
      monthlyProductId &&
      yearlyProductId,
  );

  const insurancePaymentReady = Boolean(config.paymentProxyUrl);
  const otpMailReady = config.disableEmail
    ? false
    : Boolean(config.smtpHost && config.smtpUser && config.smtpPass && config.smtpFrom);
  const otpSmsReady = Boolean(config.twilioAccountSid && config.twilioAuthToken && config.twilioFrom);
  const securityReady = Boolean(
    config.sessionSecret &&
      config.sessionSecret !== 'vcarx-local-secret' &&
      config.dataEncryptionSecret &&
      config.lookupSecret &&
      config.adminToken,
  );
  const databaseConfigured = Boolean(config.databaseUrl);
  const gcsConfigured = config.storageDriver === 'gcs' && Boolean(config.gcsBucketName);
  const gcpConfigured = Boolean(config.gcpProjectId);

  const warnings = [];
  const validation = validateStartupConfig(config);

  if (!securityReady) {
    warnings.push('Security secretleri veya admin token production seviyesinde tamamlanmamis.');
  }
  if (!databaseConfigured) {
    warnings.push('DATABASE_URL eksik. Uygulama yalnizca gelistirme amacli gecici in-memory fallback ile acilir.');
  }
  if (config.storageDriver === 'gcs' && !gcsConfigured) {
    warnings.push('Storage GCS olarak secilmis ama GCS_BUCKET_NAME tanimli degil.');
  }
  if (!gcpConfigured && config.storageDriver === 'gcs') {
    warnings.push('GCS icin GCP_PROJECT_ID tavsiye edilir.');
  }
  if (!insurancePaymentReady) {
    warnings.push('Sigorta/arac odeme hatti icin payment proxy URL tanimli degil.');
  }
  if (!googlePlayReady) {
    warnings.push('Google Play premium dogrulamasi icin urun SKU veya servis hesabi eksik.');
  }
  if (!appStoreReady) {
    warnings.push('App Store premium dogrulamasi icin issuer/key/private key veya bundle ID eksik.');
  }
  if (config.disableEmail) {
    warnings.push('VCARX_DISABLE_EMAIL=true oldugu icin e-posta gonderimi bilerek devre disi.');
  }
  if (!config.disableEmail && !otpMailReady && !otpSmsReady) {
    warnings.push('Dogrulama kodu gonderimi icin ne SMTP ne de Twilio aktif gorunuyor.');
  } else if (config.disableEmail && !otpSmsReady) {
    warnings.push('E-posta dogrulamasi kapali. Mobil bildirim, SMS veya manuel destek akisini canliya cikmadan netlestirin.');
  }
  if (!config.requireHttps) {
    warnings.push('Production icin VCARX_REQUIRE_HTTPS=true onerilir.');
  }
  validation.warnings.forEach((warning) => warnings.push(warning));
  validation.errors.forEach((error) => warnings.push(`CRITICAL: ${error}`));
  return {
    ready: validation.errors.length === 0,
    environment: {
      nodeEnv: config.nodeEnv,
      production: config.nodeEnv === 'production',
      startupValidationSkipped: Boolean(validation.skipped),
      startupValidationSkipReason: validation.reason || '',
      startupWarnings: validation.warnings,
      startupErrors: validation.errors,
      legacyAdminTokenFallbackEnabled:
        config.nodeEnv === 'production'
          ? Boolean(config.allowLegacyAdminTokenInProduction && config.adminToken)
          : Boolean(config.adminToken),
    },
    security: {
      ready: securityReady && validation.errors.length === 0,
      requireHttps: config.requireHttps,
      trustProxy: config.trustProxy,
      hasAdminToken: bool(config.adminToken),
      legacyAdminTokenAllowedInProduction: config.allowLegacyAdminTokenInProduction,
      hasStrongSessionSecret: Boolean(
        config.sessionSecret && config.sessionSecret !== 'vcarx-local-secret',
      ),
      hasDataEncryptionSecret: bool(config.dataEncryptionSecret),
      hasLookupSecret: bool(config.lookupSecret),
    },
    infrastructure: {
      gcpProjectConfigured: gcpConfigured,
      databaseUrlConfigured: databaseConfigured,
      databaseDriver: databaseConfigured ? 'postgresql' : 'sqlite-inmemory-dev',
      storageDriver: config.storageDriver,
      uploadDirConfigured: Boolean(config.uploadDir),
      uploadDir: config.storageDriver === 'local' ? config.uploadDir : '',
      gcsBucketConfigured: gcsConfigured,
      publicBaseUrlConfigured: bool(config.publicBaseUrl),
      cloudSqlInstanceConfigured: bool(config.cloudSqlInstanceConnectionName),
    },
    ai: {
      deepseekReady: bool(config.deepSeekApiKey),
      openaiReady: bool(config.openAIApiKey),
    },
    otp: {
      emailReady: otpMailReady,
      emailDisabled: config.disableEmail,
      smsReady: otpSmsReady,
    },
    insurancePayments: {
      ready: insurancePaymentReady,
      paymentProxyUrlConfigured: bool(config.paymentProxyUrl),
      callbackTokenConfigured: bool(config.paymentCallbackToken),
      callbackSignatureConfigured: bool(config.paymentCallbackSignatureSecret),
    },
    premium: {
      monthlyProductConfigured: bool(monthlyProductId),
      yearlyProductConfigured: bool(yearlyProductId),
      googlePlayReady,
      appStoreReady,
      appStoreEnvironment: config.appStoreEnvironment,
    },
    warnings,
  };
}

module.exports = {
  buildSystemReadiness,
};
