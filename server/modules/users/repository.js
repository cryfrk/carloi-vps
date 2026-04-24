const { createPlaceholderContract } = require('../_scaffold');

module.exports = createPlaceholderContract('users', 'repository', [
  'getUserProfile',
  'updateUserProfile',
  'updateCommercialIndicators',
  'listUserConsents',
  'assignAdminRole',
]);
