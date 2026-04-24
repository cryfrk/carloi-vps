const { createPlaceholderContract } = require('../_scaffold');

module.exports = createPlaceholderContract('messages', 'repository', [
  'listConversationMetadata',
  'getConversationById',
  'appendMessageAudit',
  'prepareEvidenceExport',
]);
