const { config } = require('./config');
const { logError, logInfo, logWarn } = require('./logger');

function normalizePhone(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }

  const compact = raw.replace(/[^\d+]/g, '');
  if (!compact) {
    return '';
  }

  if (compact.startsWith('+')) {
    const digits = compact.slice(1).replace(/\D/g, '');
    return digits ? `+${digits}` : '';
  }

  const digits = compact.replace(/\D/g, '');
  if (!digits) {
    return '';
  }

  if (digits.startsWith('00') && digits.length > 4) {
    return `+${digits.slice(2)}`;
  }

  if (digits.startsWith('90') && digits.length === 12) {
    return `+${digits}`;
  }

  if (digits.startsWith('0') && digits.length === 11) {
    return `+90${digits.slice(1)}`;
  }

  if (digits.length === 10) {
    return `+90${digits}`;
  }

  return digits.startsWith('+') ? digits : `+${digits}`;
}

function maskPhone(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return '';
  }

  return `${'*'.repeat(Math.max(0, normalized.length - 2))}${normalized.slice(-2)}`;
}

function createSmsError(message, statusCode = 503, cause) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (cause) {
    error.cause = cause;
  }
  return error;
}

function getSmsServiceState() {
  if (!config.smsEnabled) {
    return {
      enabled: false,
      configured: Boolean(config.brevoApiKey),
      available: false,
      reason: 'disabled',
    };
  }

  if (!config.brevoApiKey) {
    return {
      enabled: true,
      configured: false,
      available: false,
      reason: 'not_configured',
    };
  }

  return {
    enabled: true,
    configured: true,
    available: true,
    reason: 'ready',
  };
}

function ensureSmsReady() {
  const state = getSmsServiceState();
  if (state.available) {
    return;
  }

  const error = createSmsError(
    state.reason === 'disabled'
      ? 'SMS dogrulama servisi su anda devre disi.'
      : 'SMS servisi yapilandirilmadi. BREVO_API_KEY ve SMS_ENABLED ayarlarini kontrol edin.',
  );
  error.smsDisabled = state.reason === 'disabled';
  error.smsNotConfigured = state.reason === 'not_configured';
  throw error;
}

async function sendBrevoSms({ recipient, content, tag = 'auth_verification' }) {
  ensureSmsReady();

  const normalizedRecipient = normalizePhone(recipient);
  if (!normalizedRecipient) {
    const error = createSmsError('Gecerli bir telefon numarasi girin.', 400);
    error.smsInvalidRecipient = true;
    throw error;
  }

  const payload = {
    sender: config.brevoSmsSender,
    recipient: normalizedRecipient.replace(/^\+/, ''),
    content: String(content || '').trim(),
    type: 'transactional',
    tag,
  };

  let response;
  try {
    response = await fetch(config.brevoSmsApiUrl, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': config.brevoApiKey,
      },
      body: JSON.stringify(payload),
    });
  } catch (cause) {
    logError('sms.brevo.request_failed', {
      recipient: maskPhone(normalizedRecipient),
      errorMessage: cause?.message || 'unknown',
    });
    throw createSmsError('SMS servisine ulasilamadi. Lutfen daha sonra tekrar deneyin.', 503, cause);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    logError('sms.brevo.response_failed', {
      recipient: maskPhone(normalizedRecipient),
      status: response.status,
      responseBody: typeof data === 'object' ? JSON.stringify(data) : String(data || ''),
    });
    const error = createSmsError('SMS dogrulama kodu gonderilemedi. Lutfen daha sonra tekrar deneyin.', 502);
    error.smsStatus = response.status;
    throw error;
  }

  logInfo('sms.brevo.sent', {
    recipient: maskPhone(normalizedRecipient),
    sender: config.brevoSmsSender,
    tag,
    messageId: data?.messageId || '',
  });

  return {
    maskedDestination: maskPhone(normalizedRecipient),
    recipient: normalizedRecipient,
    messageId: data?.messageId || '',
  };
}

function logSmsDisabledWarning() {
  const state = getSmsServiceState();
  if (state.reason === 'disabled') {
    logWarn('sms.disabled', { reason: 'SMS_ENABLED=false' });
  } else if (state.reason === 'not_configured') {
    logWarn('sms.not_configured', { reason: 'BREVO_API_KEY missing' });
  }
}

module.exports = {
  getSmsServiceState,
  logSmsDisabledWarning,
  maskPhone,
  normalizePhone,
  sendBrevoSms,
};
