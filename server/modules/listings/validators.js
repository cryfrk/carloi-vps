const {
  LISTING_BILLING_STATUSES,
  LISTING_SELLER_RELATION_OPTIONS,
} = require('./constants');

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return fallback;
}

function parsePriceToNumber(price) {
  const digits = String(price || '').replace(/[^\d]/g, '');
  return digits ? Number(digits) : null;
}

function buildLegacyListingFlow(listingDraft = {}) {
  return {
    vehicleInformation: {
      title: normalizeText(listingDraft.title),
      city: normalizeText(listingDraft.city),
      district: normalizeText(listingDraft.district),
      location: normalizeText(listingDraft.location),
      latitude: Number.isFinite(Number(listingDraft.latitude)) ? Number(listingDraft.latitude) : undefined,
      longitude: Number.isFinite(Number(listingDraft.longitude)) ? Number(listingDraft.longitude) : undefined,
      fuelType: normalizeText(listingDraft.fuelType),
      transmission: normalizeText(listingDraft.transmission),
      bodyType: normalizeText(listingDraft.bodyType),
      color: normalizeText(listingDraft.color),
      plateOrigin: normalizeText(listingDraft.plateOrigin),
      plateNumber: normalizeText(listingDraft.plateNumber),
      phone: normalizeText(listingDraft.phone),
      includeExpertiz: normalizeBoolean(listingDraft.includeExpertiz, true),
    },
    pricingDescription: {
      price: normalizeText(listingDraft.price),
      description: normalizeText(listingDraft.description),
      content: '',
      damageRecord: normalizeText(listingDraft.damageRecord),
      paintInfo: normalizeText(listingDraft.paintInfo),
      changedParts: normalizeText(listingDraft.changedParts),
      accidentInfo: normalizeText(listingDraft.accidentInfo),
      extraEquipment: normalizeText(listingDraft.extraEquipment),
    },
    ownershipAuthorization: {
      isOwnerSameAsAccountHolder: normalizeBoolean(
        listingDraft.isOwnerSameAsAccountHolder,
        true,
      ),
      sellerRelationType: normalizeText(listingDraft.sellerRelationType) || 'owner',
      registrationOwnerFullNameDeclared: normalizeText(
        listingDraft.registrationOwnerFullNameDeclared || listingDraft.registrationOwnerName,
      ),
      authorizationDeclarationText: normalizeText(listingDraft.authorizationDeclarationText),
      authorizationStatus: normalizeText(listingDraft.authorizationStatus) || undefined,
      eidsStatus: normalizeText(listingDraft.eidsStatus) || undefined,
      registrationOwnerName: normalizeText(listingDraft.registrationOwnerName),
      registrationOwnerIdentityNumber: normalizeText(listingDraft.registrationOwnerIdentityNumber),
      registrationSerialNumber: normalizeText(listingDraft.registrationSerialNumber),
      registrationDocumentNumber: normalizeText(listingDraft.registrationDocumentNumber),
    },
    complianceResponsibility: {
      listingResponsibilityAccepted: true,
      safePaymentInformationAccepted: true,
      authorizationDeclarationAccepted: true,
    },
    billingListingFee: {
      paymentStatus: 'not_required',
      paymentRecordId: null,
      paymentReference: null,
    },
    previewPublish: {
      confirmed: true,
      requestedAction: 'publish',
    },
  };
}

