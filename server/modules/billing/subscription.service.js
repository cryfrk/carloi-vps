const { config } = require('../../config');
const { db, toDbBoolean } = require('../../database');
const { getListingCompliance, upsertListingCompliance } = require('../compliance/compliance.repository');
const {
  CONSENT_REQUIREMENTS,
  assertSubscriptionTermsConsent,
  recordUserConsents,
} = require('../consent/consent.service');
const { isFeatureEnabled } = require('../feature-flags/config');
const { appendAuditLog } = require('../audit-risk/audit.repository');
const { ADMIN_ACTION_ALIASES, logAdminAction } = require('../admin/action-audit.service');
const {
  cancelActiveUserSubscriptionsForUser,
  createPaymentRecord,
  createUserSubscription,
  findLatestListingPaymentRecord,
  findLatestUserPaymentRecord,
  getActiveUserSubscription,
  getBillingSettings,
  getPaymentRecordByExternalRef,
  getPaymentRecordById,
  getSubscriptionPlanByCode,
  getSubscriptionPlanById,
  getLatestUserSubscription,
  listActiveSubscriptionPlans,
  listAllSubscriptionPlans,
  listPaymentRecords,
  listUserSubscriptions,
  updateBillingSettings,
  updatePaymentRecordById,
  updateUserSubscriptionById,
  upsertSubscriptionPlan,
} = require('./billing.repository');
const {
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
} = require('./payment-status');
const {
  computePaymentCallbackSignature,
  extractProvidedCallbackSignature,
  normalizeMoney,
  signaturesMatch,
} = require('./payment-security');
const { logError, logInfo, logWarn } = require('../../logger');

const PAYMENT_PROVIDER = 'garanti_virtual_pos';
const DEFAULT_CURRENCY = 'TRY';

function nowIso() {
  return new Date().toISOString();
}

