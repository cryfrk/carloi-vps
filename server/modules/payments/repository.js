const { createPlaceholderContract } = require('../_scaffold');

module.exports = createPlaceholderContract('payments', 'repository', [
  'createPaymentRecord',
  'listPaymentRecords',
  'getPaymentByReference',
  'recordProviderCallback',
]);
