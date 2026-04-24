const LISTING_CREATE_FLOW_STATES = Object.freeze([
  'draft',
  'vehicle_info_completed',
  'pricing_completed',
  'ownership_completed',
  'compliance_completed',
  'payment_pending',
  'submitted',
  'published',
  'restricted',
  'rejected',
  'suspended',
]);

const LISTING_INTERMEDIATE_FLOW_STATES = Object.freeze([
  'draft',
  'vehicle_info_completed',
  'pricing_completed',
  'ownership_completed',
  'compliance_completed',
  'payment_pending',
  'submitted',
]);

const LISTING_BILLING_STATUSES = Object.freeze([
  'not_required',
  'pending',
  'paid',
  'failed',
  'waived',
]);

const LISTING_RISK_LEVELS = Object.freeze(['low', 'medium', 'high']);

const LISTING_PUBLISH_DECISIONS = Object.freeze({
  low: 'published',
  medium: 'submitted',
  high: 'restricted',
});

const LISTING_STEP_KEYS = Object.freeze([
  'vehicle_information',
  'pricing_description',
  'ownership_authorization',
  'compliance_responsibility',
  'billing_listing_fee',
  'preview_publish',
]);

const LISTING_SELLER_RELATION_OPTIONS = Object.freeze([
  'owner',
  'spouse',
  'relative_second_degree',
  'authorized_business',
  'other_authorized',
]);

module.exports = {
  LISTING_BILLING_STATUSES,
  LISTING_CREATE_FLOW_STATES,
  LISTING_INTERMEDIATE_FLOW_STATES,
  LISTING_PUBLISH_DECISIONS,
  LISTING_RISK_LEVELS,
  LISTING_SELLER_RELATION_OPTIONS,
  LISTING_STEP_KEYS,
};
