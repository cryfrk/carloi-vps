const { isFeatureEnabled } = require('../feature-flags/config');
const { getListingCompliance, upsertListingCompliance } = require('./compliance.repository');

function normalizeCompliancePayload(payload) {
  return {
    sellerRelationType: payload.sellerRelationType || null,
    plateNumber: String(payload.plateNumber || '').trim() || null,
    registrationOwnerFullNameDeclared:
      String(payload.registrationOwnerFullNameDeclared || '').trim() || null,
    isOwnerSameAsAccountHolder:
      payload.isOwnerSameAsAccountHolder === undefined
        ? null
        : Boolean(payload.isOwnerSameAsAccountHolder),
    authorizationDeclarationText: String(payload.authorizationDeclarationText || '').trim() || null,
    authorizationDeclarationAccepted: Boolean(payload.authorizationDeclarationAccepted),
    authorizationStatus: payload.authorizationStatus || 'not_required',
    eidsStatus: payload.eidsStatus || 'not_started',
    safePaymentInfoAccepted: Boolean(payload.safePaymentInfoAccepted),
    safePaymentInfoAcceptedAt: payload.safePaymentInfoAcceptedAt || null,
    listingComplianceStatus: payload.listingComplianceStatus || 'draft',
    riskScore: Number.isFinite(Number(payload.riskScore)) ? Number(payload.riskScore) : 0,
    riskLevel: payload.riskLevel || 'low',
    billingRequired: Boolean(payload.billingRequired),
    billingStatus: payload.billingStatus || 'not_required',
    paymentRecordId: payload.paymentRecordId || null,
    duplicatePlateFlag: Boolean(payload.duplicatePlateFlag),
    abnormalPriceFlag: Boolean(payload.abnormalPriceFlag),
    spamContentFlag: Boolean(payload.spamContentFlag),
    reviewRequiredReason: String(payload.reviewRequiredReason || '').trim() || null,
    reviewedByAdminId: payload.reviewedByAdminId || null,
    reviewedAt: payload.reviewedAt || null,
  };
}

async function saveListingCompliance(postId, payload) {
  if (
    !isFeatureEnabled('enableListingComplianceStep') &&
    !isFeatureEnabled('enableSafePaymentGuidance') &&
    !isFeatureEnabled('enablePaidListings')
  ) {
    return null;
  }

  return upsertListingCompliance(postId, normalizeCompliancePayload(payload));
}

async function ensureSafePaymentAcknowledged(postId) {
  if (!isFeatureEnabled('enableSafePaymentGuidance')) {
    return { allowed: true };
  }

  const compliance = await getListingCompliance(postId);
  if (compliance?.safe_payment_info_accepted) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: 'Guvenli odeme bilgilendirmesi henuz onaylanmadi.',
  };
}

module.exports = {
  ensureSafePaymentAcknowledged,
  saveListingCompliance,
};
