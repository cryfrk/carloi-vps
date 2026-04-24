const { createPrivateKey, createSign } = require('node:crypto');

const { config } = require('./config');

const APP_STORE_PRODUCTION_URL = 'https://api.storekit.itunes.apple.com';
const APP_STORE_SANDBOX_URL = 'https://api.storekit-sandbox.itunes.apple.com';

let cachedToken = null;
let cachedTokenExpiresAt = 0;

function base64urlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function readDerLength(buffer, start) {
  const first = buffer[start];
  if (first < 0x80) {
    return {
      length: first,
      bytesRead: 1,
    };
  }

  const byteCount = first & 0x7f;
  let length = 0;
  for (let index = 0; index < byteCount; index += 1) {
    length = (length << 8) | buffer[start + 1 + index];
  }

  return {
    length,
    bytesRead: 1 + byteCount,
  };
}

function derSignatureToJose(signature, size = 32) {
  let offset = 0;
  if (signature[offset++] !== 0x30) {
    throw new Error('Apple JWT imzası beklenen DER formatında değil.');
  }

  const sequenceLength = readDerLength(signature, offset);
  offset += sequenceLength.bytesRead;

  if (signature[offset++] !== 0x02) {
    throw new Error('Apple JWT imzasındaki R bileşeni okunamadı.');
  }
  const rLengthInfo = readDerLength(signature, offset);
  offset += rLengthInfo.bytesRead;
  let r = signature.slice(offset, offset + rLengthInfo.length);
  offset += rLengthInfo.length;

  if (signature[offset++] !== 0x02) {
    throw new Error('Apple JWT imzasındaki S bileşeni okunamadı.');
  }
  const sLengthInfo = readDerLength(signature, offset);
  offset += sLengthInfo.bytesRead;
  let s = signature.slice(offset, offset + sLengthInfo.length);

  while (r.length > size && r[0] === 0) {
    r = r.slice(1);
  }
  while (s.length > size && s[0] === 0) {
    s = s.slice(1);
  }

  if (r.length > size || s.length > size) {
    throw new Error('Apple JWT imza boyutu geçersiz.');
  }

  return Buffer.concat([
    Buffer.alloc(size - r.length, 0),
    r,
    Buffer.alloc(size - s.length, 0),
    s,
  ]).toString('base64url');
}

function makeAppleServerToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'ES256',
    kid: config.appStoreKeyId,
    typ: 'JWT',
  };
  const payload = {
    iss: config.appStoreIssuerId,
    iat: now,
    exp: now + 60 * 30,
    aud: 'appstoreconnect-v1',
    bid: config.appStoreBundleId,
  };

  const signingInput = `${base64urlJson(header)}.${base64urlJson(payload)}`;
  const signer = createSign('SHA256');
  signer.update(signingInput);
  signer.end();

  const derSignature = signer.sign(createPrivateKey(config.appStorePrivateKey));
  const joseSignature = derSignatureToJose(derSignature);
  return `${signingInput}.${joseSignature}`;
}

function ensureAppleConfig() {
  if (
    !config.appStoreIssuerId ||
    !config.appStoreKeyId ||
    !config.appStorePrivateKey ||
    !config.appStoreBundleId
  ) {
    const error = new Error(
      'App Store doğrulaması için issuer ID, key ID, private key ve bundle ID tanımlanmalıdır.',
    );
    error.statusCode = 503;
    throw error;
  }
}

function getAppleServerToken() {
  ensureAppleConfig();

  if (cachedToken && cachedTokenExpiresAt > Date.now() + 60_000) {
    return cachedToken;
  }

  cachedToken = makeAppleServerToken();
  cachedTokenExpiresAt = Date.now() + 25 * 60 * 1000;
  return cachedToken;
}

function decodeSignedTransactionPayload(jws) {
  const parts = String(jws || '').split('.');
  if (parts.length < 2) {
    throw new Error('Apple signedTransactionInfo JWS formatı geçersiz.');
  }

  const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
  return JSON.parse(payload);
}

async function getTransactionInfo(baseUrl, transactionId) {
  const token = getAppleServerToken();
  const response = await fetch(
    `${baseUrl}/inApps/v1/transactions/${encodeURIComponent(transactionId)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      data.errorMessage || data.errorCode || data.error?.message || 'App Store transaction doğrulaması başarısız oldu.',
    );
    error.statusCode = response.status || 502;
    error.appleStatus = response.status || 0;
    throw error;
  }

  return data;
}

async function verifyAppStoreSubscriptionPurchase({ transactionId, productId }) {
  const environment = String(config.appStoreEnvironment || 'auto').toLowerCase();
  const endpoints =
    environment === 'production'
      ? [{ baseUrl: APP_STORE_PRODUCTION_URL, environment: 'Production' }]
      : environment === 'sandbox'
        ? [{ baseUrl: APP_STORE_SANDBOX_URL, environment: 'Sandbox' }]
        : [
            { baseUrl: APP_STORE_PRODUCTION_URL, environment: 'Production' },
            { baseUrl: APP_STORE_SANDBOX_URL, environment: 'Sandbox' },
          ];

  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const data = await getTransactionInfo(endpoint.baseUrl, transactionId);
      const signedTransactionInfo = String(data.signedTransactionInfo || '');
      const decoded = decodeSignedTransactionPayload(signedTransactionInfo);

      if (decoded.bundleId !== config.appStoreBundleId) {
        const error = new Error('App Store satın alma kaydı bu uygulamanın bundle kimliği ile eşleşmiyor.');
        error.statusCode = 400;
        throw error;
      }

      if (productId && decoded.productId !== productId) {
        const error = new Error('App Store satın alma kaydındaki ürün, beklenen premium SKU ile eşleşmiyor.');
        error.statusCode = 400;
        throw error;
      }

      const expiresDate = decoded.expiresDate ? Number(decoded.expiresDate) : 0;
      const revocationDate = decoded.revocationDate ? Number(decoded.revocationDate) : 0;
      const signedDate = decoded.signedDate ? Number(decoded.signedDate) : Date.now();
      const isEntitlementActive = !revocationDate && (!expiresDate || expiresDate > Date.now());

      return {
        raw: data,
        decoded,
        productId: decoded.productId || productId,
        expiresAt: expiresDate ? new Date(expiresDate).toISOString() : '',
        orderId: decoded.originalTransactionId || decoded.transactionId || transactionId,
        environment: decoded.environment || endpoint.environment,
        signedDate: new Date(signedDate).toISOString(),
        isEntitlementActive,
      };
    } catch (error) {
      lastError = error;
      if (environment === 'auto' && error?.appleStatus === 404) {
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error('App Store transaction doğrulaması tamamlanamadı.');
}

module.exports = {
  verifyAppStoreSubscriptionPurchase,
};
