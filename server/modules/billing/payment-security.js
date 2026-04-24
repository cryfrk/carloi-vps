const { createHmac, timingSafeEqual } = require('node:crypto');

const PAYMENT_CALLBACK_SIGNABLE_FIELDS = [
  'paymentRecordId',
  'paymentReference',
  'paymentStatus',
  'amount',
  'currency',
  'provider',
  'callbackTimestamp',
];

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeMoney(value) {
  const normalized = normalizeText(value).replace(',', '.');
  if (!normalized) {
    return '';
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return normalized;
  }

  return parsed.toFixed(2);
}

function buildPaymentCallbackSignaturePayload(payload = {}) {
  return {
    paymentRecordId: normalizeText(payload.paymentRecordId),
    paymentReference: normalizeText(payload.paymentReference || payload.externalRef),
    paymentStatus: normalizeText(payload.paymentStatus).toLowerCase(),
    amount: normalizeMoney(payload.amount),
    currency: normalizeText(payload.currency).toUpperCase(),
    provider: normalizeText(payload.provider).toLowerCase(),
    callbackTimestamp: normalizeText(payload.callbackTimestamp),
  };
}

function buildPaymentCallbackSignatureBase(payload = {}) {
  const normalizedPayload = buildPaymentCallbackSignaturePayload(payload);

  return PAYMENT_CALLBACK_SIGNABLE_FIELDS.map((field) => `${field}=${normalizedPayload[field]}`).join('&');
}

function computePaymentCallbackSignature(payload = {}, secret) {
  const normalizedSecret = normalizeText(secret);
  if (!normalizedSecret) {
    return '';
  }

  return createHmac('sha256', normalizedSecret)
    .update(buildPaymentCallbackSignatureBase(payload))
    .digest('hex');
}

function signaturesMatch(expected, provided) {
  const normalizedExpected = normalizeText(expected).toLowerCase();
  const normalizedProvided = normalizeText(provided).toLowerCase();

  if (!normalizedExpected || !normalizedProvided) {
    return false;
  }

  const expectedBuffer = Buffer.from(normalizedExpected);
  const providedBuffer = Buffer.from(normalizedProvided);

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

function extractProvidedCallbackSignature(payload = {}, requestMeta = {}, headerName = 'x-payment-signature') {
  const candidates = [
    requestMeta.callbackSignature,
    payload.signature,
    payload.paymentSignature,
    payload.hashData,
    payload.hashedData,
    payload[headerName],
  ];

  for (const candidate of candidates) {
    const normalized = normalizeText(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return '';
}

module.exports = {
  PAYMENT_CALLBACK_SIGNABLE_FIELDS,
  buildPaymentCallbackSignatureBase,
  buildPaymentCallbackSignaturePayload,
  computePaymentCallbackSignature,
  extractProvidedCallbackSignature,
  normalizeMoney,
  signaturesMatch,
};
