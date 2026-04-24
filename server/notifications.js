const { config } = require('./config');
const { sendEmail, sendResetPasswordEmail, sendVerificationEmail } = require('./mailer');
const { sendBrevoSms } = require('./sms');

function maskDestination(channel, destination) {
  const value = String(destination || '').trim();
  if (channel === 'phone') {
    const visible = value.slice(-2);
    return `${'*'.repeat(Math.max(0, value.length - 2))}${visible}`;
  }

  const [name, domain] = value.split('@');
  if (!name || !domain) {
    return value;
  }

  const visible = name.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(0, name.length - 2))}@${domain}`;
}

function buildAuthLink(pathname, params) {
  const base = String(config.appBaseUrl || config.shareBaseUrl || config.publicBaseUrl || '').replace(
    /\/+$/g,
    '',
  );
  const url = new URL(`${base}${pathname.startsWith('/') ? pathname : `/${pathname}`}`);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

async function sendVerificationCode({ channel, destination, code }) {
  if (channel === 'email') {
    try {
      const verificationUrl = buildAuthLink('/verify-email', {
        email: destination,
        code,
      });
      await sendVerificationEmail(destination, verificationUrl);
    } catch (cause) {
      const error = new Error(
        'Dogrulama e-postasi su anda gonderilemedi. Lutfen daha sonra tekrar deneyin.',
      );
      error.statusCode = 503;
      error.cause = cause;
      throw error;
    }

    return {
      maskedDestination: maskDestination(channel, destination),
    };
  }

  try {
    const delivery = await sendBrevoSms({
      recipient: destination,
      content: `CARLOI: Dogrulama kodunuz: ${code}`,
      tag: 'auth_verification',
    });
    return {
      maskedDestination: delivery.maskedDestination || maskDestination(channel, destination),
    };
  } catch (cause) {
    const error = new Error(
      'SMS dogrulama kodu gonderilemedi. Brevo SMS ayarlarini, gonderici bilgisini ve telefon formatini kontrol edin.',
    );
    error.statusCode = 502;
    error.cause = cause;
    error.smsDisabled = Boolean(cause?.smsDisabled);
    error.smsNotConfigured = Boolean(cause?.smsNotConfigured);
    throw error;
  }
}

async function sendPasswordResetMail({ destination, code }, options = {}) {
  try {
    const resetUrl = buildAuthLink('/reset-password', {
      email: destination,
      code,
    });
    const delivery = await sendResetPasswordEmail(destination, resetUrl, options);
    return {
      maskedDestination: maskDestination('email', destination),
      skipped: Boolean(delivery?.skipped),
      emailDisabled: Boolean(delivery?.emailDisabled),
      emailNotConfigured: Boolean(delivery?.emailNotConfigured),
    };
  } catch (cause) {
    const error = new Error(
      'Sifre sifirlama maili gonderilemedi. SMTP kullanici adi, sifre, port ve gonderen adresini kontrol edin.',
    );
    error.statusCode = 502;
    error.cause = cause;
    error.emailDisabled = Boolean(cause?.emailDisabled);
    error.emailNotConfigured = Boolean(cause?.emailNotConfigured);
    throw error;
  }
}

async function sendVerificationTokenMail({ destination, token }, options = {}) {
  try {
    const verificationUrl = buildAuthLink('/verify-email', {
      token,
    });
    const delivery = await sendVerificationEmail(destination, verificationUrl, options);
    return {
      maskedDestination: maskDestination('email', destination),
      skipped: Boolean(delivery?.skipped),
      emailDisabled: Boolean(delivery?.emailDisabled),
      emailNotConfigured: Boolean(delivery?.emailNotConfigured),
    };
  } catch (cause) {
    const error = new Error(
      'Dogrulama e-postasi su anda gonderilemedi. Lutfen daha sonra tekrar deneyin.',
    );
    error.statusCode = 503;
    error.cause = cause;
    error.emailDisabled = Boolean(cause?.emailDisabled);
    error.emailNotConfigured = Boolean(cause?.emailNotConfigured);
    throw error;
  }
}

async function sendPasswordResetTokenMail({ destination, token }, options = {}) {
  try {
    const resetUrl = buildAuthLink('/reset-password', {
      token,
    });
    const delivery = await sendResetPasswordEmail(destination, resetUrl, options);
    return {
      maskedDestination: maskDestination('email', destination),
      skipped: Boolean(delivery?.skipped),
      emailDisabled: Boolean(delivery?.emailDisabled),
      emailNotConfigured: Boolean(delivery?.emailNotConfigured),
    };
  } catch (cause) {
    const error = new Error(
      'Sifre sifirlama e-postasi su anda gonderilemedi. Lutfen daha sonra tekrar deneyin.',
    );
    error.statusCode = 502;
    error.cause = cause;
    error.emailDisabled = Boolean(cause?.emailDisabled);
    error.emailNotConfigured = Boolean(cause?.emailNotConfigured);
    throw error;
  }
}

async function sendTemplatedMail({ to, subject, html, text, attachments }) {
  try {
    await sendEmail(to, subject, html, text, { attachments });
  } catch (cause) {
    const error = new Error(
      'E-posta gonderilemedi. SMTP baglanti bilgilerini ve gonderen adresini kontrol edin.',
    );
    error.statusCode = 502;
    error.cause = cause;
    throw error;
  }
}

module.exports = {
  buildAuthLink,
  maskDestination,
  sendPasswordResetMail,
  sendPasswordResetTokenMail,
  sendTemplatedMail,
  sendVerificationCode,
  sendVerificationTokenMail,
};
