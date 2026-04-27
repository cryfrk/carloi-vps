const { appendAuditLog } = require('../audit-risk/audit.repository');
const { createRiskFlag } = require('../audit-risk/risk.repository');
const { isFeatureEnabled } = require('../feature-flags/config');
const {
  CONSENT_REQUIREMENTS,
  assertCommercialDeclarations,
  assertRequiredConsentTypes,
  recordUserConsents,
} = require('../consent/consent.service');
const {
  COMMERCIAL_PROFILE_TRANSITIONS,
} = require('./commercial-profile.state');
const { DOCUMENT_REVIEW_TRANSITIONS } = require('./document-review.state');
const {
  addCommercialDocument,
  bulkUpdateDocumentsByProfileId,
  countCommercialProfileAction,
  countRejectedDocumentsForUser,
  findDuplicateCommercialDocument,
  getCommercialProfileById,
  getCommercialProfileByUserId,
  getCommercialReviewDetail,
  getUserCommercialState,
  listCommercialAdminNotes,
  listCommercialDocumentsByProfileId,
  listCommercialDocumentsByUserId,
  listCommercialProfilesByStatus,
  updateCommercialProfileById,
  updateUserCommercialState,
  upsertCommercialProfile,
} = require('./commercial.repository');

const COMMERCIAL_REQUIRED_DOCUMENT_TYPES = ['tax_document', 'identity_document'];
const COMMERCIAL_SECONDARY_DOCUMENT_TYPES = [
  'authorization_certificate',
  'trade_registry',
  'other',
];
const ALLOWED_DOCUMENT_TYPES = [
  'tax_document',
  'authorization_certificate',
  'trade_registry',
  'identity_document',
  'other',
];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];
const MAX_DOCUMENT_SIZE = 15 * 1024 * 1024;
const MIN_DOCUMENT_SIZE = 8 * 1024;

function nowIso() {
  return new Date().toISOString();
}

function requireCommercialOnboardingEnabled() {
  if (!isFeatureEnabled('enableCommercialOnboarding')) {
    const error = new Error('Ticari hesap ozelligi su anda kapali.');
    error.statusCode = 403;
    throw error;
  }
}

function sortDocumentsByRecency(documents) {
  return [...documents].sort((left, right) =>
    String(right.uploadedAt || '').localeCompare(String(left.uploadedAt || '')),
  );
}

function buildDocumentCollections(documents = []) {
  const history = sortDocumentsByRecency(documents);
  const latestByType = new Map();
  const historyByType = {};

  for (const document of history) {
    if (!latestByType.has(document.type)) {
      latestByType.set(document.type, document);
    }

    if (!historyByType[document.type]) {
      historyByType[document.type] = [];
    }
    historyByType[document.type].push(document);
  }

  return {
    currentDocuments: Array.from(latestByType.values()),
    documentHistory: history,
    historyByType,
  };
}

function getCommercialRestrictionState(accountType, commercialStatus) {
  if (accountType !== 'commercial') {
    return {
      level: 'none',
      publishingBlockedReason: null,
    };
  }

  if (commercialStatus === 'revoked') {
    return {
      level: 'full',
      publishingBlockedReason:
        'Ticari hesap yetkileri kaldirildi. Ileri islem icin destek ile iletisime gecmeniz gerekir.',
    };
  }

  if (['pending', 'rejected', 'suspended', 'not_applied'].includes(commercialStatus)) {
    return {
      level: 'publish_blocked',
      publishingBlockedReason:
        commercialStatus === 'suspended'
          ? 'Ticari hesap gecici olarak askida. Onay yenilenmeden ticari ilan yayinlayamazsiniz.'
          : commercialStatus === 'rejected'
            ? 'Ticari basvuru reddedildi. Duzeltip yeniden gondermeden ticari ilan yayinlayamazsiniz.'
            : 'Ticari hesap basvurunuz inceleniyor. Onaylanmadan ilan veremezsiniz.',
    };
  }

  return {
    level: 'none',
    publishingBlockedReason: null,
  };
}

