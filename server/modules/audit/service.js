const { createPlaceholderContract } = require('../_scaffold');

module.exports = createPlaceholderContract('audit', 'service', [
  'appendAuditLog',
  'listAuditLogs',
  'exportUserAuditBundle',
  'exportPaymentTrail',
]);
