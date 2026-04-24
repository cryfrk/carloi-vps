const { createHash } = require('node:crypto');

const GARANTI_DEFAULT_API_VERSION = 'v0.01';
const GARANTI_DEFAULT_LANGUAGE = 'tr';
const GARANTI_DEFAULT_TXN_TYPE = 'sales';
const GARANTI_DEFAULT_CURRENCY_CODE = '949';

const MD_STATUS_RULES = {
  '3D': ['1'],
  '3D_PAY': ['1', '2', '3', '4', '5'],
  '3D_HALF': ['1', '2', '3', '4'],
  '3D_FULL': ['1'],
  '3D_OOS_PAY': ['1', '2', '3', '4', '5'],
  '3D_OOS_HALF': ['1', '2', '3', '4'],
  '3D_OOS_FULL': ['1'],
  'OOS_PAY': [],
};

function normalizeText(value) {
  return String(value ?? '').trim();
}

function sha1Upper(value) {
  return createHash('sha1').update(String(value ?? ''), 'utf8').digest('hex').toUpperCase();
}

function sha512Upper(value) {
  return createHash('sha512').update(String(value ?? ''), 'utf8').digest('hex').toUpperCase();
}

function computeLegacyBase64Sha1(value) {
  const sha1Hex = createHash('sha1').update(String(value ?? ''), 'utf8').digest('hex');
  return Buffer.from(sha1Hex, 'hex').toString('base64');
}

function padTerminalId(terminalId) {
  const digits = normalizeText(terminalId).replace(/\D/g, '');
  return digits.padStart(9, '0');
}

function normalizeGarantiCurrencyCode(value) {
  const raw = normalizeText(value).toUpperCase();
  if (!raw) {
    return GARANTI_DEFAULT_CURRENCY_CODE;
  }

  if (/^\d+$/.test(raw)) {
    return raw;
  }

  if (raw === 'TRY' || raw === 'TL') {
    return GARANTI_DEFAULT_CURRENCY_CODE;
  }

  return raw;
}

function normalizeGarantiTxnAmount(value, options = {}) {
  const raw = normalizeText(value)
    .replace(/\s+/g, '')
    .replace(/[A-Za-z]/g, '')
    .replace(/TL/gi, '');

  if (!raw) {
    return '';
  }

  const lastDot = raw.lastIndexOf('.');
  const lastComma = raw.lastIndexOf(',');
  const decimalIndex = Math.max(lastDot, lastComma);

  if (decimalIndex === -1) {
    const digits = raw.replace(/\D/g, '');
    if (!digits) {
      return '';
    }

    if (options.alreadyMinor === true) {
      return digits.replace(/^0+(?=\d)/, '') || '0';
    }

    return String(Number(digits) * 100);
  }

  const integerPart = raw.slice(0, decimalIndex).replace(/\D/g, '') || '0';
  const decimalPart = raw
    .slice(decimalIndex + 1)
    .replace(/\D/g, '')
    .padEnd(2, '0')
    .slice(0, 2);

  return `${integerPart}${decimalPart}`.replace(/^0+(?=\d)/, '') || '0';
}

function computeHashedPassword(provisionPassword, terminalId) {
  return sha1Upper(`${normalizeText(provisionPassword)}${padTerminalId(terminalId)}`);
}

function computeSecure3DHash({
  terminalId,
  orderId,
  amount,
  successUrl,
  errorUrl,
  txType,
  installmentCount,
  storeKey,
  provisionPassword,
  currencyCode,
}) {
  const hashedPassword = computeHashedPassword(provisionPassword, terminalId);
  const pieces = [
    normalizeText(terminalId),
    normalizeText(orderId),
    normalizeText(amount),
    normalizeGarantiCurrencyCode(currencyCode),
    normalizeText(successUrl),
    normalizeText(errorUrl),
    normalizeText(txType || GARANTI_DEFAULT_TXN_TYPE),
    normalizeText(installmentCount),
    normalizeText(storeKey),
    hashedPassword,
  ];

  return sha512Upper(pieces.join(''));
}

function getAllowedMdStatuses(secure3dModel) {
  const model = normalizeText(secure3dModel).toUpperCase();
  return MD_STATUS_RULES[model] || [];
}

