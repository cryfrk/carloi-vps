const {
  addCommercialAdminNote,
  applyCommercialAdminDecision,
  getCommercialReviewProfileDetail,
  getCommercialStatusSummary,
  listPendingCommercialReviews,
  queueCommercialDocument,
  resubmitCommercialOnboarding,
  saveCommercialProfile,
  submitCommercialOnboarding,
} = require('./commercial.service');

module.exports = {
  addAdminNote: addCommercialAdminNote,
  approveReview: (profileId, options) =>
    applyCommercialAdminDecision(profileId, 'approve', options),
  createProfile: saveCommercialProfile,
  getReviewDetail: getCommercialReviewProfileDetail,
  getStatus: getCommercialStatusSummary,
  listReviews: listPendingCommercialReviews,
  rejectReview: (profileId, options) =>
    applyCommercialAdminDecision(profileId, 'reject', options),
  resubmitForReview: resubmitCommercialOnboarding,
  revokeReview: (profileId, options) =>
    applyCommercialAdminDecision(profileId, 'revoke', options),
  submitForReview: submitCommercialOnboarding,
  suspendReview: (profileId, options) =>
    applyCommercialAdminDecision(profileId, 'suspend', options),
  updateProfile: saveCommercialProfile,
  uploadDocument: queueCommercialDocument,
};