function assertCommercialMutationAllowed(userState, actionLabel) {
  const status = userState?.commercialStatus || 'not_applied';

  if (status === 'suspended') {
    const error = new Error(
      `${actionLabel} su anda kullanilamiyor. Ticari hesap gecici olarak askida.`,
    );
    error.statusCode = 403;
    throw error;
  }

  if (status === 'revoked') {
    const error = new Error(
      `${actionLabel} su anda kullanilamiyor. Ticari hesap yetkileri kaldirildi.`,
    );
    error.statusCode = 403;
    throw error;
  }
}

function normalizeCommercialPayload(payload = {}) {
  return {
    companyName: String(payload.companyName || '').trim(),
    taxOrIdentityType: payload.taxOrIdentityType === 'TCKN' ? 'TCKN' : 'VKN',
    taxOrIdentityNumber: String(payload.taxOrIdentityNumber || '').trim(),
    tradeName: String(payload.tradeName || '').trim() || null,
    mersisNumber: String(payload.mersisNumber || '').trim() || null,
    authorizedPersonName: String(payload.authorizedPersonName || '').trim() || null,
    authorizedPersonTitle: String(payload.authorizedPersonTitle || '').trim() || null,
    phone: String(payload.phone || '').trim(),
    city: String(payload.city || '').trim(),
    district: String(payload.district || '').trim(),
    address: String(payload.address || '').trim(),
    notes: String(payload.notes || '').trim() || null,
    status: payload.status || 'draft',
  };
}

function validateCommercialProfileDraft(payload) {
  if (!payload.companyName) {
    const error = new Error('Sirket veya isletme adi zorunludur.');
    error.statusCode = 400;
    throw error;
  }

  if (!payload.taxOrIdentityNumber) {
    const error = new Error('Vergi veya kimlik numarasi zorunludur.');
    error.statusCode = 400;
    throw error;
  }
}

function validateCommercialProfileForSubmission(payload) {
  validateCommercialProfileDraft(payload);

  const requiredFields = [
    ['phone', 'Iletisim telefonu zorunludur.'],
    ['city', 'Sehir zorunludur.'],
    ['district', 'Ilce zorunludur.'],
    ['address', 'Adres zorunludur.'],
  ];

  for (const [field, message] of requiredFields) {
    if (!payload[field]) {
      const error = new Error(message);
      error.statusCode = 400;
      throw error;
    }
  }
}

function validateDocumentPayload(payload) {
  const type = String(payload?.type || '').trim();
  const fileUrl = String(payload?.fileUrl || '').trim();
  const originalFileName = String(payload?.originalFileName || '').trim();
  const mimeType = String(payload?.mimeType || '').trim().toLowerCase();
  const fileSize = Number(payload?.fileSize || 0);

  if (!ALLOWED_DOCUMENT_TYPES.includes(type)) {
    const error = new Error('Desteklenmeyen belge tipi gonderildi.');
    error.statusCode = 400;
    throw error;
  }

  if (!fileUrl || !originalFileName) {
    const error = new Error('Belge baglantisi ve dosya adi zorunludur.');
    error.statusCode = 400;
    throw error;
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    const error = new Error('Belge formati desteklenmiyor. PDF veya gorsel dosya kullanin.');
    error.statusCode = 400;
    throw error;
  }

  if (fileSize <= 0 || fileSize > MAX_DOCUMENT_SIZE) {
    const error = new Error('Belge boyutu desteklenen sinirlar disinda.');
    error.statusCode = 400;
    throw error;
  }

  return {
    type,
    fileUrl,
    originalFileName,
    mimeType,
    fileSize,
  };
}

