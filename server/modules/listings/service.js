const { appendAuditLog } = require('../audit-risk/audit.repository');
const { evaluateListingBillingRequirement } = require('../billing/subscription.service');
const { saveListingCompliance } = require('../compliance/compliance.service');
const {
  CONSENT_REQUIREMENTS,
  assertRequiredConsentTypes,
} = require('../consent/consent.service');
const { isFeatureEnabled } = require('../feature-flags/config');
const {
  LISTING_CREATE_FLOW_STATES,
  LISTING_PUBLISH_DECISIONS,
} = require('./constants');
const { evaluateListingRisk, persistListingRiskArtifacts } = require('./risk.service');
const {
  normalizeListingFlowPayload,
  validateBillingStep,
  validateComplianceResponsibilityStep,
  validateOwnershipAuthorizationStep,
  validatePreviewPublishStep,
  validatePricingDescriptionStep,
  validateVehicleInformationStep,
} = require('./validators');

function pushState(history, state) {
  if (LISTING_CREATE_FLOW_STATES.includes(state) && history[history.length - 1] !== state) {
    history.push(state);
  }
}

function getAuthorizationStatus(flow) {
  return flow.ownershipAuthorization.sellerRelationType === 'owner' ? 'not_required' : 'declared';
}

function getEidsStatus(flow) {
  return flow.ownershipAuthorization.sellerRelationType === 'owner'
    ? 'declared'
    : 'manual_review_required';
}

function buildListingFlowMessage(finalState, paymentRequired) {
  if (finalState === 'published') {
    return 'Ilan yayina alindi. Gerekirse ek dogrulama daha sonra istenebilir.';
  }

  if (finalState === 'submitted') {
    return 'Ilan ek inceleme icin siraya alindi. Ek dogrulama gerekebilir.';
  }

  if (finalState === 'restricted') {
    return 'Ilan kisitli duruma alindi. Yayina gecmeden once ek inceleme gerekiyor.';
  }

  if (finalState === 'payment_pending' && paymentRequired) {
    return 'Ilan taslagi odeme bekliyor. Ucret tamamlandiktan sonra yayinlama devam eder.';
  }

  return 'Ilan taslagi kaydedildi.';
}

