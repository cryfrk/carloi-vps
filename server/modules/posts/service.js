const { createPlaceholderContract } = require('../_scaffold');

module.exports = createPlaceholderContract('posts', 'service', [
  'publishPost',
  'removePost',
  'reviewReportedPost',
]);