function buildGarantiFormFields(config, order, payload, options = {}) {
  const paymentReference = normalizeText(order.payment_reference);
  const txnAmount = normalizeGarantiTxnAmount(order.amount);
  const successUrl = normalizeText(options.successUrl);
  const errorUrl = normalizeText(options.errorUrl);
  const currencyCode = normalizeGarantiCurrencyCode(payload.currency || GARANTI_DEFAULT_CURRENCY_CODE);
  const txType = normalizeText(payload.txType || options.txType || GARANTI_DEFAULT_TXN_TYPE).toLowerCase();
  const installmentCount = normalizeText(payload.installmentCount || options.installmentCount);
  const companyName =
    normalizeText(payload.metadata?.companyName) ||
    normalizeText(config.companyName) ||
    'Carloi';

  return {
    mode: normalizeText(config.mode),
    apiversion: normalizeText(config.apiVersion || GARANTI_DEFAULT_API_VERSION),
    secure3dsecuritylevel: normalizeText(config.secure3dModel),
    terminalprovuserid: normalizeText(config.terminalProvUserId),
    terminaluserid: normalizeText(config.terminalUserId || config.terminalProvUserId),
    terminalid: normalizeText(config.terminalId),
    terminalmerchantid: normalizeText(config.merchantId),
    orderid: paymentReference,
    customeremailaddress: normalizeText(payload.buyer?.email || payload.metadata?.buyerEmail),
    customeripaddress: normalizeText(payload.customerIpAddress || payload.metadata?.customerIpAddress),
    txntype: txType,
    txnamount: txnAmount,
    txncurrencycode: currencyCode,
    txninstallmentcount: installmentCount,
    companyname: companyName,
    lang: normalizeText(config.language || GARANTI_DEFAULT_LANGUAGE),
    txntimestamp: String(Date.now()),
    successurl: successUrl,
    errorurl: errorUrl,
    secure3dhash: computeSecure3DHash({
      terminalId: config.terminalId,
      orderId: paymentReference,
      amount: txnAmount,
      successUrl,
      errorUrl,
      txType,
      installmentCount,
      storeKey: config.storeKey,
      provisionPassword: config.provisionPassword,
      currencyCode,
    }),
  };
}

function getPayloadValue(payload = {}, key) {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  const direct = payload[key];
  if (direct !== undefined && direct !== null) {
    return String(direct);
  }

  const lowerKey = String(key).toLowerCase();
  const matchedKey = Object.keys(payload).find((candidate) => String(candidate).toLowerCase() === lowerKey);
  if (!matchedKey) {
    return '';
  }

  return String(payload[matchedKey] ?? '');
}

function normalizeGarantiCallbackPayload(payload = {}) {
  return {
    orderId:
      normalizeText(getPayloadValue(payload, 'orderid')) ||
      normalizeText(getPayloadValue(payload, 'oid')) ||
      normalizeText(getPayloadValue(payload, 'transid')),
    amount:
      normalizeText(getPayloadValue(payload, 'txnamount')) ||
      normalizeText(getPayloadValue(payload, 'amount')),
    currencyCode:
      normalizeText(getPayloadValue(payload, 'txncurrencycode')) ||
      normalizeText(getPayloadValue(payload, 'currencycode')),
    procReturnCode:
      normalizeText(getPayloadValue(payload, 'procreturncode')) ||
      normalizeText(getPayloadValue(payload, 'txnresult')),
    mdStatus: normalizeText(getPayloadValue(payload, 'mdstatus')),
    clientId:
      normalizeText(getPayloadValue(payload, 'clientid')) ||
      normalizeText(getPayloadValue(payload, 'terminalid')),
    response: normalizeText(getPayloadValue(payload, 'response')),
    errorMessage:
      normalizeText(getPayloadValue(payload, 'errmsg')) ||
      normalizeText(getPayloadValue(payload, 'mderrormessage')),
    authCode: normalizeText(getPayloadValue(payload, 'authcode')),
    hostRefNum: normalizeText(getPayloadValue(payload, 'hostrefnum')),
    hash: normalizeText(getPayloadValue(payload, 'hash')) || normalizeText(getPayloadValue(payload, 'hashdata')),
    hashParams: normalizeText(getPayloadValue(payload, 'hashparams')),
    hashParamsVal: normalizeText(getPayloadValue(payload, 'hashparamsval')),
    transactionType: normalizeText(getPayloadValue(payload, 'txntype')),
  };
}

function buildHashParamsValue(payload = {}, hashParams = '') {
  const params = normalizeText(hashParams)
    .split(':')
    .map((item) => normalizeText(item))
    .filter(Boolean);

  return params.map((param) => getPayloadValue(payload, param)).join('');
}

