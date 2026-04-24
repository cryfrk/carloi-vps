const { appendAuditLog } = require('../audit-risk/audit.repository');
const { isFeatureEnabled } = require('../feature-flags/config');
const {
  CONSENT_REQUIREMENTS,
  assertSafePaymentConsent,
  recordUserConsents,
} = require('../consent/consent.service');
const { saveListingCompliance } = require('../compliance/compliance.service');
const {
  createSaleProcess,
  getLatestSaleProcessForParticipant,
  getListingSellerRow,
  getSaleProcessByListingAndBuyer,
  updateSaleProcess,
} = require('./repository');

const SALE_STATUS_TRANSITIONS = Object.freeze({
  interest: ['negotiating', 'payment_guidance_shown', 'cancelled'],
  negotiating: ['payment_guidance_shown', 'cancelled'],
  payment_guidance_shown: ['ready_for_notary', 'cancelled'],
  ready_for_notary: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
});

function nowIso() {
  return new Date().toISOString();
}

function ensureTransition(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) {
    return;
  }

  const allowed = SALE_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    const error = new Error('Satis sureci bu duruma gecirilemez.');
    error.statusCode = 400;
    throw error;
  }
}

function parseListingRow(row) {
  if (!row) {
    return null;
  }

  let listing = null;
  try {
    listing = row.listing_json ? JSON.parse(row.listing_json) : null;
  } catch {
    listing = null;
  }

  return {
    id: row.id,
    sellerUserId: row.author_user_id,
    listing,
  };
}

function buildSaleSummary(process, listingId, guidanceEnabled) {
  return {
    id: process.id,
    listingId,
    buyerUserId: process.buyerUserId,
    sellerUserId: process.sellerUserId,
    status: process.status,
    safePaymentInfoAcceptedAt: process.safePaymentInfoAcceptedAt,
    safePaymentReferenceCode: process.safePaymentReferenceCode,
    safePaymentProviderName: process.safePaymentProviderName,
    safePaymentStatusNote:
      process.safePaymentStatusNote ||
      'Resmi guvenli odeme sureci takip edilmelidir. Platform odeme emanet kurumu degildir.',
    guidanceEnabled,
    requiresGuidanceAcknowledgement:
      guidanceEnabled && !process.safePaymentInfoAcceptedAt,
  };
}

async function recordSaleAudit(action, process, requestMeta, metadata = {}) {
  await appendAuditLog({
    actorType: requestMeta?.actorType || 'user',
    actorId: requestMeta?.actorId || null,
    targetType: 'sale_process',
    targetId: process.id,
    action,
    metadata: {
      listingId: process.listingId,
      buyerUserId: process.buyerUserId,
      sellerUserId: process.sellerUserId,
      status: process.status,
      ...metadata,
    },
    ipAddress: requestMeta?.ipAddress || null,
    userAgent: requestMeta?.userAgent || null,
  });
}

async function startSaleProcess(listingId, buyerUserId, requestMeta = {}) {
  const listingRow = parseListingRow(await getListingSellerRow(listingId));
  if (!listingRow) {
    const error = new Error('Ilan bulunamadi.');
    error.statusCode = 404;
    throw error;
  }

  if (listingRow.sellerUserId === buyerUserId) {
    const error = new Error('Satici kendi ilani icin satis sureci baslatamaz.');
    error.statusCode = 400;
    throw error;
  }

  if (listingRow.listing?.isSold) {
    const error = new Error('Bu ilan icin satis sureci zaten kapatildi.');
    error.statusCode = 409;
    throw error;
  }

  let process = await getSaleProcessByListingAndBuyer(listingId, buyerUserId);
  if (!process || process.status === 'cancelled' || process.status === 'completed') {
    process = await createSaleProcess({
      listingId,
      buyerUserId,
      sellerUserId: listingRow.sellerUserId,
      status: 'interest',
      safePaymentStatusNote:
        'Resmi guvenli odeme sureci takip edilmelidir. Platform odeme emanet kurumu degildir.',
    });

    await recordSaleAudit('sale.started', process, requestMeta, {
      guidanceEnabled: isFeatureEnabled('enableSafePaymentGuidance'),
    });
  }

  return buildSaleSummary(process, listingId, isFeatureEnabled('enableSafePaymentGuidance'));
}

