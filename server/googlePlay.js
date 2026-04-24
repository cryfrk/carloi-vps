const { createSign } = require('node:crypto');

const { config } = require('./config');

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_ANDROID_PUBLISHER_SCOPE = 'https://www.googleapis.com/auth/androidpublisher';

let cachedAccessToken = null;
let cachedExpiresAt = 0;

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function buildAssertionJwt() {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };
  const payload = {
    iss: config.googlePlayServiceAccountEmail,
    scope: GOOGLE_ANDROID_PUBLISHER_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    exp: now + 3600,
    iat: now,
  };

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();

  const signature = signer.sign(config.googlePlayPrivateKey).toString('base64url');
  return `${signingInput}.${signature}`;
}

async function getGooglePlayAccessToken() {
  if (cachedAccessToken && cachedExpiresAt > Date.now() + 60_000) {
    return cachedAccessToken;
  }

  if (!config.googlePlayServiceAccountEmail || !config.googlePlayPrivateKey) {
    const error = new Error(
      'Google Play servis hesabı bilgileri eksik. VCARX_GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL ve VCARX_GOOGLE_PLAY_PRIVATE_KEY tanımlanmalı.',
    );
    error.statusCode = 503;
    throw error;
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: buildAssertionJwt(),
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    const error = new Error(data.error_description || data.error || 'Google Play access token alınamadı.');
    error.statusCode = response.status || 502;
    throw error;
  }

  cachedAccessToken = data.access_token;
  cachedExpiresAt = Date.now() + Number(data.expires_in || 3600) * 1000;
  return cachedAccessToken;
}

async function verifyGooglePlaySubscriptionPurchase({ packageName, productId, purchaseToken }) {
  const accessToken = await getGooglePlayAccessToken();
  const url =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/` +
    `${encodeURIComponent(packageName)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error?.message || 'Google Play satın alma doğrulaması başarısız oldu.');
    error.statusCode = response.status || 502;
    throw error;
  }

  const lineItems = Array.isArray(data.lineItems) ? data.lineItems : [];
  const matchedLine =
    lineItems.find((item) => item.productId === productId) ??
    lineItems.find((item) => !productId || item.productId);

  return {
    raw: data,
    subscriptionState: data.subscriptionState || 'UNKNOWN',
    productId: matchedLine?.productId || productId,
    expiryTime: matchedLine?.expiryTime || '',
    latestOrderId: matchedLine?.latestSuccessfulOrderId || data.latestOrderId || '',
    acknowledged:
      data.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED' ||
      data.acknowledgementState === 'ACKNOWLEDGED',
    isEntitlementActive:
      data.subscriptionState === 'SUBSCRIPTION_STATE_ACTIVE' ||
      data.subscriptionState === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
  };
}

module.exports = {
  verifyGooglePlaySubscriptionPurchase,
};
