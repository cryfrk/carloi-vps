const { createPlaceholderContract } = require('../_scaffold');

module.exports = createPlaceholderContract('posts', 'repository', [
  'listPosts',
  'getPostById',
  'moderatePost',
  'createReport',
]);
