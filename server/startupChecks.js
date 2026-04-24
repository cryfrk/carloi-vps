const { logWarn } = require('./logger');

function isValidUrl(value) {
  try {
    new URL(String(value || '').trim());
    return true;
  } catch {
    return false;
  }
}

function isHttpsUrl(value) {
  try {
    return new URL(String(value || '').trim()).protocol === 'https:';
  } catch {
    return false;
  }
}

function isLocalUrl(value) {
  try {
    const hostname = new URL(String(value || '').trim()).hostname.toLowerCase();
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local');
  } catch {
    return false;
  }
}

function hasStrongSecret(value) {
  const normalized = String(value || '').trim();
  return Boolean(normalized && normalized !== 'vcarx-local-secret' && normalized.length >= 24);
}

function validateStartupConfig(config) {
  const warnings = [];
  const errors = [];
  const isProduction = config.nodeEnv === 'production';
  const supportedStorageDrivers = new Set(['local', 'gcs']);
  const criticalBaseUrls = [
    ['VCARX_PUBLIC_BASE_URL', config.publicBaseUrl],
    ['APP_BASE_URL', config.appBaseUrl],
    ['VCARX_SHARE_BASE_URL', config.shareBaseUrl],
    ['VCARX_PAYMENT_PAGE_BASE_URL', config.paymentPageBaseUrl],
  ];

  if (!isProduction) {
    return {
      warnings,
      errors,
      skipped: true,
      reason: 'non-production',
    };
  }

  if (config.skipStartupValidation) {
    return {
      warnings: ['VCARX_SKIP_VALIDATION=true oldugu icin startup validation atlandi.'],
      errors,
      skipped: true,
      reason: 'env-bypass',
    };
  }

  if (!config.databaseUrl) {
    const message = 'DATABASE_URL eksik. Production icin kalici veritabani zorunludur.';
    errors.push(message);
  }

  if (config.requireHttps && !config.trustProxy) {
    errors.push('Production icin VCARX_TRUST_PROXY=true zorunludur.');
  }

  if (!supportedStorageDrivers.has(config.storageDriver)) {
    errors.push("STORAGE_DRIVER yalnizca 'local' veya 'gcs' olabilir.");
  }

  for (const [label, value] of criticalBaseUrls) {
    if (!String(value || '').trim()) {
      errors.push(`${label} eksik.`);
      continue;
    }

    if (!isValidUrl(value)) {
      errors.push(`${label} gecerli bir URL olmalidir.`);
      continue;
    }

    if (config.requireHttps && !isHttpsUrl(value)) {
      errors.push(`${label} VCARX_REQUIRE_HTTPS=true iken https olmalidir.`);
    }
  }

  if (config.paymentProxyUrl) {
    if (!isValidUrl(config.paymentProxyUrl)) {
      errors.push('VCARX_PAYMENT_PROXY_URL gecerli bir URL olmalidir.');
    } else if (config.requireHttps && !isHttpsUrl(config.paymentProxyUrl)) {
      errors.push('VCARX_PAYMENT_PROXY_URL VCARX_REQUIRE_HTTPS=true iken https olmalidir.');
    }
  } else {
    warnings.push('VCARX_PAYMENT_PROXY_URL tanimli degil. Odeme proxy akislarini smoke test etmeden canliya cikmayin.');
  }

  if (!hasStrongSecret(config.sessionSecret)) {
    const message = 'VCARX_SESSION_SECRET production seviyesinde guclu bir secret olmali.';
    errors.push(message);
  }
  if (!hasStrongSecret(config.dataEncryptionSecret)) {
    const message = 'VCARX_DATA_ENCRYPTION_SECRET production seviyesinde guclu bir secret olmali.';
    errors.push(message);
  }
  if (!hasStrongSecret(config.lookupSecret)) {
    const message = 'VCARX_LOOKUP_SECRET production seviyesinde guclu bir secret olmali.';
    errors.push(message);
  }

  if (config.storageDriver === 'gcs') {
    if (!config.gcsBucketName) {
      errors.push('GCS bucket tanimi eksik. GCS_BUCKET_NAME zorunludur.');
    }
    if (!config.gcpProjectId) {
      warnings.push('GCP_PROJECT_ID eksik. ADC ile calisiyor olsaniz bile proje kimligini acik tanimlamak tavsiye edilir.');
    }
  } else if (!String(config.uploadDir || '').trim()) {
    errors.push('UPLOAD_DIR eksik. STORAGE_DRIVER=local icin kalici bir klasor tanimlanmalidir.');
  }

  const smtpConfigured = Boolean(config.smtpHost && config.smtpPort && config.smtpUser && config.smtpPass && config.smtpFrom);
  const smsConfigured = Boolean(config.brevoApiKey);
  if (config.disableEmail) {
    warnings.push('E-posta gonderimi devre disi. Dogrulama ve reset mailleri production ortaminda gonderilmeyecek.');
  } else if (!smtpConfigured) {
    errors.push(
      'SMTP ayarlari eksik. Production ortaminda e-posta aciksa SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS ve SMTP_FROM/MAIL_FROM zorunludur.',
    );
  }

  if (config.smsEnabled && !smsConfigured) {
    errors.push('SMS_ENABLED=true iken BREVO_API_KEY zorunludur.');
  }

  if (isProduction && config.smtpTlsRejectUnauthorized === false && !config.smtpEnableLegacyTlsInProduction) {
    errors.push(
      'SMTP TLS dogrulamasi production ortaminda kapali gorunuyor. Bunu kullanacaksaniz SMTP_ENABLE_LEGACY_TLS_IN_PRODUCTION=true ile acik olarak onaylayin.',
    );
  }

  if (config.paymentProxyUrl || config.billingPaymentProxyUrl) {
    if (!hasStrongSecret(config.paymentCallbackSignatureSecret)) {
      const message = 'VCARX_PAYMENT_CALLBACK_SIGNATURE_SECRET production seviyesinde guclu olmali.';
      errors.push(message);
    }
    if (!String(config.paymentCallbackToken || '').trim()) {
      const message = 'VCARX_PAYMENT_CALLBACK_TOKEN eksik.';
      errors.push(message);
    }
  }

  if (config.allowLegacyAdminTokenInProduction) {
    warnings.push(
      'Legacy x-admin-token fallback production ortaminda acik. Yalnizca gecici gecis sureci icin kullanin ve session tabanli admin girisine gectikten sonra kapatin.',
    );
  }

  return {
    warnings,
    errors,
  };
}

function assertStartupConfig(config) {
  const result = validateStartupConfig(config);

  result.warnings.forEach((warning) => {
    logWarn('startup.config.warning', { warning });
  });

  if (result.errors.length) {
    const error = new Error(
      ['Production startup validation failed:', ...result.errors.map((item) => `- ${item}`)].join('\n'),
    );
    error.statusCode = 500;
    error.validationErrors = result.errors;
    throw error;
  }

  return result;
}

module.exports = {
  assertStartupConfig,
  hasStrongSecret,
  isHttpsUrl,
  isLocalUrl,
  isValidUrl,
  validateStartupConfig,
};
