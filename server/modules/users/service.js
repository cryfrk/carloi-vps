const { createPlaceholderContract } = require('../_scaffold');

module.exports = createPlaceholderContract('users', 'service', [
  'getUserSummary',
  'updateProfile',
  'recordConsent',
  'evaluateCommercialBehavior',
]);
