const { createPlaceholderContract } = require('../_scaffold');

module.exports = createPlaceholderContract('compliance', 'controller', [
  'saveListingCompliance',
  'requestManualReview',
  'ackSafePayment',
]);
