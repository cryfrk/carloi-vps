const { createPlaceholderContract } = require('../_scaffold');

module.exports = createPlaceholderContract('auth', 'controller', [
  'register',
  'verifyEmail',
  'forgotPassword',
  'resetPassword',
  'login',
  'logout',
]);
