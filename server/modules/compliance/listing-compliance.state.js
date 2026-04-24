const LISTING_COMPLIANCE_STATES = ['draft', 'submitted', 'restricted', 'published', 'suspended', 'rejected'];

const LISTING_COMPLIANCE_TRANSITIONS = {
  draft: ['submitted'],
  submitted: ['restricted', 'published', 'rejected'],
  restricted: ['submitted', 'published', 'rejected'],
  published: ['suspended', 'restricted'],
  suspended: ['restricted', 'published'],
  rejected: ['draft', 'submitted'],
};

module.exports = {
  LISTING_COMPLIANCE_STATES,
  LISTING_COMPLIANCE_TRANSITIONS,
};
