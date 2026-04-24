const PAYMENT_STATUS_INITIATED = 'initiated';
const PAYMENT_STATUS_PENDING = 'pending';
const PAYMENT_STATUS_SUCCESS = 'success';
const PAYMENT_STATUS_FAILED = 'failed';

const LEGACY_PAYMENT_STATUS_REDIRECT_READY = 'redirect_ready';
const LEGACY_PAYMENT_STATUS_PAID = 'paid';
const LEGACY_PAYMENT_STATUS_CANCELLED = 'cancelled';

function normalizePaymentStatus(status) {
  const value = String(status || '').trim().toLowerCase();

  if (!value) {
    return PAYMENT_STATUS_PENDING;
  }

  if (value === LEGACY_PAYMENT_STATUS_REDIRECT_READY) {
    return PAYMENT_STATUS_PENDING;
  }

  if (value === LEGACY_PAYMENT_STATUS_PAID) {
    return PAYMENT_STATUS_SUCCESS;
  }

  if (['approved', 'ok', 'completed', 'paid'].includes(value)) {
    return PAYMENT_STATUS_SUCCESS;
  }

  if (['declined', 'error', 'cancelled', 'canceled'].includes(value)) {
    return PAYMENT_STATUS_FAILED;
  }

  if ([PAYMENT_STATUS_INITIATED, PAYMENT_STATUS_PENDING, PAYMENT_STATUS_SUCCESS, PAYMENT_STATUS_FAILED].includes(value)) {
    return value;
  }

  return value;
}

function isPaymentSuccessLike(status) {
  return normalizePaymentStatus(status) === PAYMENT_STATUS_SUCCESS;
}

function isPaymentPendingLike(status) {
  return [PAYMENT_STATUS_INITIATED, PAYMENT_STATUS_PENDING].includes(normalizePaymentStatus(status));
}

function isPaymentFailedLike(status) {
  return [PAYMENT_STATUS_FAILED, LEGACY_PAYMENT_STATUS_CANCELLED].includes(
    normalizePaymentStatus(status),
  );
}

function isRetryablePaymentStatus(status) {
  return isPaymentFailedLike(status);
}

module.exports = {
  LEGACY_PAYMENT_STATUS_CANCELLED,
  LEGACY_PAYMENT_STATUS_PAID,
  LEGACY_PAYMENT_STATUS_REDIRECT_READY,
  PAYMENT_STATUS_FAILED,
  PAYMENT_STATUS_INITIATED,
  PAYMENT_STATUS_PENDING,
  PAYMENT_STATUS_SUCCESS,
  isPaymentFailedLike,
  isPaymentPendingLike,
  isPaymentSuccessLike,
  isRetryablePaymentStatus,
  normalizePaymentStatus,
};
