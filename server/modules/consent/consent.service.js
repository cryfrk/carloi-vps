const { appendAuditLog } = require('../audit-risk/audit.repository');
const {
  CONSENT_REQUIREMENTS,
  CONSENT_TYPES,
  LISTING_RELATION_TYPES,
  getConsentVersion,
  isKnownConsentType,
} = require('./constants');
const { insertMissingUserConsents, listUserConsents } = require('./consent.repository');

function nowIso() {
  return new Date().toISOString();
}

function normalizeConsentRecords(consents, { defaultSourceScreen = 'unknown' } = {}) {
  if (!Array.isArray(consents)) {
    return [];
  }

  const records = new Map();
  for (const consent of consents) {
    const type = String(consent?.type || '').trim();
    if (!isKnownConsentType(type)) {
      continue;
    }

    if (consent?.accepted === false) {
      continue;
    }

    const version = String(consent?.version || '').trim() || getConsentVersion(type);
    const sourceScreen = String(consent?.sourceScreen || '').trim() || defaultSourceScreen;
    const key = `${type}:${version}`;

    records.set(key, {
      type,
      version,
      sourceScreen,
      acceptedAt: String(consent?.acceptedAt || '').trim() || nowIso(),
    });
  }

  return [...records.values()];
}

function assertRequiredConsentTypes(consents, requiredTypes, options = {}) {
  const normalized = normalizeConsentRecords(consents, {
    defaultSourceScreen: options.defaultSourceScreen,
  });
  const acceptedTypes = new Set(normalized.map((consent) => consent.type));
  const missing = requiredTypes.filter((type) => !acceptedTypes.has(type));

  if (missing.length) {
    const error = new Error(
      options.message || 'Devam etmek icin gerekli yasal onaylarin tamamini kabul etmelisiniz.',
    );
    error.statusCode = options.statusCode || 400;
    error.errorCode = 'CONSENT_REQUIRED';
    error.metadata = { missingConsentTypes: missing };
    throw error;
  }

  return normalized;
}

async function recordUserConsents({ userId, consents, defaultSourceScreen, auditContext }) {
  const normalized = normalizeConsentRecords(consents, { defaultSourceScreen });
  if (!normalized.length) {
    return [];
  }

  const inserted = await insertMissingUserConsents(userId, normalized);
  for (const consent of inserted) {
    await appendAuditLog({
      actorType: auditContext?.actorType || 'user',
      actorId: auditContext?.actorId || userId,
      targetType: 'user_consent',
      targetId: userId,
      action: 'consent.accepted',
      metadata: {
        consentType: consent.type,
        version: consent.version,
        sourceScreen: consent.sourceScreen,
      },
      ipAddress: auditContext?.ipAddress || null,
      userAgent: auditContext?.userAgent || null,
    });
  }

  return inserted;
}

function normalizeListingLegalPayload(listingDraft) {
  const sellerRelationType = String(listingDraft?.sellerRelationType || '').trim();
  const registrationOwnerFullNameDeclared = String(
    listingDraft?.registrationOwnerFullNameDeclared || '',
  ).trim();
  const authorizationDeclarationText = String(
    listingDraft?.authorizationDeclarationText || '',
  ).trim();
  const isOwnerSameAsAccountHolder = listingDraft?.isOwnerSameAsAccountHolder;

  if (!LISTING_RELATION_TYPES.includes(sellerRelationType)) {
    const error = new Error('Ilan icin arac sahibi / yetki iliskisi secilmelidir.');
    error.statusCode = 400;
    throw error;
  }

  if (typeof isOwnerSameAsAccountHolder !== 'boolean') {
    const error = new Error('Hesap sahibi ile ruhsat sahibi iliskisi belirtilmelidir.');
    error.statusCode = 400;
    throw error;
  }

  if (!registrationOwnerFullNameDeclared) {
    const error = new Error('Ruhsat sahibi adi beyan edilmelidir.');
    error.statusCode = 400;
    throw error;
  }

  if (sellerRelationType !== 'owner' && !authorizationDeclarationText) {
    const error = new Error('Yetkili satis beyan metni zorunludur.');
    error.statusCode = 400;
    throw error;
  }

  return {
    sellerRelationType,
    registrationOwnerFullNameDeclared,
    isOwnerSameAsAccountHolder,
    authorizationDeclarationText: authorizationDeclarationText || null,
    authorizationStatus: sellerRelationType === 'owner' ? 'not_required' : 'declared',
    listingComplianceStatus: sellerRelationType === 'owner' ? 'published' : 'submitted',
    reviewRequiredReason:
      sellerRelationType === 'owner'
        ? null
        : 'Arac pazarlama yetkisi hesap sahibi tarafindan beyan edildi; ek dogrulama gerekebilir.',
  };
}

function assertCommercialDeclarations(payload) {
  const declarations = payload?.declarations || {};
  if (!declarations.documentTruthfulnessAccepted || !declarations.additionalVerificationAcknowledged) {
    const error = new Error(
      'Ticari basvuru icin belge dogrulugu ve ek inceleme kosullari kabul edilmelidir.',
    );
    error.statusCode = 400;
    throw error;
  }

  return declarations;
}

function assertSafePaymentConsent(consents, options = {}) {
  return assertRequiredConsentTypes(consents, CONSENT_REQUIREMENTS.safePayment.required, {
    defaultSourceScreen: CONSENT_REQUIREMENTS.safePayment.sourceScreen,
    message:
      options.message ||
      'Resmi guvenli odeme bilgilendirmesini onaylamadan satis tamamlama adimina gecemezsiniz.',
  });
}

function assertSubscriptionTermsConsent(consents, options = {}) {
  return assertRequiredConsentTypes(consents, CONSENT_REQUIREMENTS.subscription.required, {
    defaultSourceScreen: CONSENT_REQUIREMENTS.subscription.sourceScreen,
    message:
      options.message ||
      'Abonelik veya ucretli ilan adimi icin dijital hizmet ve abonelik kosullarini kabul etmelisiniz.',
  });
}

module.exports = {
  CONSENT_REQUIREMENTS,
  CONSENT_TYPES,
  assertCommercialDeclarations,
  assertRequiredConsentTypes,
  assertSafePaymentConsent,
  assertSubscriptionTermsConsent,
  listUserConsents,
  normalizeConsentRecords,
  normalizeListingLegalPayload,
  recordUserConsents,
};
