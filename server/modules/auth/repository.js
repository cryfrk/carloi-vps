const { createPlaceholderContract } = require('../_scaffold');

module.exports = createPlaceholderContract('auth', 'repository', [
  'findUserByIdentifier',
  'createPendingUser',
  'storeVerificationToken',
  'storePasswordResetToken',
  'consumePasswordResetToken',
]);
