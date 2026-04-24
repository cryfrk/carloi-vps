const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');

const { config } = require('./config');

const GOOGLE_TOKENINFO_ENDPOINT = 'https://oauth2.googleapis.com/tokeninfo';
const APPLE_KEYS_ENDPOINT = 'https://appleid.apple.com/auth/keys';

let appleKeysCache = {
  expiresAt: 0,
  keys: [],
};

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function fetchJson(url) {
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw createHttpError(data?.error_description || data?.message || 'Kimlik doğrulama isteği başarısız oldu.', 401);
  }

  return data;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLocaleLowerCase('tr');
}

async function verifyGoogleIdentityToken(idToken) {
  const data = await fetchJson(
    `${GOOGLE_TOKENINFO_ENDPOINT}?id_token=${encodeURIComponent(String(idToken || '').trim())}`,
  );

  const allowedAudiences = [
    config.googleAndroidClientId,
    config.googleIosClientId,
    config.googleWebClientId,
  ].filter(Boolean);

  if (allowedAudiences.length && !allowedAudiences.includes(data.aud)) {
    throw createHttpError('Google hesabı bu uygulama için yetkilendirilmemiş görünüyor.', 401);
  }

  if (!['accounts.google.com', 'https://accounts.google.com'].includes(String(data.iss || ''))) {
    throw createHttpError('Google kimlik doğrulama kaynağı geçersiz.', 401);
  }

  if (!data.sub) {
    throw createHttpError('Google hesabı için güvenli kullanıcı kimliği alınamadı.', 401);
  }

  if (Number(data.exp || 0) * 1000 < Date.now()) {
    throw createHttpError('Google oturumu süresi dolmuş. Lütfen tekrar deneyin.', 401);
  }

  return {
    provider: 'google',
    subject: String(data.sub),
    email: normalizeEmail(data.email),
    emailVerified: String(data.email_verified) === 'true' || data.email_verified === true,
    fullName: String(data.name || '').trim(),
    avatarUri: String(data.picture || '').trim() || undefined,
  };
}

async function getAppleKeys() {
  if (appleKeysCache.expiresAt > Date.now() && appleKeysCache.keys.length) {
    return appleKeysCache.keys;
  }

  const data = await fetchJson(APPLE_KEYS_ENDPOINT);
  appleKeysCache = {
    expiresAt: Date.now() + 60 * 60 * 1000,
    keys: Array.isArray(data.keys) ? data.keys : [],
  };
  return appleKeysCache.keys;
}

async function verifyAppleIdentityToken(identityToken) {
  const decoded = jwt.decode(identityToken, { complete: true });
  if (!decoded?.header?.kid) {
    throw createHttpError('Apple kimlik doğrulama başlığı çözülemedi.', 401);
  }

  const keys = await getAppleKeys();
  const matchingKey = keys.find((key) => key.kid === decoded.header.kid);
  if (!matchingKey) {
    throw createHttpError('Apple kimlik doğrulama anahtarı bulunamadı.', 401);
  }

  const payload = jwt.verify(identityToken, jwkToPem(matchingKey), {
    algorithms: ['RS256'],
    issuer: 'https://appleid.apple.com',
    audience: [config.appleSocialAudience, config.appStoreBundleId].filter(Boolean),
  });

  if (!payload?.sub) {
    throw createHttpError('Apple hesabı için güvenli kullanıcı kimliği alınamadı.', 401);
  }

  return {
    provider: 'apple',
    subject: String(payload.sub),
    email: normalizeEmail(payload.email),
    emailVerified: String(payload.email_verified) === 'true' || payload.email_verified === true,
    fullName: '',
    avatarUri: undefined,
  };
}

async function verifySocialIdentity(payload) {
  const provider = payload?.provider === 'apple' ? 'apple' : 'google';
  const idToken = String(payload?.idToken || '').trim();

  if (!idToken) {
    throw createHttpError('Sosyal giriş için kimlik belirteci gönderilmedi.', 400);
  }

  if (provider === 'apple') {
    const result = await verifyAppleIdentityToken(idToken);
    return {
      ...result,
      email: result.email || normalizeEmail(payload?.email),
      fullName: String(payload?.fullName || result.fullName || '').trim(),
    };
  }

  return verifyGoogleIdentityToken(idToken);
}

module.exports = {
  verifySocialIdentity,
};