function normalizeListingFlowPayload(payload = {}) {
  const legacyDraft = payload.listingDraft || {};
  const flow = payload.listingFlow || buildLegacyListingFlow(legacyDraft);

  return {
    vehicleInformation: {
      title: normalizeText(flow.vehicleInformation?.title || legacyDraft.title),
      city: normalizeText(flow.vehicleInformation?.city || legacyDraft.city),
      district: normalizeText(flow.vehicleInformation?.district || legacyDraft.district),
      location: normalizeText(flow.vehicleInformation?.location || legacyDraft.location),
      latitude:
        flow.vehicleInformation?.latitude ?? legacyDraft.latitude,
      longitude:
        flow.vehicleInformation?.longitude ?? legacyDraft.longitude,
      fuelType: normalizeText(flow.vehicleInformation?.fuelType || legacyDraft.fuelType),
      transmission: normalizeText(
        flow.vehicleInformation?.transmission || legacyDraft.transmission,
      ),
      bodyType: normalizeText(flow.vehicleInformation?.bodyType || legacyDraft.bodyType),
      color: normalizeText(flow.vehicleInformation?.color || legacyDraft.color),
      plateOrigin: normalizeText(flow.vehicleInformation?.plateOrigin || legacyDraft.plateOrigin),
      plateNumber: normalizeText(flow.vehicleInformation?.plateNumber || legacyDraft.plateNumber),
      phone: normalizeText(flow.vehicleInformation?.phone || legacyDraft.phone),
      includeExpertiz: normalizeBoolean(
        flow.vehicleInformation?.includeExpertiz ?? legacyDraft.includeExpertiz,
        true,
      ),
    },
    pricingDescription: {
      price: normalizeText(flow.pricingDescription?.price || legacyDraft.price),
      description: normalizeText(flow.pricingDescription?.description || legacyDraft.description),
      content: normalizeText(flow.pricingDescription?.content || payload.content),
      damageRecord: normalizeText(
        flow.pricingDescription?.damageRecord || legacyDraft.damageRecord,
      ),
      paintInfo: normalizeText(flow.pricingDescription?.paintInfo || legacyDraft.paintInfo),
      changedParts: normalizeText(
        flow.pricingDescription?.changedParts || legacyDraft.changedParts,
      ),
      accidentInfo: normalizeText(
        flow.pricingDescription?.accidentInfo || legacyDraft.accidentInfo,
      ),
      extraEquipment: normalizeText(
        flow.pricingDescription?.extraEquipment || legacyDraft.extraEquipment,
      ),
    },
    ownershipAuthorization: {
      isOwnerSameAsAccountHolder: normalizeBoolean(
        flow.ownershipAuthorization?.isOwnerSameAsAccountHolder ??
          legacyDraft.isOwnerSameAsAccountHolder,
        true,
      ),
      sellerRelationType:
        normalizeText(flow.ownershipAuthorization?.sellerRelationType || legacyDraft.sellerRelationType) ||
        'owner',
      registrationOwnerFullNameDeclared: normalizeText(
        flow.ownershipAuthorization?.registrationOwnerFullNameDeclared ||
          legacyDraft.registrationOwnerFullNameDeclared ||
          legacyDraft.registrationOwnerName,
      ),
      authorizationDeclarationText: normalizeText(
        flow.ownershipAuthorization?.authorizationDeclarationText ||
          legacyDraft.authorizationDeclarationText,
      ),
      authorizationStatus: normalizeText(
        flow.ownershipAuthorization?.authorizationStatus || legacyDraft.authorizationStatus,
      ),
      eidsStatus: normalizeText(flow.ownershipAuthorization?.eidsStatus || legacyDraft.eidsStatus),
      registrationOwnerName: normalizeText(
        flow.ownershipAuthorization?.registrationOwnerName || legacyDraft.registrationOwnerName,
      ),
      registrationOwnerIdentityNumber: normalizeText(
        flow.ownershipAuthorization?.registrationOwnerIdentityNumber ||
          legacyDraft.registrationOwnerIdentityNumber,
      ),
      registrationSerialNumber: normalizeText(
        flow.ownershipAuthorization?.registrationSerialNumber ||
          legacyDraft.registrationSerialNumber,
      ),
      registrationDocumentNumber: normalizeText(
        flow.ownershipAuthorization?.registrationDocumentNumber ||
          legacyDraft.registrationDocumentNumber,
      ),
    },
    complianceResponsibility: {
      listingResponsibilityAccepted: normalizeBoolean(
        flow.complianceResponsibility?.listingResponsibilityAccepted,
      ),
      safePaymentInformationAccepted: normalizeBoolean(
        flow.complianceResponsibility?.safePaymentInformationAccepted,
      ),
      authorizationDeclarationAccepted: normalizeBoolean(
        flow.complianceResponsibility?.authorizationDeclarationAccepted,
      ),
    },
    billingListingFee: {
      paymentStatus:
        normalizeText(flow.billingListingFee?.paymentStatus).toLowerCase() || 'not_required',
      paymentRecordId: normalizeText(flow.billingListingFee?.paymentRecordId) || null,
      paymentReference: normalizeText(flow.billingListingFee?.paymentReference) || null,
      featuredRequested: normalizeBoolean(flow.billingListingFee?.featuredRequested),
    },
    previewPublish: {
      confirmed: normalizeBoolean(flow.previewPublish?.confirmed),
      requestedAction:
        normalizeText(flow.previewPublish?.requestedAction).toLowerCase() || 'publish',
    },
  };
}

