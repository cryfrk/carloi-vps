const CONSENT_TYPES = Object.freeze({
  TERMS_OF_SERVICE: 'terms_of_service',
  PRIVACY_POLICY: 'privacy_policy',
  CONTENT_RESPONSIBILITY: 'content_responsibility',
  LISTING_RESPONSIBILITY: 'listing_responsibility',
  COMMERCIAL_DECLARATION: 'commercial_declaration',
  SAFE_PAYMENT_INFORMATION: 'safe_payment_information',
  SUBSCRIPTION_TERMS: 'subscription_terms',
  MARKETING_OPTIONAL: 'marketing_optional',
});

const CONSENT_VERSION_MAP = Object.freeze({
  [CONSENT_TYPES.TERMS_OF_SERVICE]: '2026-04',
  [CONSENT_TYPES.PRIVACY_POLICY]: '2026-04',
  [CONSENT_TYPES.CONTENT_RESPONSIBILITY]: '2026-04',
  [CONSENT_TYPES.LISTING_RESPONSIBILITY]: '2026-04',
  [CONSENT_TYPES.COMMERCIAL_DECLARATION]: '2026-04',
  [CONSENT_TYPES.SAFE_PAYMENT_INFORMATION]: '2026-04',
  [CONSENT_TYPES.SUBSCRIPTION_TERMS]: '2026-04',
  [CONSENT_TYPES.MARKETING_OPTIONAL]: '2026-04',
});

const CONSENT_REQUIREMENTS = Object.freeze({
  signup: Object.freeze({
    sourceScreen: 'signup',
    required: Object.freeze([
      CONSENT_TYPES.TERMS_OF_SERVICE,
      CONSENT_TYPES.PRIVACY_POLICY,
      CONSENT_TYPES.CONTENT_RESPONSIBILITY,
    ]),
    optional: Object.freeze([CONSENT_TYPES.MARKETING_OPTIONAL]),
  }),
  listingCreation: Object.freeze({
    sourceScreen: 'listing_creation',
    required: Object.freeze([
      CONSENT_TYPES.LISTING_RESPONSIBILITY,
      CONSENT_TYPES.SAFE_PAYMENT_INFORMATION,
    ]),
  }),
  commercialOnboarding: Object.freeze({
    sourceScreen: 'commercial_onboarding',
    required: Object.freeze([CONSENT_TYPES.COMMERCIAL_DECLARATION]),
  }),
  safePayment: Object.freeze({
    sourceScreen: 'safe_payment_guidance',
    required: Object.freeze([CONSENT_TYPES.SAFE_PAYMENT_INFORMATION]),
  }),
  subscription: Object.freeze({
    sourceScreen: 'subscription_terms',
    required: Object.freeze([CONSENT_TYPES.SUBSCRIPTION_TERMS]),
  }),
});

const LISTING_RELATION_TYPES = Object.freeze([
  'owner',
  'spouse',
  'relative_second_degree',
  'authorized_business',
  'other_authorized',
]);

function isKnownConsentType(type) {
  return Object.values(CONSENT_TYPES).includes(type);
}

function getConsentVersion(type) {
  return CONSENT_VERSION_MAP[type] || '2026-04';
}

module.exports = {
  CONSENT_REQUIREMENTS,
  CONSENT_TYPES,
  CONSENT_VERSION_MAP,
  LISTING_RELATION_TYPES,
  getConsentVersion,
  isKnownConsentType,
};
