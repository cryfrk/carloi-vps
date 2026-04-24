const { createPlaceholderContract } = require('../_scaffold');

module.exports = createPlaceholderContract('payments', 'controller', [
  'subscribe',
  'payListing',
  'callback',
  'listPayments',
]);
