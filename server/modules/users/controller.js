const { createPlaceholderContract } = require('../_scaffold');

module.exports = createPlaceholderContract('users', 'controller', [
  'getMe',
  'updateMe',
  'getUserByHandle',
  'listUserAdminRoles',
]);