async function evaluateListingCreateFlow({
  user,
  hasVehicle,
  payload,
  existingPostId,
}) {
  const isCommercialAccount =
    (user?.account_type || user?.accountType || 'individual') === 'commercial';
  const commercialStatus = user?.commercial_status || user?.commercialStatus || 'not_applied';

  if (isCommercialAccount && commercialStatus !== 'approved') {
    const error = new Error(
      commercialStatus === 'suspended'
        ? 'Ticari hesap yetkileriniz gecici olarak askida. Onay yenilenmeden ilan yayinlayamazsiniz.'
        : commercialStatus === 'revoked'
          ? 'Ticari hesap yetkileriniz kaldirildi. Ileri islem icin destek ile iletisime gecin.'
          : 'Ilan paylasimi icin hesabinizin onaylanmasi gerekmektedir.',
    );
    error.statusCode = 403;
    throw error;
  }

  const flow = normalizeListingFlowPayload(payload);
  const stateHistory = ['draft'];

  const listingConsents = assertRequiredConsentTypes(
    payload.consents,
    CONSENT_REQUIREMENTS.listingCreation.required,
    {
      defaultSourceScreen: CONSENT_REQUIREMENTS.listingCreation.sourceScreen,
      message:
        'Ilan sorumlulugu ve guvenli odeme bilgilendirmesi onaylari olmadan ilana devam edemezsiniz.',
    },
  );

  validateVehicleInformationStep(flow, { hasVehicle });
  pushState(stateHistory, 'vehicle_info_completed');

  validatePricingDescriptionStep(flow);
  pushState(stateHistory, 'pricing_completed');

  validateOwnershipAuthorizationStep(flow);
  pushState(stateHistory, 'ownership_completed');

  validateComplianceResponsibilityStep(flow);
  pushState(stateHistory, 'compliance_completed');

  validatePreviewPublishStep(flow);

  const riskAssessment = await evaluateListingRisk({
    userId: user.id,
    excludePostId: existingPostId,
    plateNumber: flow.vehicleInformation.plateNumber,
    price: flow.pricingDescription.price,
    content: flow.pricingDescription.content,
    description: flow.pricingDescription.description,
  });

  const paidListingsEnabled = isFeatureEnabled('enablePaidListings');
  validateBillingStep(flow, {
    paymentRequired: paidListingsEnabled,
  });
  const payment = await evaluateListingBillingRequirement({
    user,
    listingId: existingPostId,
    billingStep: flow.billingListingFee,
  });

  let finalState = 'draft';
  let reviewRequiredReason = null;
  if (riskAssessment.level !== 'low') {
    reviewRequiredReason = riskAssessment.notes.join(' ');
  }

  if (payment.paymentRequired && !payment.paymentResolved) {
    finalState = 'payment_pending';
    pushState(stateHistory, 'payment_pending');
  } else {
    pushState(stateHistory, 'submitted');

    finalState = LISTING_PUBLISH_DECISIONS[riskAssessment.level];

    return {
      flow,
      listingConsents,
      payment,
      stateHistory: finalState === 'submitted' ? stateHistory : [...stateHistory, finalState],
      finalState,
      message: buildListingFlowMessage(finalState, payment.paymentRequired),
      reviewRequiredReason,
      riskAssessment,
      compliancePayload: {
        sellerRelationType: flow.ownershipAuthorization.sellerRelationType,
        plateNumber: flow.vehicleInformation.plateNumber,
        registrationOwnerFullNameDeclared:
          flow.ownershipAuthorization.registrationOwnerFullNameDeclared,
        isOwnerSameAsAccountHolder:
          flow.ownershipAuthorization.isOwnerSameAsAccountHolder,
        authorizationDeclarationText:
          flow.ownershipAuthorization.authorizationDeclarationText || null,
        authorizationDeclarationAccepted:
          flow.complianceResponsibility.authorizationDeclarationAccepted,
        authorizationStatus: getAuthorizationStatus(flow),
        eidsStatus: getEidsStatus(flow),
        safePaymentInfoAccepted:
          flow.complianceResponsibility.safePaymentInformationAccepted,
        safePaymentInfoAcceptedAt:
          flow.complianceResponsibility.safePaymentInformationAccepted
            ? new Date().toISOString()
            : null,
        listingComplianceStatus: finalState,
        reviewRequiredReason,
        riskScore: riskAssessment.score,
        riskLevel: riskAssessment.level,
        billingRequired: payment.paymentRequired,
        billingStatus: payment.paymentStatus,
        paymentRecordId:
          payment.existingPaymentRecord?.id || flow.billingListingFee.paymentRecordId,
        duplicatePlateFlag: riskAssessment.duplicatePlate.flagged,
        abnormalPriceFlag: riskAssessment.abnormalPrice.flagged,
        spamContentFlag: riskAssessment.spamContent.flagged,
      },
    };
  }

  return {
    flow,
    listingConsents,
    payment,
    stateHistory,
    finalState,
    message: buildListingFlowMessage(finalState, payment.paymentRequired),
    reviewRequiredReason,
    riskAssessment,
    compliancePayload: {
      sellerRelationType: flow.ownershipAuthorization.sellerRelationType,
      plateNumber: flow.vehicleInformation.plateNumber,
      registrationOwnerFullNameDeclared:
        flow.ownershipAuthorization.registrationOwnerFullNameDeclared,
      isOwnerSameAsAccountHolder: flow.ownershipAuthorization.isOwnerSameAsAccountHolder,
      authorizationDeclarationText:
        flow.ownershipAuthorization.authorizationDeclarationText || null,
      authorizationDeclarationAccepted:
        flow.complianceResponsibility.authorizationDeclarationAccepted,
      authorizationStatus: getAuthorizationStatus(flow),
      eidsStatus: getEidsStatus(flow),
      safePaymentInfoAccepted:
        flow.complianceResponsibility.safePaymentInformationAccepted,
      safePaymentInfoAcceptedAt:
        flow.complianceResponsibility.safePaymentInformationAccepted
          ? new Date().toISOString()
          : null,
      listingComplianceStatus: finalState,
      reviewRequiredReason,
      riskScore: riskAssessment.score,
      riskLevel: riskAssessment.level,
      billingRequired: payment.paymentRequired,
      billingStatus: payment.paymentStatus,
      paymentRecordId:
        payment.existingPaymentRecord?.id || flow.billingListingFee.paymentRecordId,
      duplicatePlateFlag: riskAssessment.duplicatePlate.flagged,
      abnormalPriceFlag: riskAssessment.abnormalPrice.flagged,
      spamContentFlag: riskAssessment.spamContent.flagged,
    },
  };
}

async function persistListingCreateFlowArtifacts({
  postId,
  userId,
  evaluation,
  requestMeta,
}) {
  await saveListingCompliance(postId, evaluation.compliancePayload);

  for (const state of evaluation.stateHistory) {
    await appendAuditLog({
      actorType: 'user',
      actorId: userId,
      targetType: 'listing',
      targetId: postId,
      action: 'listing.flow_state_changed',
      metadata: {
        flowState: state,
        finalState: evaluation.finalState,
      },
      ipAddress: requestMeta?.ipAddress || null,
      userAgent: requestMeta?.userAgent || null,
    });
  }

  await appendAuditLog({
    actorType: 'user',
    actorId: userId,
    targetType: 'listing',
    targetId: postId,
    action:
      evaluation.finalState === 'published'
        ? 'listing.published'
        : evaluation.finalState === 'payment_pending'
          ? 'listing.payment_pending'
          : 'listing.submitted',
    metadata: {
      listingComplianceStatus: evaluation.finalState,
      paymentRequired: evaluation.payment.paymentRequired,
      paymentStatus: evaluation.payment.paymentStatus,
      riskScore: evaluation.riskAssessment.score,
      riskLevel: evaluation.riskAssessment.level,
      reviewRequiredReason: evaluation.reviewRequiredReason,
    },
    ipAddress: requestMeta?.ipAddress || null,
    userAgent: requestMeta?.userAgent || null,
  });

  await persistListingRiskArtifacts({
    userId,
    listingId: postId,
    assessment: evaluation.riskAssessment,
    requestMeta,
  });
}

module.exports = {
  evaluateListingCreateFlow,
  persistListingCreateFlowArtifacts,
};
