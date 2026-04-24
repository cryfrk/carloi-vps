const { createPlaceholderContract } = require('../_scaffold');

module.exports = createPlaceholderContract('risk', 'controller', [
  'list',
  'review',
  'dismiss',
  'confirm',
]);
