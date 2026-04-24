const { createPlaceholderContract } = require('../_scaffold');

module.exports = createPlaceholderContract('admin', 'controller', [
  'dashboard',
  'users',
  'listings',
  'commercialReviews',
  'payments',
  'analytics',
  'settings',
]);
