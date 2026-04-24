const COMMERCIAL_PROFILE_STATES = ['draft', 'submitted', 'pending_review', 'approved', 'rejected', 'suspended', 'revoked'];

const COMMERCIAL_PROFILE_TRANSITIONS = {
  draft: ['submitted'],
  submitted: ['pending_review'],
  pending_review: ['approved', 'rejected', 'suspended'],
  approved: ['suspended', 'revoked'],
  rejected: ['submitted', 'pending_review'],
  suspended: ['approved', 'revoked'],
  revoked: [],
};

module.exports = {
  COMMERCIAL_PROFILE_STATES,
  COMMERCIAL_PROFILE_TRANSITIONS,
};
