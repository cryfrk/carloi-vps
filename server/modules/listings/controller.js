const { createPlaceholderContract } = require('../_scaffold');

module.exports = createPlaceholderContract('listings', 'controller', [
  'create',
  'update',
  'requestComplianceReview',
  'suspend',
  'restore',
]);