async function evaluateDocumentSuspicion(userId, normalizedDocument) {
  const suspiciousReasons = [];

  if (normalizedDocument.fileSize < MIN_DOCUMENT_SIZE) {
    suspiciousReasons.push('Dosya boyutu beklenenden kucuk.');
  }

  const previousRejectedCount = await countRejectedDocumentsForUser(
    userId,
    normalizedDocument.type,
  );

  if (previousRejectedCount >= 2) {
    suspiciousReasons.push('Ayni belge tipi daha once birden fazla kez reddedildi.');
  }

  const suspiciousFlag = suspiciousReasons.length > 0;
  return {
    suspiciousFlag,
    suspiciousReasons,
  };
}

function ensureProfileTransition(currentStatus, nextStatus) {
  const allowed = COMMERCIAL_PROFILE_TRANSITIONS[currentStatus] || [];
  if (currentStatus === nextStatus) {
    return;
  }
  if (!allowed.includes(nextStatus)) {
    const error = new Error('Ticari profil durumu bu adima gecirilemez.');
    error.statusCode = 400;
    throw error;
  }
}

function ensureDocumentTransition(currentStatus, nextStatus) {
  const allowed = DOCUMENT_REVIEW_TRANSITIONS[currentStatus] || [];
  if (currentStatus === nextStatus) {
    return;
  }
  if (!allowed.includes(nextStatus)) {
    const error = new Error('Belge durumu bu adima gecirilemez.');
    error.statusCode = 400;
    throw error;
  }
}

function requireReason(reason, message) {
  if (!String(reason || '').trim()) {
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }
}

function getMinimumDocumentSetState(documents) {
  const eligibleStatuses = new Set(['uploaded', 'pending_review', 'approved']);
  const types = new Set(
    documents
      .filter((document) => eligibleStatuses.has(document.status))
      .map((document) => document.type),
  );
  const hasBaseSet = COMMERCIAL_REQUIRED_DOCUMENT_TYPES.every((type) => types.has(type));
  const hasSecondary = COMMERCIAL_SECONDARY_DOCUMENT_TYPES.some((type) => types.has(type));
  return {
    hasMinimumSet: hasBaseSet && hasSecondary,
    requiredDocumentTypes: [
      ...COMMERCIAL_REQUIRED_DOCUMENT_TYPES,
      ...COMMERCIAL_SECONDARY_DOCUMENT_TYPES,
    ],
  };
}

function buildNextActions({
  accountType,
  commercialStatus,
  profile,
  documents,
  suspiciousDocumentCount,
  commercialBehaviorFlag,
}) {
  const commercialPrompt =
    commercialBehaviorFlag && accountType !== 'commercial'
      ? [
          'Yillik ilan veya satis hareketi nedeniyle ticari hesap incelemesi gerekebilir.',
        ]
      : [];

  if (!profile) {
    return [
      ...commercialPrompt,
      'Ticari hesap adimlarini baslatarak sirket bilgilerini ve gerekli belgeleri ekleyin.',
    ];
  }

  if (profile.status === 'draft') {
    return [
      ...commercialPrompt,
      'Eksik sirket bilgilerini ve belge setini tamamlayarak basvuruyu gonderin.',
    ];
  }

  if (profile.status === 'pending_review') {
    const actions = [
      ...commercialPrompt,
      'Basvurunuz platform incelemesinde. Gerekirse ek dogrulama istenebilir.',
    ];
    if (suspiciousDocumentCount > 0) {
      actions.push('Bazi belgeler ek inceleme gerektiriyor.');
    }
    return actions;
  }

  if (commercialStatus === 'rejected') {
    return [
      ...commercialPrompt,
      'Reddedilme nedenini inceleyip eksik belge veya bilgi duzeltmesi yaparak yeniden gonderin.',
    ];
  }

  if (commercialStatus === 'suspended') {
    return [
      ...commercialPrompt,
      'Ticari yetkiler gecici olarak askida. Hesap notlarini ve ek inceleme taleplerini kontrol edin.',
    ];
  }

  if (commercialStatus === 'revoked') {
    return [
      ...commercialPrompt,
      'Ticari yetkiler kaldirildi. Yeni bir inceleme gerekirse destek ile iletisime gecin.',
    ];
  }

  if (accountType === 'commercial' && commercialStatus === 'approved') {
    return [...commercialPrompt, 'Ticari hesap yetkileri platform incelemesiyle onaylandi.'];
  }

  if (!documents.length) {
    return [...commercialPrompt, 'Belge yukleyerek ticari hesap incelemesini baslatin.'];
  }

  return [...commercialPrompt, 'Ticari hesap durumunu bu ekrandan takip edebilirsiniz.'];
}