function verifyGarantiResponseHash(payload = {}, storeKey) {
  const callbackPayload = normalizeGarantiCallbackPayload(payload);
  const responseHash = callbackPayload.hash;
  const normalizedStoreKey = normalizeText(storeKey);

  if (!responseHash || !normalizedStoreKey) {
    return {
      isValid: false,
      algorithm: null,
      expectedHash: '',
      hashInput: callbackPayload.hashParamsVal || '',
    };
  }

  const hashInput = callbackPayload.hashParamsVal || buildHashParamsValue(payload, callbackPayload.hashParams);
  if (!hashInput) {
    return {
      isValid: false,
      algorithm: null,
      expectedHash: '',
      hashInput: '',
    };
  }

  const modernExpected = sha512Upper(`${hashInput}${normalizedStoreKey}`);
  if (responseHash.toUpperCase() === modernExpected) {
    return {
      isValid: true,
      algorithm: 'sha512_hex',
      expectedHash: modernExpected,
      hashInput,
    };
  }

  const legacyExpected = computeLegacyBase64Sha1(`${hashInput}${normalizedStoreKey}`);
  if (responseHash === legacyExpected) {
    return {
      isValid: true,
      algorithm: 'sha1_base64_legacy',
      expectedHash: legacyExpected,
      hashInput,
    };
  }

  return {
    isValid: false,
    algorithm: 'sha512_hex',
    expectedHash: modernExpected,
    legacyExpectedHash: legacyExpected,
    hashInput,
  };
}

function validateGarantiCallback({
  payload = {},
  paymentReference,
  expectedAmount,
  expectedCurrency,
  expectedTerminalId,
  secure3dModel,
  storeKey,
}) {
  const callbackPayload = normalizeGarantiCallbackPayload(payload);
  const expectedMinorAmount = normalizeGarantiTxnAmount(expectedAmount);
  const expectedCurrencyCode = normalizeGarantiCurrencyCode(expectedCurrency);
  const hashValidation = verifyGarantiResponseHash(payload, storeKey);
  const mdStatus = callbackPayload.mdStatus;
  const allowedMdStatuses = getAllowedMdStatuses(secure3dModel);
  const mdStatusAccepted =
    !allowedMdStatuses.length || (mdStatus && allowedMdStatuses.includes(mdStatus));
  const procReturnCodeApproved = callbackPayload.procReturnCode === '00';
  const orderMatches = callbackPayload.orderId === normalizeText(paymentReference);
  const amountMatches =
    normalizeGarantiTxnAmount(callbackPayload.amount, { alreadyMinor: true }) === expectedMinorAmount;
  const currencyMatches =
    !callbackPayload.currencyCode ||
    normalizeGarantiCurrencyCode(callbackPayload.currencyCode) === expectedCurrencyCode;
  const terminalMatches =
    !callbackPayload.clientId || normalizeText(callbackPayload.clientId) === normalizeText(expectedTerminalId);

  const errors = [];
  if (!hashValidation.isValid) {
    errors.push('hash_invalid');
  }
  if (!orderMatches) {
    errors.push('order_mismatch');
  }
  if (!amountMatches) {
    errors.push('amount_mismatch');
  }
  if (!currencyMatches) {
    errors.push('currency_mismatch');
  }
  if (!terminalMatches) {
    errors.push('terminal_mismatch');
  }
  if (!mdStatusAccepted) {
    errors.push('md_status_invalid');
  }
  if (!procReturnCodeApproved) {
    errors.push('proc_return_code_invalid');
  }

  const manualReviewRequired = errors.some((code) =>
    ['hash_invalid', 'order_mismatch', 'amount_mismatch', 'currency_mismatch', 'terminal_mismatch'].includes(code),
  );

  return {
    payload: callbackPayload,
    validation: hashValidation.isValid,
    hashVerified: hashValidation.isValid,
    hashAlgorithm: hashValidation.algorithm,
    hashInput: hashValidation.hashInput,
    mdStatusAccepted,
    allowedMdStatuses,
    procReturnCodeApproved,
    orderMatches,
    amountMatches,
    currencyMatches,
    terminalMatches,
    manualReviewRequired,
    approved: !errors.length,
    errors,
  };
}

module.exports = {
  GARANTI_DEFAULT_API_VERSION,
  GARANTI_DEFAULT_CURRENCY_CODE,
  GARANTI_DEFAULT_LANGUAGE,
  GARANTI_DEFAULT_TXN_TYPE,
  buildGarantiFormFields,
  computeHashedPassword,
  computeSecure3DHash,
  getAllowedMdStatuses,
  normalizeGarantiCallbackPayload,
  normalizeGarantiCurrencyCode,
  normalizeGarantiTxnAmount,
  normalizeText,
  padTerminalId,
  validateGarantiCallback,
  verifyGarantiResponseHash,
};