function toBoolean(value) {
  return value === true || value === 1 || value === 'true';
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeText(value) {
  const next = String(value || '').trim();
  return next || '';
}

function normalizePaymentMetadata(metadata) {
  if (!metadata) {
    return {};
  }

  if (typeof metadata === 'object' && !Array.isArray(metadata)) {
    return metadata;
  }

  try {
    return JSON.parse(String(metadata));
  } catch {
    return {};
  }
}

function getPaymentRetryCount(paymentRecord) {
  return toNumber(normalizePaymentMetadata(paymentRecord?.metadata).retryCount, 0);
}

function canRetryPaymentRecord(paymentRecord) {
  return (
    Boolean(paymentRecord) &&
    isRetryablePaymentStatus(paymentRecord.status) &&
    getPaymentRetryCount(paymentRecord) < Math.max(1, toNumber(config.paymentMaxRetryCount, 3))
  );
}

function getCanonicalPaymentRecordStatus(status) {
  const normalizedStatus = normalizePaymentStatus(status);
  if (normalizedStatus === PAYMENT_STATUS_INITIATED) {
    return PAYMENT_STATUS_PENDING;
  }

  return normalizedStatus;
}

function buildPaymentRecordResponse(paymentRecord) {
  if (!paymentRecord) {
    return paymentRecord;
  }

  return {
    ...paymentRecord,
    status: getCanonicalPaymentRecordStatus(paymentRecord.status),
  };
}

function normalizeProviderCallbackStatus(value) {
  return normalizePaymentStatus(value || PAYMENT_STATUS_SUCCESS);
}

function normalizeCallbackTimestamp(value) {
  const raw = normalizeText(value);
  if (!raw) {
    return '';
  }

  const timestamp = new Date(raw);
  if (!Number.isFinite(timestamp.getTime())) {
    return '';
  }

  return timestamp.toISOString();
}

async function appendPaymentAudit(action, paymentRecord, metadata = {}, requestMeta = {}) {
  await appendAuditLog({
    actorType: 'system',
    actorId: null,
    targetType: 'payment',
    targetId: paymentRecord?.id || metadata.paymentRecordId || null,
    action,
    metadata: {
      paymentRecordId: paymentRecord?.id || metadata.paymentRecordId || null,
      paymentReference: paymentRecord?.externalRef || metadata.paymentReference || null,
      type: paymentRecord?.type || metadata.type || null,
      provider: paymentRecord?.provider || metadata.provider || null,
      ...metadata,
    },
    ipAddress: requestMeta?.ipAddress || null,
    userAgent: requestMeta?.userAgent || null,
  });
}

async function markPaymentForManualReview(paymentRecord, reason, payload, requestMeta = {}, extra = {}) {
  const metadata = normalizePaymentMetadata(paymentRecord?.metadata);
  const callbackFailureCount = toNumber(metadata.callbackFailureCount, 0) + 1;
  const updatedRecord = paymentRecord
    ? await updatePaymentRecordById(paymentRecord.id, {
        status: isPaymentSuccessLike(paymentRecord.status)
          ? PAYMENT_STATUS_SUCCESS
          : getCanonicalPaymentRecordStatus(paymentRecord.status),
        metadata: {
          manualReviewRequired: true,
          manualReviewReason: reason,
          manualReviewRequestedAt: nowIso(),
          callbackFailureCount,
          lastInvalidCallbackPayload: payload,
          callbackValidation: {
            reason,
            status: extra.requestedStatus || null,
            signatureVerified: extra.signatureVerified === true,
            amountVerified: extra.amountVerified === true,
            referenceVerified: extra.referenceVerified === true,
            currencyVerified: extra.currencyVerified === true,
            providerVerified: extra.providerVerified === true,
            callbackSignature: extra.callbackSignaturePresent ? 'present' : 'missing',
          },
        },
      })
    : null;

  await appendPaymentAudit(
    'billing.payment_manual_review_required',
    updatedRecord || paymentRecord,
    {
      reason,
      requestedStatus: extra.requestedStatus || null,
      callbackFailureCount,
    },
    requestMeta,
  );

  logWarn('payment.manual_review_required', {
    paymentRecordId: paymentRecord?.id || null,
    paymentReference: paymentRecord?.externalRef || null,
    reason,
    requestedStatus: extra.requestedStatus || null,
  });

  return {
    paymentRecord: buildPaymentRecordResponse(updatedRecord || paymentRecord),
    subscription: null,
    listing: null,
    manualReviewRequired: true,
    message: 'Odeme callback dogrulamasi manuel incelemeye alindi.',
  };
}

function validateProviderCallbackAgainstRecord(paymentRecord, payload, requestMeta = {}) {
  const normalizedPayloadStatus = normalizeProviderCallbackStatus(payload.paymentStatus);
  const normalizedReference = normalizeText(payload.paymentReference || payload.externalRef);
  const normalizedTimestamp = normalizeCallbackTimestamp(payload.callbackTimestamp);
  const normalizedAmount = normalizeMoney(payload.amount);
  const normalizedCurrency = normalizeText(payload.currency).toUpperCase();
  const normalizedProvider = normalizeText(payload.provider).toLowerCase();
  const callbackSignature = extractProvidedCallbackSignature(
    payload,
    requestMeta,
    config.paymentCallbackSignatureHeader,
  );
  const paymentMetadata = normalizePaymentMetadata(paymentRecord.metadata);
  const expectedProvider = normalizeText(paymentRecord.provider || PAYMENT_PROVIDER).toLowerCase();
  const expectedReference = normalizeText(paymentRecord.externalRef);
  const expectedAmount = normalizeMoney(paymentRecord.amount);
  const expectedCurrency = normalizeText(paymentRecord.currency || DEFAULT_CURRENCY).toUpperCase();

  const signaturePayload = {
    paymentRecordId: paymentRecord.id,
    paymentReference: normalizedReference,
    paymentStatus: normalizedPayloadStatus,
    amount: normalizedAmount,
    currency: normalizedCurrency,
    provider: normalizedProvider || expectedProvider,
    callbackTimestamp: normalizedTimestamp,
  };

  const expectedSignature = config.paymentCallbackSignatureSecret
    ? computePaymentCallbackSignature(signaturePayload, config.paymentCallbackSignatureSecret)
    : '';
  const signatureVerified = config.paymentCallbackSignatureSecret
    ? signaturesMatch(expectedSignature, callbackSignature)
    : false;

  const callbackTimestampMs = normalizedTimestamp ? Date.parse(normalizedTimestamp) : Number.NaN;
  const maxAgeMs = Math.max(60, toNumber(config.paymentCallbackMaxAgeSeconds, 900)) * 1000;
  const timestampValid =
    Number.isFinite(callbackTimestampMs) &&
    Math.abs(Date.now() - callbackTimestampMs) <= maxAgeMs;
  const amountVerified = normalizedAmount && normalizedAmount === expectedAmount;
  const referenceVerified = normalizedReference && normalizedReference === expectedReference;
  const currencyVerified =
    !normalizedCurrency || normalizedCurrency === expectedCurrency;
  const providerVerified =
    !normalizedProvider || normalizedProvider === expectedProvider;

  const errors = [];
  if (config.paymentCallbackSignatureSecret && !callbackSignature) {
    errors.push('missing_signature');
  }
  if (config.paymentCallbackSignatureSecret && !signatureVerified) {
    errors.push('invalid_signature');
  }
  if (!referenceVerified) {
    errors.push('reference_mismatch');
  }
  if (!amountVerified) {
    errors.push('amount_mismatch');
  }
  if (!currencyVerified) {
    errors.push('currency_mismatch');
  }
  if (!providerVerified) {
    errors.push('provider_mismatch');
  }
  if (!timestampValid) {
    errors.push('timestamp_invalid');
  }

  return {
    normalizedStatus: normalizedPayloadStatus,
    callbackSignature,
    signatureVerified,
    amountVerified,
    referenceVerified,
    currencyVerified,
    providerVerified,
    timestampValid,
    expectedReference,
    expectedAmount,
    expectedCurrency,
    expectedProvider,
    callbackTimestamp: normalizedTimestamp,
    errors,
    metadata: paymentMetadata,
  };
}

async function getUserBillingProfile(userId) {
  return db
    .prepare(
      `SELECT id, name, handle, email, phone, account_type, commercial_status,
              subscription_status, subscription_plan_id, can_create_paid_listings
       FROM users
       WHERE id = ?
       LIMIT 1`,
    )
    .get(userId);
}

async function updateUserBillingState(userId, patch) {
  const current = await getUserBillingProfile(userId);
  if (!current) {
    return null;
  }

  await db
    .prepare(
      `UPDATE users
       SET subscription_status = ?,
           subscription_plan_id = ?,
           can_create_paid_listings = ?,
           updated_at = ?
       WHERE id = ?`,
    )
    .run(
      patch.subscriptionStatus || current.subscription_status || 'inactive',
      patch.subscriptionPlanId === undefined
        ? current.subscription_plan_id || null
        : patch.subscriptionPlanId,
      patch.canCreatePaidListings === undefined
        ? toDbBoolean(current.can_create_paid_listings)
        : toDbBoolean(patch.canCreatePaidListings),
      nowIso(),
      userId,
    );

  return getUserBillingProfile(userId);
}

function selectRequiredSubscriptionPlan(plans, user) {
  if (!Array.isArray(plans) || !plans.length) {
    return null;
  }

  const accountType = user?.account_type || user?.accountType || 'individual';
  if (accountType === 'commercial') {
    return plans.find((plan) => plan.isCommercialOnly) || plans[0];
  }

  return plans.find((plan) => !plan.isCommercialOnly) || plans[0];
}

function buildListingFinalStateFromRisk(riskLevel) {
  if (riskLevel === 'high') {
    return 'restricted';
  }

  if (riskLevel === 'medium') {
    return 'submitted';
  }

  return 'published';
}

function mapAdminPaymentRow(row) {
  const metadata = normalizePaymentMetadata(row.metadata);
  const listing = normalizePaymentMetadata(row.listing_json);

  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name || '',
    userHandle: row.user_handle || '',
    listingId: row.listing_id || null,
    listingTitle: row.listing_title || listing.title || '',
    type: row.type,
    amount: String(row.amount ?? '0'),
    currency: row.currency || DEFAULT_CURRENCY,
    provider: row.provider,
    status: row.status,
    externalRef: row.external_ref || null,
    metadata,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

function mapAdminSubscriptionRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name || '',
    userHandle: row.user_handle || '',
    planId: row.plan_id,
    planName: row.plan_name || '',
    planCode: row.plan_code || '',
    status: row.status,
    startAt: row.start_at || null,
    endAt: row.end_at || null,
    renewalAt: row.renewal_at || null,
    paymentProvider: row.payment_provider || null,
    paymentStatus: row.payment_status || null,
    externalPaymentReference: row.external_payment_reference || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  };
}

