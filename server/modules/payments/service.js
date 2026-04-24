const { createPlaceholderContract } = require('../_scaffold');

module.exports = createPlaceholderContract('payments', 'service', [
  'startSubscriptionPayment',
  'startListingFeePayment',
  'handleProviderCallback',
  'flagPaymentException',
]);
