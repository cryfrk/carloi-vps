const fs = require('node:fs');
const path = require('node:path');

const dotenv = require('dotenv');

const rootDir = process.cwd();
const envPath = path.join(rootDir, '.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

function hasValue(value) {
  return Boolean(String(value || '').trim());
}

function isStrongSecret(value) {
  const normalized = String(value || '').trim();
  return Boolean(normalized) && normalized !== 'change-this-secret' && normalized !== 'vcarx-local-secret';
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

function line(label, ok, detail) {
  console.log(`${ok ? 'OK ' : 'ERR'} ${label}${detail ? `: ${detail}` : ''}`);
}

function info(label, detail) {
  console.log(`SKP ${label}${detail ? `: ${detail}` : ''}`);
}

function getEnv(name) {
  return process.env[name] || '';
}

const monthlySku = getEnv('EXPO_PUBLIC_PREMIUM_MONTHLY_PRODUCT_ID');
const yearlySku = getEnv('EXPO_PUBLIC_PREMIUM_YEARLY_PRODUCT_ID');
const wantsIos =
  hasValue(getEnv('VCARX_APP_STORE_ISSUER_ID')) ||
  hasValue(getEnv('VCARX_APP_STORE_KEY_ID')) ||
  hasValue(getEnv('VCARX_APP_STORE_PRIVATE_KEY'));
const storageDriver = String(getEnv('STORAGE_DRIVER') || 'local').trim().toLowerCase();
const emailDisabled = String(getEnv('VCARX_DISABLE_EMAIL') || getEnv('SMTP_DISABLED') || 'false')
  .trim()
  .toLowerCase() === 'true';

const checks = {
  security: [
    ['VCARX_SESSION_SECRET', isStrongSecret(getEnv('VCARX_SESSION_SECRET')), 'oturum gizli anahtari'],
    ['VCARX_DATA_ENCRYPTION_SECRET', hasValue(getEnv('VCARX_DATA_ENCRYPTION_SECRET')), 'veri sifreleme anahtari'],
    ['VCARX_LOOKUP_SECRET', hasValue(getEnv('VCARX_LOOKUP_SECRET')), 'lookup anahtari'],
    ['VCARX_ADMIN_TOKEN', hasValue(getEnv('VCARX_ADMIN_TOKEN')), 'admin panel tokeni'],
  ],
  networking: [
    ['PORT/API_PORT', hasValue(getEnv('PORT')) || hasValue(getEnv('API_PORT')) || hasValue(getEnv('VCARX_SERVER_PORT')), 'uygulama port degeri'],
    ['VCARX_PUBLIC_BASE_URL', hasValue(getEnv('VCARX_PUBLIC_BASE_URL')), 'sunucu dis adresi'],
    ['EXPO_PUBLIC_API_BASE_URL', hasValue(getEnv('EXPO_PUBLIC_API_BASE_URL')), 'mobil/web API adresi'],
    ['VCARX_REQUIRE_HTTPS', getEnv('VCARX_REQUIRE_HTTPS') === 'true', 'production icin true olmali'],
  ],
  infrastructure: [
    ['DATABASE_URL', hasValue(getEnv('DATABASE_URL')), 'PostgreSQL baglanti stringi'],
    [
      'STORAGE_DRIVER',
      storageDriver === 'local' || storageDriver === 'gcs',
      "storage driver ('local' veya 'gcs')",
    ],
    [
      'UPLOAD_DIR / GCS_BUCKET_NAME',
      storageDriver === 'local' ? hasValue(getEnv('UPLOAD_DIR')) : hasValue(getEnv('GCS_BUCKET_NAME')),
      storageDriver === 'local' ? 'lokal upload klasoru' : 'GCS bucket adi',
    ],
    [
      'GCP_PROJECT_ID',
      storageDriver !== 'gcs' || hasValue(getEnv('GCP_PROJECT_ID')) || hasValue(getEnv('GOOGLE_CLOUD_PROJECT')),
      'yalnizca GCS icin gerekir',
    ],
  ],
  ai: [
    [
      'AI Provider',
      hasValue(getEnv('DEEPSEEK_API_KEY')) || hasValue(getEnv('OPENAI_API_KEY')) || hasValue(getEnv('AI_API_KEY')),
      'en az bir AI key gerekli',
    ],
  ],
  otp: [
    [
      'SMTP veya Twilio',
      emailDisabled ||
        (hasValue(getEnv('SMTP_HOST')) &&
          hasValue(getEnv('SMTP_USER')) &&
          hasValue(getEnv('SMTP_PASS')) &&
          hasValue(getEnv('MAIL_FROM'))) ||
        (hasValue(getEnv('VCARX_TWILIO_ACCOUNT_SID')) &&
          hasValue(getEnv('VCARX_TWILIO_AUTH_TOKEN')) &&
          hasValue(getEnv('VCARX_TWILIO_FROM'))),
      emailDisabled ? 'eposta gonderimi devre disi, register akisi bloke olmaz' : 'kod gonderimi icin SMTP veya Twilio gerekli',
    ],
  ],
  insurancePayments: [
    ['VCARX_PAYMENT_PROXY_URL', hasValue(getEnv('VCARX_PAYMENT_PROXY_URL')), 'ana API icin payment proxy adresi'],
    ['VCARX_PAYMENT_PROXY_PUBLIC_BASE_URL', hasValue(getEnv('VCARX_PAYMENT_PROXY_PUBLIC_BASE_URL')), 'payment proxy dis adresi'],
    ['GARANTI_MERCHANT_ID', hasValue(getEnv('GARANTI_MERCHANT_ID')), 'Garanti uye isyeri numarasi'],
    ['GARANTI_TERMINAL_ID', hasValue(getEnv('GARANTI_TERMINAL_ID')), 'Garanti terminal id'],
    [
      'GARANTI_TERMINAL_PROV_USER_ID',
      hasValue(getEnv('GARANTI_TERMINAL_PROV_USER_ID')),
      'Garanti provizyon kullanicisi',
    ],
    [
      'GARANTI_PROVISION_PASSWORD',
      hasValue(getEnv('GARANTI_PROVISION_PASSWORD')),
      'Garanti provizyon sifresi',
    ],
    ['GARANTI_STORE_KEY', hasValue(getEnv('GARANTI_STORE_KEY')), 'Garanti 3D secure key'],
    [
      'GARANTI_GATE3DENGINE_URL',
      hasValue(getEnv('GARANTI_GATE3DENGINE_URL')),
      'Garanti gt3dengine adresi',
    ],
  ],
  premiumShared: [
    ['EXPO_PUBLIC_PREMIUM_MONTHLY_PRODUCT_ID', hasValue(monthlySku), 'aylik premium SKU'],
    ['EXPO_PUBLIC_PREMIUM_YEARLY_PRODUCT_ID', hasValue(yearlySku), 'yillik premium SKU'],
  ],
  premiumGooglePlay: [
    ['VCARX_GOOGLE_PLAY_PACKAGE_NAME', hasValue(getEnv('VCARX_GOOGLE_PLAY_PACKAGE_NAME')), 'Android package adi'],
    [
      'VCARX_GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL',
      hasValue(getEnv('VCARX_GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL')),
      'Google Play servis hesabi',
    ],
    ['VCARX_GOOGLE_PLAY_PRIVATE_KEY', hasValue(getEnv('VCARX_GOOGLE_PLAY_PRIVATE_KEY')), 'Google Play private key'],
  ],
  premiumAppStore: [
    ['VCARX_APP_STORE_ISSUER_ID', hasValue(getEnv('VCARX_APP_STORE_ISSUER_ID')), 'App Store issuer id'],
    ['VCARX_APP_STORE_KEY_ID', hasValue(getEnv('VCARX_APP_STORE_KEY_ID')), 'App Store key id'],
    ['VCARX_APP_STORE_PRIVATE_KEY', hasValue(getEnv('VCARX_APP_STORE_PRIVATE_KEY')), 'App Store private key'],
    ['VCARX_APP_STORE_BUNDLE_ID', hasValue(getEnv('VCARX_APP_STORE_BUNDLE_ID')), 'App Store bundle id'],
  ],
};

let hasErrors = false;

section('1. Guvenlik');
checks.security.forEach(([label, ok, detail]) => {
  line(label, ok, detail);
  if (!ok) {
    hasErrors = true;
  }
});

section('2. Ag ve Runtime');
checks.networking.forEach(([label, ok, detail]) => {
  line(label, ok, detail);
  if (!ok) {
    hasErrors = true;
  }
});

section('3. Veritabani ve Storage');
checks.infrastructure.forEach(([label, ok, detail]) => {
  line(label, ok, detail);
  if (!ok) {
    hasErrors = true;
  }
});

section('4. AI');
checks.ai.forEach(([label, ok, detail]) => {
  line(label, ok, detail);
  if (!ok) {
    hasErrors = true;
  }
});

section('5. OTP / dogrulama');
checks.otp.forEach(([label, ok, detail]) => {
  line(label, ok, detail);
  if (!ok) {
    hasErrors = true;
  }
});

section('6. Arac / sigorta odeme hatti');
checks.insurancePayments.forEach(([label, ok, detail]) => {
  line(label, ok, detail);
  if (!ok) {
    hasErrors = true;
  }
});

section('7. Premium ortak alanlar');
checks.premiumShared.forEach(([label, ok, detail]) => {
  line(label, ok, detail);
  if (!ok) {
    hasErrors = true;
  }
});

section('8. Google Play premium');
checks.premiumGooglePlay.forEach(([label, ok, detail]) => {
  line(label, ok, detail);
  if (!ok) {
    hasErrors = true;
  }
});

section('9. App Store premium');
if (wantsIos) {
  checks.premiumAppStore.forEach(([label, ok, detail]) => {
    line(label, ok, detail);
    if (!ok) {
      hasErrors = true;
    }
  });
} else {
  info('App Store premium', 'Bu dogrulama turunda iOS premium anahtarlari opsiyonel birakildi.');
}

section('Sonuc');
if (hasErrors) {
  console.log('ERR Production yapilandirmasi eksik. Once yukaridaki alanlari tamamlayin.');
  process.exitCode = 1;
} else {
  console.log('OK Production icin kritik yapilandirmalar tamam gorunuyor.');
}