async function getCommercialStatusSummary(userId) {
  if (!isFeatureEnabled('enableCommercialOnboarding')) {
    return {
      enabled: false,
      accountType: 'individual',
      commercialStatus: 'not_applied',
      canUseCommercialListingFeatures: false,
      pendingReview: false,
      additionalVerificationRequired: false,
      yearlyVehicleSaleCount: 0,
      yearlyVehicleListingCount: 0,
      commercialBehaviorFlag: false,
      profile: null,
      documents: [],
      suspiciousDocumentCount: 0,
      minimumDocumentSet: {
        hasMinimumSet: false,
        requiredDocumentTypes: [
          ...COMMERCIAL_REQUIRED_DOCUMENT_TYPES,
          ...COMMERCIAL_SECONDARY_DOCUMENT_TYPES,
        ],
      },
      requiredDocumentTypes: [
        ...COMMERCIAL_REQUIRED_DOCUMENT_TYPES,
        ...COMMERCIAL_SECONDARY_DOCUMENT_TYPES,
      ],
      nextActions: [],
    };
  }
  const userState = await getUserCommercialState(userId);
  const profile = await getCommercialProfileByUserId(userId);
  const documents = await listCommercialDocumentsByUserId(userId);
  const documentCollections = buildDocumentCollections(documents);
  const suspiciousDocumentCount = documents.filter((document) => document.suspiciousFlag).length;
  const minimumDocumentSet = getMinimumDocumentSetState(documentCollections.currentDocuments);
  const restrictionState = getCommercialRestrictionState(
    userState?.accountType || 'individual',
    userState?.commercialStatus || 'not_applied',
  );

  return {
    enabled: true,
    accountType: userState?.accountType || 'individual',
    commercialStatus: userState?.commercialStatus || 'not_applied',
    canUseCommercialListingFeatures:
      Boolean(userState?.accountType === 'commercial') &&
      userState?.commercialStatus === 'approved',
    pendingReview:
      (profile?.status || userState?.commercialStatus) === 'pending_review' ||
      userState?.commercialStatus === 'pending',
    additionalVerificationRequired: suspiciousDocumentCount > 0,
    profile,
    documents,
    currentDocuments: documentCollections.currentDocuments,
    documentHistory: documentCollections.documentHistory,
    suspiciousDocumentCount,
    yearlyVehicleSaleCount: Number(userState?.yearlyVehicleSaleCount || 0),
    yearlyVehicleListingCount: Number(userState?.yearlyVehicleListingCount || 0),
    commercialBehaviorFlag: Boolean(userState?.commercialBehaviorFlag),
    minimumDocumentSet,
    requiredDocumentTypes: minimumDocumentSet.requiredDocumentTypes,
    canResubmit: (userState?.commercialStatus || 'not_applied') === 'rejected',
    featureRestrictionLevel: restrictionState.level,
    publishingBlockedReason: restrictionState.publishingBlockedReason,
    nextActions: buildNextActions({
      accountType: userState?.accountType || 'individual',
      commercialStatus: userState?.commercialStatus || 'not_applied',
      profile,
      documents: documentCollections.currentDocuments,
      suspiciousDocumentCount,
      commercialBehaviorFlag: Boolean(userState?.commercialBehaviorFlag),
    }),
  };
}

