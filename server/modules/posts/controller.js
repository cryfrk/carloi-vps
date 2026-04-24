const { createPlaceholderContract } = require('../_scaffold');

module.exports = createPlaceholderContract('posts', 'controller', [
  'list',
  'detail',
  'moderate',
  'report',
]);
