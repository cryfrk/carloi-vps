const { createPlaceholderContract } = require('../_scaffold');

module.exports = createPlaceholderContract('messages', 'service', [
  'listConversations',
  'getConversationEvidence',
  'exportConversationBundle',
]);