async function saveCommercialProfile(userId, payload, auditContext) {
  requireCommercialOnboardingEnabled();
  const userState = await getUserCommercialState(userId);
  assertCommercialMutationAllowed(userState, 'Ticari profil guncelleme');
  const normalized = normalizeCommercialPayload(payload);
  validateCommercialProfileDraft(normalized);

  const existing = await getCommercialProfileByUserId(userId);
  const nextStatus =
    existing?.status === 'rejected'
      ? 'draft'
      : existing?.status || 'draft';
  const profile = await upsertCommercialProfile(userId, {
    ...normalized,
    status: nextStatus,
  });

  await appendAuditLog({
    actorType: auditContext?.actorType || 'user',
    actorId: auditContext?.actorId || userId,
    targetType: 'commercial_profile',
    targetId: profile.id,
    action: existing ? 'commercial.profile_updated' : 'commercial.profile_created',
    metadata: {
      status: profile.status,
      accountTypeIntent: 'commercial',
    },
    ipAddress: auditContext?.ipAddress || null,
    userAgent: auditContext?.userAgent || null,
  });

  return profile;
}

async function queueCommercialDocument(userId, payload, auditContext) {
  requireCommercialOnboardingEnabled();
  const userState = await getUserCommercialState(userId);
  assertCommercialMutationAllowed(userState, 'Belge yukleme');
  const profile = await getCommercialProfileByUserId(userId);
  if (!profile) {
    const error = new Error('Ticari profil bulunamadi.');
    error.statusCode = 404;
    throw error;
  }

  const normalizedDocument = validateDocumentPayload(payload);
  const duplicateDocument = await findDuplicateCommercialDocument(profile.id, normalizedDocument);
  if (duplicateDocument) {
    await appendAuditLog({
      actorType: auditContext?.actorType || 'user',
      actorId: auditContext?.actorId || userId,
      targetType: 'commercial_document',
      targetId: duplicateDocument.id,
      action: 'commercial.document_upload_blocked',
      metadata: {
        reason: 'duplicate_document_upload',
        type: duplicateDocument.type,
      },
      ipAddress: auditContext?.ipAddress || null,
      userAgent: auditContext?.userAgent || null,
    });

    const error = new Error(
      'Ayni belge daha once yuklenmis. Yeni bir belge secerek tekrar deneyin.',
    );
    error.statusCode = 409;
    throw error;
  }
  const suspicion = await evaluateDocumentSuspicion(userId, normalizedDocument);

  const document = await addCommercialDocument({
    ...normalizedDocument,
    userId,
    commercialProfileId: profile.id,
    status: 'uploaded',
    verificationMethod: 'manual_admin_review',
    suspiciousFlag: suspicion.suspiciousFlag,
  });

  await appendAuditLog({
    actorType: auditContext?.actorType || 'user',
    actorId: auditContext?.actorId || userId,
    targetType: 'commercial_document',
    targetId: document.id,
    action: 'commercial.document_uploaded',
    metadata: {
      type: document.type,
      suspiciousFlag: document.suspiciousFlag,
      verificationMethod: document.verificationMethod,
    },
    ipAddress: auditContext?.ipAddress || null,
    userAgent: auditContext?.userAgent || null,
  });

  if (suspicion.suspiciousFlag) {
    await createRiskFlag({
      userId,
      type: 'suspicious_document',
      severity: 'medium',
      source: 'system_rule',
      notes: `Additional verification required. ${suspicion.suspiciousReasons.join(' ')}`.trim(),
    });

    await appendAuditLog({
      actorType: 'system',
      actorId: null,
      targetType: 'commercial_document',
      targetId: document.id,
      action: 'commercial.document_flagged',
      metadata: {
        suspiciousReasons: suspicion.suspiciousReasons,
      },
      ipAddress: auditContext?.ipAddress || null,
      userAgent: auditContext?.userAgent || null,
    });
  }

  if (profile.status === 'rejected') {
    await updateCommercialProfileById(profile.id, { status: 'draft' });
  }

  return document;
}

