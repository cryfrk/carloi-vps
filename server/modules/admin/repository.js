const { createPlaceholderContract } = require('../_scaffold');

module.exports = createPlaceholderContract('admin', 'repository', [
  'getDashboardAggregates',
  'listUsers',
  'listListings',
  'listCommercialReviews',
  'listPayments',
]);