async function acknowledgeSafePayment(listingId, userId, consents, requestMeta = {}) {
  const process = await getLatestSaleProcessForParticipant(listingId, userId);
  if (!process || process.status === 'cancelled' || process.status === 'completed') {
    const error = new Error('Aktif satis sureci bulunamadi.');
    error.statusCode = 404;
    throw error;
  }

  const guidanceEnabled = isFeatureEnabled('enableSafePaymentGuidance');
  const normalizedConsents = assertSafePaymentConsent(consents, {
    message:
      'Satis surecinde devam etmeden once guvenli odeme bilgilendirmesini kabul etmelisiniz.',
  });

  await recordUserConsents({
    userId,
    consents: normalizedConsents,
    defaultSourceScreen: CONSENT_REQUIREMENTS.safePayment.sourceScreen,
    auditContext: {
      actorType: requestMeta?.actorType || 'user',
      actorId: requestMeta?.actorId || userId,
      ipAddress: requestMeta?.ipAddress || null,
      userAgent: requestMeta?.userAgent || null,
    },
  });

  const nextStatus =
    process.status === 'interest' || process.status === 'negotiating'
      ? 'payment_guidance_shown'
      : process.status;
  ensureTransition(process.status, nextStatus);

  const acceptedAt = nowIso();
  const updated = await updateSaleProcess(process.id, {
    status: nextStatus,
    safePaymentInfoAcceptedAt: acceptedAt,
    safePaymentStatusNote:
      'Kullanicilar resmi guvenli odeme sureci konusunda bilgilendirildi. Ek dogrulama gerekebilir.',
  });

  await saveListingCompliance(listingId, {
    safePaymentInfoAccepted: true,
    safePaymentInfoAcceptedAt: acceptedAt,
  });

  await recordSaleAudit('sale.safe_payment_acknowledged', updated, requestMeta, {
    guidanceEnabled,
  });

  return buildSaleSummary(updated, listingId, guidanceEnabled);
}

async function markReadyForNotary(listingId, userId, requestMeta = {}) {
  const process = await getLatestSaleProcessForParticipant(listingId, userId);
  if (!process || process.status === 'cancelled' || process.status === 'completed') {
    const error = new Error('Aktif satis sureci bulunamadi.');
    error.statusCode = 404;
    throw error;
  }

  const guidanceEnabled = isFeatureEnabled('enableSafePaymentGuidance');
  if (guidanceEnabled && !process.safePaymentInfoAcceptedAt) {
    const error = new Error(
      'Resmi guvenli odeme bilgilendirmesi gorulmeden noter adimina gecilemez.',
    );
    error.statusCode = 400;
    throw error;
  }

  const currentStatus = process.status === 'interest' ? 'negotiating' : process.status;
  const normalized = currentStatus === process.status
    ? process
    : await updateSaleProcess(process.id, { status: currentStatus });
  ensureTransition(normalized.status, 'ready_for_notary');

  const updated = await updateSaleProcess(normalized.id, {
    status: 'ready_for_notary',
  });

  await recordSaleAudit('sale.ready_for_notary', updated, requestMeta);
  return buildSaleSummary(updated, listingId, guidanceEnabled);
}

async function completeSale(listingId, userId, requestMeta = {}) {
  const process = await getLatestSaleProcessForParticipant(listingId, userId);
  if (!process || process.status === 'cancelled' || process.status === 'completed') {
    const error = new Error('Tamamlanacak aktif satis sureci bulunamadi.');
    error.statusCode = 404;
    throw error;
  }

  if (process.status !== 'ready_for_notary') {
    const error = new Error('Satis sureci noter hazirligina gecmeden tamamlanamaz.');
    error.statusCode = 400;
    throw error;
  }

  const updated = await updateSaleProcess(process.id, {
    status: 'completed',
    safePaymentStatusNote:
      'Satis sureci taraflarca tamamlandi olarak isaretlendi. Resmi noterde devir sureci izlenmelidir.',
  });

  await recordSaleAudit('sale.completed', updated, requestMeta);
  return buildSaleSummary(updated, listingId, isFeatureEnabled('enableSafePaymentGuidance'));
}

module.exports = {
  acknowledgeSafePayment,
  completeSale,
  markReadyForNotary,
  startSaleProcess,
};