async function submitCommercialOnboarding(userId, payload, auditContext) {
  requireCommercialOnboardingEnabled();
  const userState = await getUserCommercialState(userId);
  assertCommercialMutationAllowed(userState, 'Ticari basvuru gonderimi');
  const existing = await getCommercialProfileByUserId(userId);
  if (!existing) {
    const error = new Error('Ticari profil bulunamadi.');
    error.statusCode = 404;
    throw error;
  }

  const normalized = normalizeCommercialPayload({
    ...existing,
    ...payload,
    status: existing.status,
  });
  validateCommercialProfileForSubmission(normalized);

  const normalizedConsents = assertRequiredConsentTypes(
    payload?.consents,
    CONSENT_REQUIREMENTS.commercialOnboarding.required,
    {
      defaultSourceScreen: CONSENT_REQUIREMENTS.commercialOnboarding.sourceScreen,
      message:
        'Ticari basvuru icin ticari beyan onayi gereklidir.',
    },
  );
  const declarations = assertCommercialDeclarations(payload);

  const documents = await listCommercialDocumentsByUserId(userId);
  const documentCollections = buildDocumentCollections(documents);
  const minimumDocumentSet = getMinimumDocumentSetState(documentCollections.currentDocuments);
  if (!minimumDocumentSet.hasMinimumSet) {
    const error = new Error(
      'Basvuru icin vergi belgesi ile birlikte kimlik veya sirket yetki belgelerinden en az biri yuklenmelidir.',
    );
    error.statusCode = 400;
    throw error;
  }

  const currentStatus = existing.status || 'draft';
  if (currentStatus === 'draft' || currentStatus === 'rejected') {
    ensureProfileTransition(currentStatus, 'submitted');
    ensureProfileTransition('submitted', 'pending_review');
  } else if (currentStatus === 'submitted') {
    ensureProfileTransition('submitted', 'pending_review');
  } else if (currentStatus !== 'pending_review') {
    const error = new Error(
      'Bu ticari hesap durumu icin yeni basvuru gonderimi kullanilamiyor.',
    );
    error.statusCode = 400;
    throw error;
  }

  await recordUserConsents({
    userId,
    consents: normalizedConsents,
    defaultSourceScreen: CONSENT_REQUIREMENTS.commercialOnboarding.sourceScreen,
    auditContext,
  });

  const submittedAt = nowIso();
  const profile = await upsertCommercialProfile(userId, {
    ...normalized,
    status: 'pending_review',
    submittedAt,
    documentTruthfulnessAcceptedAt: declarations.documentTruthfulnessAccepted
      ? submittedAt
      : null,
    additionalVerificationAcknowledgedAt:
      declarations.additionalVerificationAcknowledged ? submittedAt : null,
  });

  const currentDocuments = await listCommercialDocumentsByProfileId(profile.id);
  for (const document of currentDocuments) {
    if (document.status === 'uploaded') {
      ensureDocumentTransition('uploaded', 'pending_review');
    }
  }

  await bulkUpdateDocumentsByProfileId(profile.id, ['uploaded'], {
    status: 'pending_review',
    verificationMethod: 'manual_admin_review',
  });

  await updateUserCommercialState(userId, {
    accountType: 'commercial',
    commercialStatus: 'pending',
    commercialApprovedAt: null,
    commercialRejectedReason: null,
    commercialReviewedByAdminId: null,
    canCreatePaidListings: false,
  });

  await appendAuditLog({
    actorType: auditContext?.actorType || 'user',
    actorId: auditContext?.actorId || userId,
    targetType: 'commercial_profile',
    targetId: profile.id,
    action: currentStatus === 'rejected' ? 'commercial.profile_resubmitted' : 'commercial.profile_submitted',
    metadata: {
      status: 'pending_review',
      suspiciousDocumentCount: currentDocuments.filter((document) => document.suspiciousFlag)
        .length,
      minimumDocumentSetSatisfied: true,
      resubmission: currentStatus === 'rejected',
    },
    ipAddress: auditContext?.ipAddress || null,
    userAgent: auditContext?.userAgent || null,
  });

  return getCommercialStatusSummary(userId);
}

