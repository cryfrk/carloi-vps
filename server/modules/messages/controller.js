const { createPlaceholderContract } = require('../_scaffold');

module.exports = createPlaceholderContract('messages', 'controller', [
  'list',
  'detail',
  'exportEvidence',
]);
