const DOCUMENT_REVIEW_STATES = ['uploaded', 'pending_review', 'approved', 'rejected', 'expired'];

const DOCUMENT_REVIEW_TRANSITIONS = {
  uploaded: ['pending_review'],
  pending_review: ['approved', 'rejected', 'expired'],
  approved: ['expired'],
  rejected: ['pending_review'],
  expired: [],
};

module.exports = {
  DOCUMENT_REVIEW_STATES,
  DOCUMENT_REVIEW_TRANSITIONS,
};
