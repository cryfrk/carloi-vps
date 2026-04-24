const { createPlaceholderContract } = require('../_scaffold');

module.exports = createPlaceholderContract('auth', 'service', [
  'registerUser',
  'verifyEmail',
  'requestPasswordReset',
  'resetPassword',
  'createSession',
]);