function validateVehicleInformationStep(flow, context = {}) {
  if (!context.hasVehicle) {
    const error = new Error('Ilan olusturmak icin once arac profilini tamamlamalisiniz.');
    error.statusCode = 400;
    throw error;
  }

  if (!flow.vehicleInformation.title) {
    const error = new Error('Arac bilgileri adiminda ilan basligi zorunludur.');
    error.statusCode = 400;
    throw error;
  }

  if (!flow.vehicleInformation.city || !flow.vehicleInformation.district) {
    const error = new Error('Arac bilgileri adiminda sehir ve ilce alanlari zorunludur.');
    error.statusCode = 400;
    throw error;
  }

  return true;
}

function validatePricingDescriptionStep(flow) {
  if (!flow.pricingDescription.price) {
    const error = new Error('Fiyat ve aciklama adiminda fiyat zorunludur.');
    error.statusCode = 400;
    throw error;
  }

  if (!flow.pricingDescription.description || flow.pricingDescription.description.length < 20) {
    const error = new Error('Fiyat ve aciklama adiminda en az 20 karakterlik aciklama girilmelidir.');
    error.statusCode = 400;
    throw error;
  }

  return true;
}

function validateOwnershipAuthorizationStep(flow) {
  const relationType = flow.ownershipAuthorization.sellerRelationType;
  if (!LISTING_SELLER_RELATION_OPTIONS.includes(relationType)) {
    const error = new Error('Satici ile ruhsat sahibi arasindaki iliski secilmelidir.');
    error.statusCode = 400;
    throw error;
  }

  if (!flow.ownershipAuthorization.registrationOwnerFullNameDeclared) {
    const error = new Error('Ruhsat sahibi adi soyadi beyan edilmelidir.');
    error.statusCode = 400;
    throw error;
  }

  if (relationType !== 'owner' && !flow.ownershipAuthorization.authorizationDeclarationText) {
    const error = new Error('Yetki beyan metni zorunludur.');
    error.statusCode = 400;
    throw error;
  }

  return true;
}

function validateComplianceResponsibilityStep(flow) {
  if (!flow.complianceResponsibility.listingResponsibilityAccepted) {
    const error = new Error('Ilan sorumlulugu onayi gereklidir.');
    error.statusCode = 400;
    throw error;
  }

  if (!flow.complianceResponsibility.safePaymentInformationAccepted) {
    const error = new Error('Guvenli odeme bilgilendirmesini onaylamalisiniz.');
    error.statusCode = 400;
    throw error;
  }

  if (
    flow.ownershipAuthorization.sellerRelationType !== 'owner' &&
    !flow.complianceResponsibility.authorizationDeclarationAccepted
  ) {
    const error = new Error('Yetki beyanini onaylamadan ilana devam edemezsiniz.');
    error.statusCode = 400;
    throw error;
  }

  return true;
}

function validateBillingStep(flow, options = {}) {
  const paymentRequired = Boolean(options.paymentRequired);
  const paymentStatus = normalizeText(flow.billingListingFee.paymentStatus).toLowerCase() || 'not_required';

  if (!LISTING_BILLING_STATUSES.includes(paymentStatus)) {
    const error = new Error('Ilan ucreti adiminda gecersiz odeme durumu gonderildi.');
    error.statusCode = 400;
    throw error;
  }

  return {
    paymentRequired,
    paymentResolved: !paymentRequired,
    paymentStatus: paymentRequired ? 'pending' : 'not_required',
    paymentRecordId: flow.billingListingFee.paymentRecordId || null,
    paymentReference: flow.billingListingFee.paymentReference || null,
    featuredRequested: normalizeBoolean(flow.billingListingFee.featuredRequested),
  };
}

function validatePreviewPublishStep(flow) {
  if (!flow.previewPublish.confirmed) {
    const error = new Error('Yayinlama oncesi son kontrol adimi onaylanmalidir.');
    error.statusCode = 400;
    throw error;
  }

  return true;
}

module.exports = {
  buildLegacyListingFlow,
  normalizeListingFlowPayload,
  parsePriceToNumber,
  validateBillingStep,
  validateComplianceResponsibilityStep,
  validateOwnershipAuthorizationStep,
  validatePreviewPublishStep,
  validatePricingDescriptionStep,
  validateVehicleInformationStep,
};