async function resubmitCommercialOnboarding(userId, payload, auditContext) {
  requireCommercialOnboardingEnabled();
  const profile = await getCommercialProfileByUserId(userId);
  if (!profile || profile.status !== 'rejected') {
    const error = new Error('Yeniden basvuru yalnizca reddedilen ticari hesaplar icin kullanilabilir.');
    error.statusCode = 400;
    throw error;
  }

  if (payload && Object.keys(payload).some((key) => key !== 'consents' && key !== 'declarations')) {
    await saveCommercialProfile(userId, payload, auditContext);
  }

  return submitCommercialOnboarding(userId, payload, auditContext);
}

async function listPendingCommercialReviews(status = 'pending_review') {
  requireCommercialOnboardingEnabled();
  const normalizedStatus = typeof status === 'string' ? status.trim() : '';
  return listCommercialProfilesByStatus(normalizedStatus || null);
}

async function getCommercialReviewProfileDetail(profileId) {
  requireCommercialOnboardingEnabled();
  const detail = await getCommercialReviewDetail(profileId);
  if (!detail) {
    const error = new Error('Ticari basvuru bulunamadi.');
    error.statusCode = 404;
    throw error;
  }
  return detail;
}

async function addCommercialAdminNote(profileId, options = {}) {
  requireCommercialOnboardingEnabled();
  const detail = await getCommercialReviewDetail(profileId);
  if (!detail) {
    const error = new Error('Ticari basvuru bulunamadi.');
    error.statusCode = 404;
    throw error;
  }

  const note = String(options.note || '').trim();
  if (!note) {
    const error = new Error('Admin notu zorunludur.');
    error.statusCode = 400;
    throw error;
  }

  await appendAuditLog({
    actorType: 'admin',
    actorId: options.adminId || null,
    targetType: 'commercial_profile',
    targetId: profileId,
    action: 'admin.commercial_note_added',
    metadata: {
      note,
      noteType: String(options.noteType || 'general').trim() || 'general',
    },
    ipAddress: options.auditContext?.ipAddress || null,
    userAgent: options.auditContext?.userAgent || null,
  });

  return getCommercialReviewDetail(profileId);
}