async function requestPaymentCheckout(payload) {
  if (!config.billingPaymentProxyUrl) {
    const error = new Error('Odeme altyapisi yapilandirilmadi.');
    error.statusCode = 503;
    throw error;
  }

  const response = await fetch(`${config.billingPaymentProxyUrl}/api/pay/order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.success || !data?.paymentReference || !data?.paymentUrl) {
    const error = new Error(data?.message || 'Odeme yonlendirmesi olusturulamadi.');
    error.statusCode = response.status || 502;
    throw error;
  }

  return {
    paymentReference: String(data.paymentReference),
    paymentUrl: String(data.paymentUrl),
  };
}

async function ensureSubscriptionTermsIfNeeded({ userId, consents, required, requestMeta }) {
  if (!required) {
    return [];
  }

  const normalizedConsents = assertSubscriptionTermsConsent(consents, {
    message:
      'Ucretli ilan veya abonelik adimi icin dijital hizmet ve abonelik kosullarini kabul etmelisiniz.',
  });

  return recordUserConsents({
    userId,
    consents: normalizedConsents,
    defaultSourceScreen: CONSENT_REQUIREMENTS.subscription.sourceScreen,
    auditContext: requestMeta,
  });
}

async function evaluateListingBillingRequirement({ user, listingId = null, billingStep = {} }) {
  const settings = await getBillingSettings();
  const activeSubscription = await getActiveUserSubscription(user.id);
  const featuredRequested = toBoolean(billingStep.featuredRequested);
  const flags = {
    enablePaidListings: isFeatureEnabled('enablePaidListings'),
    enableSubscriptions: isFeatureEnabled('enableSubscriptions'),
  };

  if (!flags.enablePaidListings && !flags.enableSubscriptions) {
    return {
      flags,
      settings,
      activeSubscription,
      paymentRequired: false,
      paymentResolved: true,
      paymentStatus: 'not_required',
      requirementKind: null,
      amount: '0',
      currency: settings.currency || DEFAULT_CURRENCY,
      featuredRequested,
      selectedPlan: null,
      existingPaymentRecord: null,
    };
  }

  const isCommercialAccount =
    (user?.account_type || user?.accountType || 'individual') === 'commercial';

  if (
    flags.enableSubscriptions &&
    settings.subscriptionRequiredForCommercial &&
    isCommercialAccount
  ) {
    if (activeSubscription && ['trial', 'active'].includes(activeSubscription.status)) {
      return {
        flags,
        settings,
        activeSubscription,
        paymentRequired: false,
        paymentResolved: true,
        paymentStatus: LEGACY_PAYMENT_STATUS_PAID,
        requirementKind: 'subscription',
        amount: activeSubscription.plan?.monthlyPrice || '0',
        currency: activeSubscription.plan?.currency || settings.currency || DEFAULT_CURRENCY,
        featuredRequested,
        selectedPlan: activeSubscription.plan || null,
        existingPaymentRecord: null,
      };
    }

    const availablePlans = await listActiveSubscriptionPlans();
    const selectedPlan = selectRequiredSubscriptionPlan(availablePlans, user);

    if (!selectedPlan) {
      const error = new Error(
        'Ticari hesaplar icin gerekli abonelik plani henuz tanimlanmadi. Lutfen daha sonra tekrar deneyin.',
      );
      error.statusCode = 503;
      throw error;
    }

    return {
      flags,
      settings,
      activeSubscription: null,
      paymentRequired: true,
      paymentResolved: false,
      paymentStatus: PAYMENT_STATUS_PENDING,
      requirementKind: 'subscription',
      amount: selectedPlan.monthlyPrice,
      currency: selectedPlan.currency || settings.currency || DEFAULT_CURRENCY,
      featuredRequested,
      selectedPlan,
      existingPaymentRecord: null,
    };
  }

  if (!flags.enablePaidListings || !settings.paidListingsEnabled) {
    return {
      flags,
      settings,
      activeSubscription,
      paymentRequired: false,
      paymentResolved: true,
      paymentStatus: 'not_required',
      requirementKind: null,
      amount: '0',
      currency: settings.currency || DEFAULT_CURRENCY,
      featuredRequested,
      selectedPlan: null,
      existingPaymentRecord: null,
    };
  }

  const requirementKind =
    featuredRequested && settings.featuredListingFeeEnabled ? 'featured_listing' : null;
  const fallbackRequirementKind =
    !requirementKind && settings.individualListingFeeEnabled ? 'listing_fee' : requirementKind;

  if (!fallbackRequirementKind) {
    return {
      flags,
      settings,
      activeSubscription,
      paymentRequired: false,
      paymentResolved: true,
      paymentStatus: 'not_required',
      requirementKind: null,
      amount: '0',
      currency: settings.currency || DEFAULT_CURRENCY,
      featuredRequested,
      selectedPlan: null,
      existingPaymentRecord: null,
    };
  }

  let existingPaymentRecord = null;
  if (billingStep.paymentRecordId) {
    existingPaymentRecord = await getPaymentRecordById(billingStep.paymentRecordId);
  }

  if (!existingPaymentRecord && listingId) {
    existingPaymentRecord = await findLatestListingPaymentRecord(
      user.id,
      listingId,
      [fallbackRequirementKind],
      [
        PAYMENT_STATUS_SUCCESS,
        PAYMENT_STATUS_INITIATED,
        PAYMENT_STATUS_PENDING,
        PAYMENT_STATUS_FAILED,
        LEGACY_PAYMENT_STATUS_PAID,
        LEGACY_PAYMENT_STATUS_REDIRECT_READY,
        LEGACY_PAYMENT_STATUS_CANCELLED,
      ],
    );
  }

  if (existingPaymentRecord && isPaymentSuccessLike(existingPaymentRecord.status)) {
    return {
      flags,
      settings,
      activeSubscription,
      paymentRequired: true,
      paymentResolved: true,
      paymentStatus: LEGACY_PAYMENT_STATUS_PAID,
      requirementKind: fallbackRequirementKind,
      amount: String(existingPaymentRecord.amount),
      currency: existingPaymentRecord.currency || settings.currency || DEFAULT_CURRENCY,
      featuredRequested,
      selectedPlan: null,
      existingPaymentRecord: buildPaymentRecordResponse(existingPaymentRecord),
    };
  }

  const amount =
    fallbackRequirementKind === 'featured_listing'
      ? settings.featuredListingFeeAmount
      : settings.individualListingFeeAmount;

  return {
    flags,
    settings,
    activeSubscription,
    paymentRequired: true,
    paymentResolved: false,
    paymentStatus: PAYMENT_STATUS_PENDING,
    requirementKind: fallbackRequirementKind,
    amount,
    currency: settings.currency || DEFAULT_CURRENCY,
    featuredRequested,
    selectedPlan: null,
    existingPaymentRecord: buildPaymentRecordResponse(existingPaymentRecord),
  };
}

async function startSubscriptionCheckout({ user, planCode, listingId = null, consents, requestMeta }) {
  if (!isFeatureEnabled('enableSubscriptions')) {
    const error = new Error('Abonelik akisi su anda aktif degil.');
    error.statusCode = 403;
    throw error;
  }

  const activeSubscription = await getActiveUserSubscription(user.id);
  if (activeSubscription && ['trial', 'active'].includes(activeSubscription.status)) {
    return {
      paymentRequired: false,
      subscription: activeSubscription,
      message: 'Aktif bir abonelik zaten mevcut.',
    };
  }

  const plan = await getSubscriptionPlanByCode(planCode);
  if (!plan || !plan.isActive) {
    const error = new Error('Secilen abonelik plani bulunamadi.');
    error.statusCode = 404;
    throw error;
  }

  const accountType = user?.account_type || user?.accountType || 'individual';
  if (plan.isCommercialOnly && accountType !== 'commercial') {
    const error = new Error('Bu plan yalnizca ticari hesaplar icin kullanilabilir.');
    error.statusCode = 403;
    throw error;
  }

  await ensureSubscriptionTermsIfNeeded({
    userId: user.id,
    consents,
    required: true,
    requestMeta,
  });

  const existingPaymentRecord = await findLatestUserPaymentRecord(
    user.id,
    ['subscription'],
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
  const existingMetadata = normalizePaymentMetadata(existingPaymentRecord?.metadata);

  if (
    existingPaymentRecord &&
    existingMetadata.planCode === plan.code &&
    isPaymentSuccessLike(existingPaymentRecord.status)
  ) {
    return {
      paymentRequired: false,
      paymentRecord: buildPaymentRecordResponse(existingPaymentRecord),
      message: 'Bu abonelik icin odeme zaten tamamlandi.',
    };
  }

  if (
    existingPaymentRecord &&
    existingMetadata.planCode === plan.code &&
    isPaymentPendingLike(existingPaymentRecord.status) &&
    existingMetadata.checkoutUrl
  ) {
    return {
      paymentRequired: true,
      paymentRecord: buildPaymentRecordResponse(existingPaymentRecord),
      paymentUrl: existingMetadata.checkoutUrl,
      plan,
      message: 'Mevcut abonelik odeme adimi aciliyor.',
    };
  }

  if (
    existingPaymentRecord &&
    existingMetadata.planCode === plan.code &&
    isRetryablePaymentStatus(existingPaymentRecord.status) &&
    !canRetryPaymentRecord(existingPaymentRecord)
  ) {
    const manualReview = await markPaymentForManualReview(
      existingPaymentRecord,
      'subscription_retry_limit_reached',
      {
        paymentRecordId: existingPaymentRecord.id,
        paymentReference: existingPaymentRecord.externalRef,
        paymentStatus: existingPaymentRecord.status,
      },
      requestMeta,
      {
        requestedStatus: existingPaymentRecord.status,
      },
    );
    const error = new Error(
      'Abonelik odeme denemesi ek incelemeye alindi. Lutfen destek ekibiyle iletisime gecin.',
    );
    error.statusCode = 409;
    error.data = manualReview;
    throw error;
  }

  const paymentRecord =
    existingPaymentRecord &&
    existingMetadata.planCode === plan.code &&
    canRetryPaymentRecord(existingPaymentRecord)
      ? await updatePaymentRecordById(existingPaymentRecord.id, {
          status: PAYMENT_STATUS_INITIATED,
          amount: plan.monthlyPrice,
          currency: plan.currency || DEFAULT_CURRENCY,
          provider: PAYMENT_PROVIDER,
          metadata: {
            retryCount: getPaymentRetryCount(existingPaymentRecord) + 1,
            manualReviewRequired: false,
            manualReviewReason: null,
            planId: plan.id,
            planCode: plan.code,
            planName: plan.name,
            accountType,
            listingId,
          },
        })
      : await createPaymentRecord({
          userId: user.id,
          listingId: null,
          type: 'subscription',
          amount: plan.monthlyPrice,
          currency: plan.currency || DEFAULT_CURRENCY,
          provider: PAYMENT_PROVIDER,
          status: PAYMENT_STATUS_INITIATED,
          metadata: {
            planId: plan.id,
            planCode: plan.code,
            planName: plan.name,
            accountType,
            listingId,
            retryCount: 0,
          },
        });

  await appendPaymentAudit(
    'billing.payment_started',
    paymentRecord,
    {
      paymentType: 'subscription',
      planCode: plan.code,
      amount: plan.monthlyPrice,
      currency: plan.currency || DEFAULT_CURRENCY,
    },
    requestMeta,
  );

  let checkout;
  try {
    checkout = await requestPaymentCheckout({
      orderType: 'subscription',
      paymentRecordId: paymentRecord.id,
      amount: plan.monthlyPrice,
      currency: plan.currency || DEFAULT_CURRENCY,
      customerIpAddress: requestMeta?.ipAddress || '',
      callbackUrl: `${config.publicBaseUrl}/api/billing/garanti/callback`,
      buyer: {
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      metadata: {
        userId: user.id,
        planCode: plan.code,
        planId: plan.id,
      },
    });
  } catch (error) {
    await updatePaymentRecordById(paymentRecord.id, {
      status: PAYMENT_STATUS_FAILED,
      metadata: {
        checkoutError: error.message,
        checkoutFailedAt: nowIso(),
      },
    });
    await appendPaymentAudit(
      'billing.payment_failed',
      paymentRecord,
      {
        paymentType: 'subscription',
        reason: 'checkout_init_failed',
        errorMessage: error.message,
      },
      requestMeta,
    );
    throw error;
  }

  const updatedRecord = await updatePaymentRecordById(paymentRecord.id, {
    status: PAYMENT_STATUS_PENDING,
    externalRef: checkout.paymentReference,
    metadata: {
      checkoutUrl: checkout.paymentUrl,
      paymentReference: checkout.paymentReference,
      planId: plan.id,
      planCode: plan.code,
      planName: plan.name,
      listingId,
      lastRedirectReadyAt: nowIso(),
    },
  });

  await appendPaymentAudit(
    'billing.payment_redirect_ready',
    updatedRecord,
    {
      paymentType: 'subscription',
      planCode: plan.code,
      checkoutUrl: checkout.paymentUrl,
    },
    requestMeta,
  );

  return {
    paymentRequired: true,
    paymentRecord: buildPaymentRecordResponse(updatedRecord),
    paymentUrl: checkout.paymentUrl,
    plan,
    message: 'Abonelik odeme adimina yonlendiriliyorsunuz.',
  };
}

async function startListingPaymentCheckout({
  user,
  listingId,
  type,
  amount,
  currency,
  consents,
  requestMeta,
  existingPaymentRecord = null,
}) {
  await ensureSubscriptionTermsIfNeeded({
    userId: user.id,
    consents,
    required: true,
    requestMeta,
  });

  if (existingPaymentRecord && isPaymentSuccessLike(existingPaymentRecord.status)) {
    return {
      paymentRequired: false,
      paymentRecord: buildPaymentRecordResponse(existingPaymentRecord),
      message: 'Bu ilan icin gerekli odeme zaten tamamlandi.',
    };
  }

  if (existingPaymentRecord && isPaymentPendingLike(existingPaymentRecord.status)) {
    const metadata = normalizePaymentMetadata(existingPaymentRecord.metadata);
    if (metadata.checkoutUrl) {
      return {
        paymentRequired: true,
        paymentRecord: buildPaymentRecordResponse(existingPaymentRecord),
        paymentUrl: metadata.checkoutUrl,
        message: 'Mevcut odeme adimi aciliyor.',
      };
    }
  }

  if (existingPaymentRecord && isRetryablePaymentStatus(existingPaymentRecord.status) && !canRetryPaymentRecord(existingPaymentRecord)) {
    const manualReview = await markPaymentForManualReview(
      existingPaymentRecord,
      'listing_retry_limit_reached',
      {
        paymentRecordId: existingPaymentRecord.id,
        paymentReference: existingPaymentRecord.externalRef,
        paymentStatus: existingPaymentRecord.status,
      },
      requestMeta,
      {
        requestedStatus: existingPaymentRecord.status,
      },
    );
    const error = new Error(
      'Bu ilan odemesi birden fazla kez basarisiz oldu. Islem manuel incelemeye alindi.',
    );
    error.statusCode = 409;
    error.data = manualReview;
    throw error;
  }

  const paymentRecord =
    existingPaymentRecord && canRetryPaymentRecord(existingPaymentRecord)
      ? await updatePaymentRecordById(existingPaymentRecord.id, {
          status: PAYMENT_STATUS_INITIATED,
          amount,
          currency,
          provider: PAYMENT_PROVIDER,
          metadata: {
            retryCount: getPaymentRetryCount(existingPaymentRecord) + 1,
            manualReviewRequired: false,
            manualReviewReason: null,
          },
        })
      : await createPaymentRecord({
          userId: user.id,
          listingId,
          type,
          amount,
          currency,
          provider: PAYMENT_PROVIDER,
          status: PAYMENT_STATUS_INITIATED,
          metadata: {
            retryCount: 0,
          },
        });

  await appendPaymentAudit(
    'billing.payment_started',
    paymentRecord,
    {
      paymentType: type,
      listingId,
      amount,
      currency,
    },
    requestMeta,
  );

  let checkout;
  try {
    checkout = await requestPaymentCheckout({
      orderType: type,
      paymentRecordId: paymentRecord.id,
      amount,
      currency,
      customerIpAddress: requestMeta?.ipAddress || '',
      callbackUrl: `${config.publicBaseUrl}/api/billing/garanti/callback`,
      buyer: {
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      metadata: {
        userId: user.id,
        listingId,
        paymentType: type,
      },
    });
  } catch (error) {
    await updatePaymentRecordById(paymentRecord.id, {
      status: PAYMENT_STATUS_FAILED,
      metadata: {
        checkoutError: error.message,
        checkoutFailedAt: nowIso(),
      },
    });
    await appendPaymentAudit(
      'billing.payment_failed',
      paymentRecord,
      {
        listingId,
        paymentType: type,
        reason: 'checkout_init_failed',
        errorMessage: error.message,
      },
      requestMeta,
    );
    throw error;
  }

  const updatedRecord = await updatePaymentRecordById(paymentRecord.id, {
    status: PAYMENT_STATUS_PENDING,
    externalRef: checkout.paymentReference,
    metadata: {
      checkoutUrl: checkout.paymentUrl,
      paymentReference: checkout.paymentReference,
      listingId,
      paymentType: type,
      lastRedirectReadyAt: nowIso(),
    },
  });

  await appendPaymentAudit(
    'billing.payment_redirect_ready',
    updatedRecord,
    {
      listingId,
      paymentType: type,
      amount,
      currency,
      checkoutUrl: checkout.paymentUrl,
    },
    requestMeta,
  );

  return {
    paymentRequired: true,
    paymentRecord: buildPaymentRecordResponse(updatedRecord),
    paymentUrl: checkout.paymentUrl,
    message:
      type === 'featured_listing'
        ? 'One cikarilan ilan odeme adimina yonlendiriliyorsunuz.'
        : 'Ilan ucreti odeme adimina yonlendiriliyorsunuz.',
  };
}

async function ensureListingPayment({
  user,
  listingId,
  billingStep = {},
  consents = [],
  requestMeta,
}) {
  const decision = await evaluateListingBillingRequirement({
    user,
    listingId,
    billingStep,
  });

  if (!decision.paymentRequired || decision.paymentResolved) {
    return {
      ...decision,
      paymentUrl: null,
      paymentRecord: decision.existingPaymentRecord || null,
    };
  }

  if (decision.requirementKind === 'subscription') {
    const checkout = await startSubscriptionCheckout({
      user,
      planCode: decision.selectedPlan.code,
      listingId,
      consents,
      requestMeta,
    });

    return {
      ...decision,
      paymentUrl: checkout.paymentUrl || null,
      paymentRecord: checkout.paymentRecord || null,
      selectedPlan: decision.selectedPlan,
      message: checkout.message,
    };
  }

  const checkout = await startListingPaymentCheckout({
    user,
    listingId,
    type: decision.requirementKind,
    amount: decision.amount,
    currency: decision.currency,
    consents,
    requestMeta,
    existingPaymentRecord: decision.existingPaymentRecord,
  });

  return {
    ...decision,
    paymentUrl: checkout.paymentUrl || null,
    paymentRecord: checkout.paymentRecord || null,
    message: checkout.message,
  };
}

async function finalizeListingPayment(paymentRecord, requestMeta) {
  const listingId = paymentRecord.listingId || normalizePaymentMetadata(paymentRecord.metadata).listingId;
  if (!listingId) {
    return null;
  }

  const existingCompliance = await getListingCompliance(listingId);
  if (!existingCompliance) {
    return null;
  }

  const finalState = buildListingFinalStateFromRisk(existingCompliance.risk_level || 'low');
  const nextCompliance = {
    sellerRelationType: existingCompliance.seller_relation_type,
    plateNumber: existingCompliance.plate_number,
    registrationOwnerFullNameDeclared:
      existingCompliance.registration_owner_full_name_declared,
    isOwnerSameAsAccountHolder: toBoolean(
      existingCompliance.is_owner_same_as_account_holder,
    ),
    authorizationDeclarationText: existingCompliance.authorization_declaration_text,
    authorizationDeclarationAccepted: toBoolean(
      existingCompliance.authorization_declaration_accepted,
    ),
    authorizationStatus: existingCompliance.authorization_status,
    eidsStatus: existingCompliance.eids_status,
    safePaymentInfoAccepted: toBoolean(existingCompliance.safe_payment_info_accepted),
    safePaymentInfoAcceptedAt: existingCompliance.safe_payment_info_accepted_at,
    listingComplianceStatus: finalState,
    riskScore: toNumber(existingCompliance.risk_score, 0),
    riskLevel: existingCompliance.risk_level || 'low',
    billingRequired: true,
    billingStatus: LEGACY_PAYMENT_STATUS_PAID,
    paymentRecordId: paymentRecord.id,
    duplicatePlateFlag: toBoolean(existingCompliance.duplicate_plate_flag),
    abnormalPriceFlag: toBoolean(existingCompliance.abnormal_price_flag),
    spamContentFlag: toBoolean(existingCompliance.spam_content_flag),
    reviewRequiredReason: existingCompliance.review_required_reason,
    reviewedByAdminId: existingCompliance.reviewed_by_admin_id,
    reviewedAt: existingCompliance.reviewed_at,
  };

  await upsertListingCompliance(listingId, nextCompliance);

  await appendAuditLog({
    actorType: 'system',
    actorId: null,
    targetType: 'listing',
    targetId: listingId,
    action:
      paymentRecord.type === 'featured_listing'
        ? 'billing.featured_listing_paid'
        : paymentRecord.type === 'subscription'
          ? 'billing.subscription_listing_unlocked'
          : 'billing.listing_fee_paid',
    metadata: {
      paymentRecordId: paymentRecord.id,
      finalState,
      riskLevel: nextCompliance.riskLevel,
      riskScore: nextCompliance.riskScore,
    },
    ipAddress: requestMeta?.ipAddress || null,
    userAgent: requestMeta?.userAgent || null,
  });

  await appendAuditLog({
    actorType: 'system',
    actorId: null,
    targetType: 'listing',
    targetId: listingId,
    action: finalState === 'published' ? 'listing.published' : 'listing.submitted',
    metadata: {
      paymentRecordId: paymentRecord.id,
      billingStatus: LEGACY_PAYMENT_STATUS_PAID,
      finalState,
      reviewRequiredReason: nextCompliance.reviewRequiredReason,
    },
    ipAddress: requestMeta?.ipAddress || null,
    userAgent: requestMeta?.userAgent || null,
  });

  if (paymentRecord.type === 'featured_listing') {
    const post = await db.prepare('SELECT listing_json FROM posts WHERE id = ? LIMIT 1').get(listingId);
    if (post?.listing_json) {
      const listing = normalizePaymentMetadata(post.listing_json);
      await db
        .prepare('UPDATE posts SET listing_json = ?, updated_at = ? WHERE id = ?')
        .run(
          JSON.stringify({
            ...listing,
            isFeatured: true,
            featuredAt: nowIso(),
          }),
          nowIso(),
          listingId,
        );
    }
  }

  return {
    listingId,
    finalState,
  };
}

async function finalizeSubscriptionPayment(paymentRecord, requestMeta) {
  const metadata = normalizePaymentMetadata(paymentRecord.metadata);
  const planId = metadata.planId || null;
  const planCode = metadata.planCode || null;
  const plan = planId
    ? await getSubscriptionPlanById(planId)
    : planCode
      ? await getSubscriptionPlanByCode(planCode)
      : null;

  if (!plan) {
    const error = new Error('Abonelik plani bulunamadi.');
    error.statusCode = 404;
    throw error;
  }

  const startAt = nowIso();
  const renewalAt = new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString();

  await cancelActiveUserSubscriptionsForUser(paymentRecord.userId);
  const subscription = await createUserSubscription({
    userId: paymentRecord.userId,
    planId: plan.id,
    status: 'active',
    startAt,
    renewalAt,
    paymentProvider: PAYMENT_PROVIDER,
    paymentStatus: PAYMENT_STATUS_SUCCESS,
    externalPaymentReference: paymentRecord.externalRef || null,
  });

  await updateUserBillingState(paymentRecord.userId, {
    subscriptionStatus: 'active',
    subscriptionPlanId: plan.id,
    canCreatePaidListings: true,
  });

  await appendAuditLog({
    actorType: 'system',
    actorId: null,
    targetType: 'subscription',
    targetId: subscription.id,
    action: 'billing.subscription_activated',
    metadata: {
      paymentRecordId: paymentRecord.id,
      planId: plan.id,
      planCode: plan.code,
    },
    ipAddress: requestMeta?.ipAddress || null,
    userAgent: requestMeta?.userAgent || null,
  });

  let listing = null;
  if (metadata.listingId) {
    listing = await finalizeListingPayment(
      {
        ...paymentRecord,
        listingId: metadata.listingId,
      },
      requestMeta,
    );
  }

  return {
    subscription,
    listing,
  };
}

async function handleBillingProviderCallback(payload, requestMeta = {}) {
  const paymentReference = normalizeText(payload.paymentReference || payload.externalRef);
  const paymentRecordId = normalizeText(payload.paymentRecordId);
  logInfo('payment.callback.received', {
    paymentReference: paymentReference || null,
    paymentRecordId: paymentRecordId || null,
    provider: normalizeText(payload.provider).toLowerCase() || null,
    requestedStatus: normalizeText(payload.paymentStatus).toLowerCase() || null,
  });

  if (!paymentReference && !paymentRecordId) {
    await appendAuditLog({
      actorType: 'system',
      actorId: null,
      targetType: 'payment_callback',
      targetId: null,
      action: 'billing.provider_callback_rejected',
      metadata: {
        reason: 'missing_reference',
      },
      ipAddress: requestMeta?.ipAddress || null,
      userAgent: requestMeta?.userAgent || null,
    });
    logWarn('payment.callback.rejected', {
      reason: 'missing_reference',
      paymentRecordId: paymentRecordId || null,
      paymentReference: paymentReference || null,
    });
    const error = new Error('Odeme callback isteginde kayit referansi bulunamadi.');
    error.statusCode = 400;
    throw error;
  }

  let paymentRecord = paymentRecordId
    ? await getPaymentRecordById(paymentRecordId)
    : await getPaymentRecordByExternalRef(paymentReference);

  if (!paymentRecord && paymentReference) {
    paymentRecord = await getPaymentRecordByExternalRef(paymentReference);
  }

  if (!paymentRecord) {
    await appendAuditLog({
      actorType: 'system',
      actorId: null,
      targetType: 'payment_callback',
      targetId: paymentRecordId || paymentReference || null,
      action: 'billing.provider_callback_rejected',
      metadata: {
        reason: 'payment_record_not_found',
        paymentRecordId: paymentRecordId || null,
        paymentReference: paymentReference || null,
      },
      ipAddress: requestMeta?.ipAddress || null,
      userAgent: requestMeta?.userAgent || null,
    });
    logWarn('payment.callback.rejected', {
      reason: 'payment_record_not_found',
      paymentRecordId: paymentRecordId || null,
      paymentReference: paymentReference || null,
    });
    const error = new Error('Odeme kaydi bulunamadi.');
    error.statusCode = 404;
    throw error;
  }

  const validation = validateProviderCallbackAgainstRecord(paymentRecord, payload, requestMeta);
  await appendPaymentAudit(
    'billing.provider_callback_received',
    paymentRecord,
    {
      requestedStatus: validation.normalizedStatus,
      callbackSignaturePresent: Boolean(validation.callbackSignature),
      signatureVerified: validation.signatureVerified,
      amountVerified: validation.amountVerified,
      referenceVerified: validation.referenceVerified,
      currencyVerified: validation.currencyVerified,
      providerVerified: validation.providerVerified,
      validationErrors: validation.errors,
    },
    requestMeta,
  );

  if (
    isPaymentSuccessLike(paymentRecord.status) &&
    validation.normalizedStatus === PAYMENT_STATUS_SUCCESS
  ) {
    await appendPaymentAudit(
      'billing.provider_callback_duplicate',
      paymentRecord,
      {
        requestedStatus: validation.normalizedStatus,
      },
      requestMeta,
    );
    logInfo('payment.callback.duplicate', {
      paymentRecordId: paymentRecord.id,
      paymentReference: paymentRecord.externalRef,
      requestedStatus: validation.normalizedStatus,
    });

    return {
      paymentRecord: buildPaymentRecordResponse(paymentRecord),
      subscription: paymentRecord.type === 'subscription'
        ? await getActiveUserSubscription(paymentRecord.userId)
        : null,
      listing:
        paymentRecord.type === 'listing_fee' || paymentRecord.type === 'featured_listing'
          ? {
              listingId:
                paymentRecord.listingId ||
                normalizePaymentMetadata(paymentRecord.metadata).listingId ||
                null,
            }
          : null,
      duplicateCallback: true,
    };
  }

  if (
    isPaymentSuccessLike(paymentRecord.status) &&
    validation.normalizedStatus === PAYMENT_STATUS_FAILED
  ) {
    return markPaymentForManualReview(
      paymentRecord,
      'conflicting_failure_after_success',
      payload,
      requestMeta,
      {
        requestedStatus: validation.normalizedStatus,
        callbackSignaturePresent: Boolean(validation.callbackSignature),
        signatureVerified: validation.signatureVerified,
        amountVerified: validation.amountVerified,
        referenceVerified: validation.referenceVerified,
        currencyVerified: validation.currencyVerified,
        providerVerified: validation.providerVerified,
      },
    );
  }

  if (toBoolean(payload.manualReviewRequired)) {
    return markPaymentForManualReview(
      paymentRecord,
      normalizeText(payload.manualReviewReason) || 'provider_manual_review_required',
      payload,
      requestMeta,
      {
        requestedStatus: validation.normalizedStatus,
        callbackSignaturePresent: Boolean(validation.callbackSignature),
        signatureVerified: validation.signatureVerified,
        amountVerified: validation.amountVerified,
        referenceVerified: validation.referenceVerified,
        currencyVerified: validation.currencyVerified,
        providerVerified: validation.providerVerified,
      },
    );
  }

  if (validation.errors.length) {
    await appendPaymentAudit(
      'billing.provider_callback_rejected',
      paymentRecord,
      {
        requestedStatus: validation.normalizedStatus,
        validationErrors: validation.errors,
      },
      requestMeta,
    );
    logWarn('payment.callback.rejected', {
      paymentRecordId: paymentRecord.id,
      paymentReference: paymentRecord.externalRef,
      validationErrors: validation.errors,
    });

    return markPaymentForManualReview(
      paymentRecord,
      validation.errors.join(','),
      payload,
      requestMeta,
      {
        requestedStatus: validation.normalizedStatus,
        callbackSignaturePresent: Boolean(validation.callbackSignature),
        signatureVerified: validation.signatureVerified,
        amountVerified: validation.amountVerified,
        referenceVerified: validation.referenceVerified,
        currencyVerified: validation.currencyVerified,
        providerVerified: validation.providerVerified,
      },
    );
  }

  if (
    isPaymentFailedLike(paymentRecord.status) &&
    validation.normalizedStatus === PAYMENT_STATUS_FAILED
  ) {
    await appendPaymentAudit(
      'billing.provider_callback_duplicate',
      paymentRecord,
      {
        requestedStatus: validation.normalizedStatus,
      },
      requestMeta,
    );

    return {
      paymentRecord: buildPaymentRecordResponse(paymentRecord),
      subscription: null,
      listing: null,
      duplicateCallback: true,
    };
  }

  const updatedRecord = await updatePaymentRecordById(paymentRecord.id, {
    status:
      validation.normalizedStatus === PAYMENT_STATUS_FAILED
        ? PAYMENT_STATUS_FAILED
        : PAYMENT_STATUS_SUCCESS,
    externalRef: paymentReference || paymentRecord.externalRef,
    metadata: {
      callbackPayload: payload,
      callbackReceivedAt: nowIso(),
      callbackTimestamp: validation.callbackTimestamp,
      callbackStatus: validation.normalizedStatus,
      callbackSignatureVerified: config.paymentCallbackSignatureSecret
        ? validation.signatureVerified
        : null,
      callbackAmountVerified: validation.amountVerified,
      callbackReferenceVerified: validation.referenceVerified,
      callbackCurrencyVerified: validation.currencyVerified,
      callbackProviderVerified: validation.providerVerified,
      manualReviewRequired: false,
      manualReviewReason: null,
    },
  });

  await appendPaymentAudit(
    'billing.payment_result_recorded',
    updatedRecord,
    {
      result: validation.normalizedStatus,
    },
    requestMeta,
  );

  if (validation.normalizedStatus !== PAYMENT_STATUS_SUCCESS) {
    await appendPaymentAudit('billing.payment_failed', updatedRecord, {}, requestMeta);
    logWarn('payment.result.failed', {
      paymentRecordId: updatedRecord.id,
      paymentReference: updatedRecord.externalRef,
      status: validation.normalizedStatus,
    });

    return {
      paymentRecord: buildPaymentRecordResponse(updatedRecord),
      subscription: null,
      listing: null,
    };
  }

  let subscription = null;
  let listing = null;
  try {
    if (updatedRecord.type === 'subscription') {
      const subscriptionResult = await finalizeSubscriptionPayment(updatedRecord, requestMeta);
      subscription = subscriptionResult.subscription;
      listing = subscriptionResult.listing;
    } else if (['listing_fee', 'featured_listing'].includes(updatedRecord.type)) {
      listing = await finalizeListingPayment(updatedRecord, requestMeta);
    }
  } catch (error) {
    logError('payment.finalization.failed', {
      paymentRecordId: updatedRecord.id,
      paymentReference: updatedRecord.externalRef,
      error,
    });
    const manualReview = await markPaymentForManualReview(
      updatedRecord,
      'post_payment_finalization_failed',
      {
        paymentReference: updatedRecord.externalRef,
        paymentRecordId: updatedRecord.id,
        paymentStatus: validation.normalizedStatus,
        errorMessage: error.message,
      },
      requestMeta,
      {
        requestedStatus: validation.normalizedStatus,
        callbackSignaturePresent: Boolean(validation.callbackSignature),
        signatureVerified: validation.signatureVerified,
        amountVerified: validation.amountVerified,
        referenceVerified: validation.referenceVerified,
        currencyVerified: validation.currencyVerified,
        providerVerified: validation.providerVerified,
      },
    );

    return {
      ...manualReview,
      paymentRecord: buildPaymentRecordResponse(updatedRecord),
    };
  }

  await appendPaymentAudit('billing.payment_confirmed', updatedRecord, {}, requestMeta);
  logInfo('payment.result.success', {
    paymentRecordId: updatedRecord.id,
    paymentReference: updatedRecord.externalRef,
    type: updatedRecord.type,
  });

  return {
    paymentRecord: buildPaymentRecordResponse(updatedRecord),
    subscription,
    listing,
  };
}

async function getBillingSnapshot(userId) {
  const [settings, activeSubscription, latestSubscription, plans] = await Promise.all([
    getBillingSettings(),
    userId ? getActiveUserSubscription(userId) : null,
    userId ? getLatestUserSubscription(userId) : null,
    listActiveSubscriptionPlans(),
  ]);

  return {
    flags: {
      enablePaidListings: isFeatureEnabled('enablePaidListings'),
      enableSubscriptions: isFeatureEnabled('enableSubscriptions'),
    },
    settings,
    subscription: activeSubscription || latestSubscription,
    plans,
  };
}

async function startPaidListingFlow({
  user,
  listingId,
  featuredRequested = false,
  consents = [],
  requestMeta,
}) {
  return ensureListingPayment({
    user,
    listingId,
    billingStep: {
      featuredRequested,
    },
    consents,
    requestMeta,
  });
}

async function listAdminPaymentsSummary(limit = 100) {
  const rows = await db
    .prepare(
      `SELECT pr.*, u.name AS user_name, u.handle AS user_handle,
              p.listing_json AS listing_json
       FROM payment_records pr
       LEFT JOIN users u ON u.id = pr.user_id
       LEFT JOIN posts p ON p.id = pr.listing_id
       ORDER BY pr.created_at DESC
       LIMIT ?`,
    )
    .all(limit);

  return rows.map(mapAdminPaymentRow);
}

async function getAdminPaymentDetail(paymentId) {
  const row = await db
    .prepare(
      `SELECT pr.*, u.name AS user_name, u.handle AS user_handle,
              p.listing_json AS listing_json
       FROM payment_records pr
       LEFT JOIN users u ON u.id = pr.user_id
       LEFT JOIN posts p ON p.id = pr.listing_id
       WHERE pr.id = ?
       LIMIT 1`,
    )
    .get(paymentId);

  return row ? mapAdminPaymentRow(row) : null;
}

async function listAdminSubscriptionsSummary(limit = 100) {
  const rows = await db
    .prepare(
      `SELECT us.*, u.name AS user_name, u.handle AS user_handle,
              sp.name AS plan_name, sp.code AS plan_code
       FROM user_subscriptions us
       JOIN users u ON u.id = us.user_id
       JOIN subscription_plans sp ON sp.id = us.plan_id
       ORDER BY us.created_at DESC
       LIMIT ?`,
    )
    .all(limit);

  return rows.map(mapAdminSubscriptionRow);
}

async function getAdminBillingSettings() {
  return getBillingSettings();
}

async function updateAdminBillingSettings(patch, adminContext = {}) {
  const nextSettings = await updateBillingSettings(patch);

  await logAdminAction({
    actorId: adminContext.actorId || null,
    action: ADMIN_ACTION_ALIASES.togglePricing,
    targetType: 'billing_settings',
    targetId: nextSettings.id,
    reason: patch.reason,
    metadata: {
      patch: {
        paidListingsEnabled: patch.paidListingsEnabled,
        subscriptionRequiredForCommercial: patch.subscriptionRequiredForCommercial,
        individualListingFeeEnabled: patch.individualListingFeeEnabled,
        featuredListingFeeEnabled: patch.featuredListingFeeEnabled,
        individualListingFeeAmount: patch.individualListingFeeAmount,
        featuredListingFeeAmount: patch.featuredListingFeeAmount,
        currency: patch.currency,
      },
    },
    ipAddress: adminContext.ipAddress || null,
    userAgent: adminContext.userAgent || null,
  });

  return nextSettings;
}

async function listAdminSubscriptionPlans() {
  return listAllSubscriptionPlans();
}

async function saveAdminSubscriptionPlan(payload, adminContext = {}) {
  const plan = await upsertSubscriptionPlan(payload);

  await logAdminAction({
    actorId: adminContext.actorId || null,
    action: 'billing.plan.upsert',
    targetType: 'subscription_plan',
    targetId: plan.id,
    reason: payload.reason,
    metadata: {
      code: plan.code,
      name: plan.name,
      monthlyPrice: plan.monthlyPrice,
      yearlyPrice: plan.yearlyPrice,
      isCommercialOnly: plan.isCommercialOnly,
      isActive: plan.isActive,
    },
    ipAddress: adminContext.ipAddress || null,
    userAgent: adminContext.userAgent || null,
  });

  return plan;
}

module.exports = {
  evaluateListingBillingRequirement,
  ensureListingPayment,
  getAdminBillingSettings,
  getAdminPaymentDetail,
  getBillingSnapshot,
  handleBillingProviderCallback,
  listAdminPaymentsSummary,
  listAdminSubscriptionPlans,
  listAdminSubscriptionsSummary,
  saveAdminSubscriptionPlan,
  startPaidListingFlow,
  startSubscriptionCheckout,
  updateAdminBillingSettings,
};
