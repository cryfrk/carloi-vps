const { createPlaceholderContract } = require('../_scaffold');

module.exports = createPlaceholderContract('audit', 'controller', [
  'list',
  'exportUserBundle',
  'exportListingModerationHistory',
  'exportPaymentTrail',
]);