async function applyCommercialAdminDecision(profileId, decision, options = {}) {
  requireCommercialOnboardingEnabled();
  const detail = await getCommercialReviewDetail(profileId);
  if (!detail) {
    const error = new Error('Ticari basvuru bulunamadi.');
    error.statusCode = 404;
    throw error;
  }

  const adminId = options.adminId || null;
  const auditContext = options.auditContext || {};
  const reason = String(options.reason || '').trim();
  const now = nowIso();

  if (decision === 'approve') {
    ensureProfileTransition(detail.profile.status, 'approved');
    await updateCommercialProfileById(profileId, { status: 'approved' });
    await bulkUpdateDocumentsByProfileId(profileId, ['pending_review', 'uploaded'], {
      status: 'approved',
      reviewedByAdminId: adminId,
      reviewedAt: now,
      rejectReason: null,
      verificationMethod: 'manual_admin_review',
    });
    await updateUserCommercialState(detail.user.id, {
      accountType: 'commercial',
      commercialStatus: 'approved',
      commercialApprovedAt: now,
      commercialRejectedReason: null,
      commercialReviewedByAdminId: adminId,
      canCreatePaidListings: true,
    });
  } else if (decision === 'reject') {
    requireReason(reason, 'Reddetme nedeni zorunludur.');
    ensureProfileTransition(detail.profile.status, 'rejected');
    await updateCommercialProfileById(profileId, { status: 'rejected' });
    await bulkUpdateDocumentsByProfileId(profileId, ['pending_review'], {
      status: 'rejected',
      reviewedByAdminId: adminId,
      reviewedAt: now,
      rejectReason: reason,
      verificationMethod: 'manual_admin_review',
    });
    await updateUserCommercialState(detail.user.id, {
      accountType: 'commercial',
      commercialStatus: 'rejected',
      commercialApprovedAt: null,
      commercialRejectedReason: reason,
      commercialReviewedByAdminId: adminId,
      canCreatePaidListings: false,
    });

    const rejectionDecisionCount =
      (await countCommercialProfileAction(profileId, 'admin.commercial_reject')) + 1;
    const totalRejectedDocuments = await countRejectedDocumentsForUser(detail.user.id, null);
    if (rejectionDecisionCount >= 2 || totalRejectedDocuments >= 3) {
      await createRiskFlag({
        userId: detail.user.id,
        type: 'suspicious_document',
        severity: 'high',
        source: 'system_rule',
        notes:
          'Repeated rejection pattern detected. Additional verification required before commercial privileges can continue.',
      });

      await appendAuditLog({
        actorType: 'system',
        actorId: null,
        targetType: 'commercial_profile',
        targetId: profileId,
        action: 'commercial.repeated_rejection_detected',
        metadata: {
          rejectionDecisionCount,
          totalRejectedDocuments,
        },
        ipAddress: auditContext.ipAddress || null,
        userAgent: auditContext.userAgent || null,
      });
    }
  } else if (decision === 'suspend') {
    requireReason(reason, 'Askıya alma nedeni zorunludur.');
    ensureProfileTransition(detail.profile.status, 'suspended');
    await updateCommercialProfileById(profileId, { status: 'suspended' });
    await updateUserCommercialState(detail.user.id, {
      accountType: 'commercial',
      commercialStatus: 'suspended',
      commercialApprovedAt: detail.user.commercialApprovedAt || null,
      commercialRejectedReason: reason,
      commercialReviewedByAdminId: adminId,
      canCreatePaidListings: false,
    });
  } else if (decision === 'revoke') {
    requireReason(reason, 'Yetki kaldirma nedeni zorunludur.');
    ensureProfileTransition(detail.profile.status, 'revoked');
    await updateCommercialProfileById(profileId, { status: 'revoked' });
    await updateUserCommercialState(detail.user.id, {
      accountType: 'commercial',
      commercialStatus: 'revoked',
      commercialApprovedAt: null,
      commercialRejectedReason: reason,
      commercialReviewedByAdminId: adminId,
      canCreatePaidListings: false,
    });
  } else {
    const error = new Error('Bilinmeyen ticari inceleme aksiyonu.');
    error.statusCode = 400;
    throw error;
  }

  await appendAuditLog({
    actorType: 'admin',
    actorId: adminId,
    targetType: 'commercial_profile',
    targetId: profileId,
    action: `admin.commercial_${decision}`,
    metadata: {
      reason: reason || null,
      previousStatus: detail.profile.status,
      nextStatus:
        decision === 'approve'
          ? 'approved'
          : decision === 'reject'
            ? 'rejected'
            : decision === 'suspend'
              ? 'suspended'
              : 'revoked',
    },
    ipAddress: auditContext.ipAddress || null,
    userAgent: auditContext.userAgent || null,
  });

  return getCommercialReviewDetail(profileId);
}

module.exports = {
  addCommercialAdminNote,
  getCommercialReviewProfileDetail,
  getCommercialStatusSummary,
  listPendingCommercialReviews,
  queueCommercialDocument,
  resubmitCommercialOnboarding,
  saveCommercialProfile,
  submitCommercialOnboarding,
  applyCommercialAdminDecision,
};
