const path = require('node:path');

const nodemailer = require('nodemailer');

const { config } = require('./config');
const { logError, logInfo, logWarn } = require('./logger');

const MAILER_PREFIX = '[mailer]';
const transportHost = process.env.SMTP_HOST || config.smtpHost;
const transportPort = Number(process.env.SMTP_PORT || config.smtpPort || 587);
const transportSecure = config.smtpSecure || transportPort === 465;

function createMailerError(message, statusCode = 503, cause) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (cause) {
    error.cause = cause;
  }
  return error;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function isAbsoluteFilePath(value) {
  return path.isAbsolute(String(value || '').trim());
}

function buildTransportTls() {
  const tls = {};
  const allowRelaxedTls =
    config.smtpTlsRejectUnauthorized === false &&
    (config.nodeEnv !== 'production' || config.smtpEnableLegacyTlsInProduction);

  if (allowRelaxedTls) {
    tls.rejectUnauthorized = false;
    tls.minVersion = 'TLSv1';
  }

  const servername = config.smtpTlsServername || (!/^\d+\.\d+\.\d+\.\d+$/.test(transportHost) ? transportHost : '');
  if (servername) {
    tls.servername = servername;
  }

  return tls;
}

const transportTls = buildTransportTls();

if (transportTls.rejectUnauthorized === false) {
  if (!String(process.env.NODE_OPTIONS || '').includes('--openssl-legacy-provider')) {
    process.env.NODE_OPTIONS = String(process.env.NODE_OPTIONS || '').trim()
      ? `${String(process.env.NODE_OPTIONS).trim()} --openssl-legacy-provider`
      : '--openssl-legacy-provider';
  }
  logWarn('mail.smtp.legacy_tls_enabled', {
    production: config.nodeEnv === 'production',
    host: transportHost || '',
    port: transportPort,
  });
}

const transporter =
  transportHost && transportPort && config.smtpUser && config.smtpPass
    ? nodemailer.createTransport({
        host: transportHost,
        port: transportPort,
        secure: transportSecure,
        connectionTimeout: config.smtpConnectionTimeoutMs,
        greetingTimeout: config.smtpGreetingTimeoutMs,
        socketTimeout: config.smtpSocketTimeoutMs,
        auth: {
          user: config.smtpUser,
          pass: config.smtpPass,
        },
        tls: Object.keys(transportTls).length ? transportTls : undefined,
      })
    : null;

function renderMailLayout({
  eyebrow = 'Carloi',
  preheader = '',
  title,
  body,
  value,
  buttonLabel,
  buttonHref,
  footer,
}) {
  const safeValue = escapeHtml(value);
  const safeTitle = escapeHtml(title);
  const safeBody = escapeHtml(body).replace(/\n/g, '<br />');
  const safeFooter = escapeHtml(footer);
  const safeEyebrow = escapeHtml(eyebrow);
  const safePreheader = escapeHtml(preheader);
  const safeButtonHref = escapeHtml(buttonHref);
  const buttonHtml = buttonHref
    ? `<a href="${safeButtonHref}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;line-height:1;padding:14px 22px;border-radius:10px;">${escapeHtml(buttonLabel)}</a>`
    : `<div style="display:inline-block;background:#111827;color:#ffffff;font-weight:600;font-size:15px;line-height:1;padding:14px 22px;border-radius:10px;">${escapeHtml(buttonLabel)}</div>`;
  const valueBlock = safeValue
    ? `<div style="margin:0 0 20px;padding:16px 18px;border-radius:10px;background:#f8fafc;border:1px solid #d1d5db;text-align:center;"><div style="font-size:28px;font-weight:700;letter-spacing:4px;color:#111827;">${safeValue}</div></div>`
    : '';
  const fallbackBlock = buttonHref
    ? `<div style="margin:18px 0 0;padding:14px 16px;border-radius:10px;background:#f8fafc;border:1px solid #e5e7eb;">` +
        `<div style="font-size:13px;line-height:1.6;color:#374151;margin-bottom:8px;">Buton calismazsa asagidaki dogrudan baglantiyi tarayicinizda acabilirsiniz:</div>` +
        `<a href="${safeButtonHref}" style="font-size:13px;line-height:1.6;color:#111827;word-break:break-all;text-decoration:underline;">${safeButtonHref}</a>` +
      `</div>`
    : '';

  return (
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${safePreheader}</div>` +
    `<div style="margin:0;padding:24px 12px;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#111827;">` +
    `<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;padding:28px 24px;">` +
    `<div style="font-size:13px;font-weight:700;letter-spacing:.08em;color:#111827;text-transform:uppercase;margin-bottom:12px;">${safeEyebrow}</div>` +
    `<h1 style="margin:0 0 12px;font-size:28px;line-height:1.25;color:#111827;">${safeTitle}</h1>` +
    `<p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#374151;">${safeBody}</p>` +
    valueBlock +
    `<div style="margin:0 0 24px;">${buttonHtml}</div>` +
    fallbackBlock +
    `<p style="margin:20px 0 0;font-size:13px;line-height:1.7;color:#6b7280;">${safeFooter}</p>` +
    `</div>` +
    `</div>`
  );
}

function classifySmtpError(error) {
  const code = String(error?.code || '').trim().toUpperCase();
  const command = String(error?.command || '').trim().toUpperCase();
  const message = String(error?.message || '').trim().toLowerCase();
  const response = String(error?.response || '').trim().toLowerCase();
  const source = `${message} ${response}`.trim();

  if (!error) {
    return 'unknown';
  }

  if (
    code === 'EAUTH' ||
    source.includes('auth') ||
    source.includes('invalid login') ||
    source.includes('authentication') ||
    source.includes('username and password not accepted')
  ) {
    return 'auth';
  }

  if (
    code === 'ETIMEDOUT' ||
    source.includes('timeout') ||
    source.includes('timed out') ||
    source.includes('greeting never received')
  ) {
    return 'timeout';
  }

  if (
    code === 'EDNS' ||
    code === 'ENOTFOUND' ||
    code === 'ECONNREFUSED' ||
    code === 'ECONNRESET' ||
    code === 'EHOSTUNREACH' ||
    source.includes('enotfound') ||
    source.includes('getaddrinfo') ||
    source.includes('name or service not known')
  ) {
    return 'network';
  }

  if (
    source.includes('certificate') ||
    source.includes('hostname/ip does not match certificate') ||
    source.includes('self-signed') ||
    source.includes('unable to verify the first certificate') ||
    source.includes('altname')
  ) {
    return 'cert-mismatch';
  }

  if (
    source.includes('ssl') ||
    source.includes('tls') ||
    source.includes('wrong version number') ||
    source.includes('ssl routines') ||
    command === 'CONN'
  ) {
    return 'tls';
  }

  if (code === 'ESOCKET') {
    return 'network';
  }

  return 'unknown';
}

function buildSmtpLogContext(extra = {}, error) {
  return {
    host: transportHost || '',
    port: transportPort || 0,
    secure: transportSecure,
    user: config.smtpUser || '',
    from: config.smtpFrom || '',
    replyTo: config.smtpReplyTo || '',
    tls: transportTls,
    ...extra,
    errorType: classifySmtpError(error),
    code: error?.code || '',
    command: error?.command || '',
    message: error?.message || '',
  };
}

function getMailServiceState() {
  const configured = Boolean(transporter && config.smtpFrom);

  if (config.disableEmail) {
    return {
      disabled: true,
      configured,
      available: false,
      reason: 'disabled',
    };
  }

  if (!configured) {
    return {
      disabled: false,
      configured: false,
      available: false,
      reason: 'not_configured',
    };
  }

  return {
    disabled: false,
    configured: true,
    available: true,
    reason: 'ready',
  };
}

function ensureMailerReady() {
  const state = getMailServiceState();
  if (!state.available) {
    const error = createMailerError(
      state.reason === 'disabled'
        ? 'E-posta servisi su anda devre disi.'
        : 'SMTP mail servisi yapilandirilmadi. SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS ve SMTP_FROM/MAIL_FROM degerlerini kontrol edin.',
    );
    error.emailDisabled = state.reason === 'disabled';
    error.emailNotConfigured = state.reason === 'not_configured';
    throw error;
  }
}

function normalizeAttachments(attachments) {
  const input = Array.isArray(attachments) ? attachments : [];
  return input
    .filter((attachment) => attachment && (attachment.path || attachment.content))
    .map((attachment, index) => {
      const filename = String(attachment.filename || `attachment-${index + 1}`).trim().slice(0, 180);
      const attachmentPath = String(attachment.path || '').trim();

      if (attachmentPath && !isHttpUrl(attachmentPath) && !isAbsoluteFilePath(attachmentPath)) {
        const error = createMailerError('Gecersiz e-posta eki yolu algilandi.', 400);
        error.attachmentIndex = index;
        throw error;
      }

      return {
        filename,
        path: attachmentPath || undefined,
        content: attachment.content || undefined,
        contentType: attachment.contentType || undefined,
      };
    });
}

async function withMailerTimeout(taskFactory, timeoutMessage) {
  let timer = null;
  try {
    return await Promise.race([
      taskFactory(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(createMailerError(timeoutMessage, 504));
        }, config.smtpOperationTimeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

function shouldRetryMailSend(error) {
  const type = classifySmtpError(error);
  return type === 'timeout' || type === 'network';
}

async function verifyMailerConnection() {
  const state = getMailServiceState();

  if (state.reason === 'disabled') {
    logWarn('mail.smtp.disabled', {
      reason: 'VCARX_DISABLE_EMAIL_or_SMTP_DISABLED',
    });
    return false;
  }

  if (state.reason === 'not_configured') {
    logWarn('mail.smtp.not_configured', buildSmtpLogContext());
    return false;
  }

  try {
    await withMailerTimeout(
      () => transporter.verify(),
      'SMTP baglantisi zaman asimina ugradi. Mail servisi su anda yanit vermiyor.',
    );
    logInfo('mail.smtp.verify.success', buildSmtpLogContext());
    return true;
  } catch (error) {
    logError('mail.smtp.verify.failed', buildSmtpLogContext({}, error));
    return false;
  }
}

async function sendEmail(to, subject, html, text, options = {}) {
  const attachments = normalizeAttachments(options.attachments);

  const state = getMailServiceState();
  if (state.reason === 'disabled') {
    logWarn('mail.send.skipped_disabled', {
      to,
      subject,
      attachmentCount: attachments.length,
    });
    return {
      skipped: true,
      emailDisabled: true,
      emailNotConfigured: false,
      accepted: [],
      rejected: [],
    };
  }

  ensureMailerReady();
  const maxAttempts = options.disableRetry ? 1 : 2;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const info = await withMailerTimeout(
        () =>
          transporter.sendMail({
            from: config.smtpFrom,
            replyTo: config.smtpReplyTo || undefined,
            to,
            subject,
            html,
            text,
            attachments,
          }),
        'Mail gonderimi zaman asimina ugradi. Lutfen daha sonra tekrar deneyin.',
      );

      logInfo('mail.send.success', {
        from: config.smtpFrom,
        replyTo: config.smtpReplyTo || '',
        to,
        subject,
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        attachmentCount: attachments.length,
        attempt,
      });

      return info;
    } catch (error) {
      lastError = error;
      logError('mail.send.failed', buildSmtpLogContext({ to, subject, attempt }, error));

      if (attempt >= maxAttempts || !shouldRetryMailSend(error)) {
        break;
      }
    }
  }

  if (lastError && lastError.statusCode) {
    throw lastError;
  }

  throw createMailerError(
    'Mail gonderilemedi. SMTP baglantisini, kullanici bilgisini ve sifreyi kontrol edin.',
    502,
    lastError,
  );
}

async function sendVerificationEmail(email, codeOrLink, options = {}) {
  const safeValue = String(codeOrLink || '').trim();
  const html = renderMailLayout({
    preheader: 'Carloi hesabini etkinlestirmek icin e-posta adresinizi dogrulayin.',
    title: 'Carloi hesabinizi dogrulayin',
    body:
      'Carloi hesabinizin size ait oldugunu onaylamak icin asagidaki baglantiyi kullanin.\nBu baglanti hesabinizi etkinlestirmek icin kullanilir.' +
      (isHttpUrl(safeValue) ? '' : `\n\nDogrulama kodun: ${safeValue}`),
    value: isHttpUrl(safeValue) ? '' : safeValue,
    buttonLabel: 'Hesabimi dogrula',
    buttonHref: isHttpUrl(safeValue) ? safeValue : '',
    footer: 'Bu istegi siz yapmadiysaniz e-postayi dikkate almayabilirsiniz. Bu mesaj yalnizca hesap dogrulama amaciyla gonderilmistir.',
  });
  const text =
    `Carloi hesabinizi dogrulayin\n\n` +
    `Carloi hesabinizin size ait oldugunu onaylamak icin asagidaki baglantiyi veya kodu kullanin.\n\n` +
    `${safeValue}\n\n` +
    `Bu istegi siz yapmadiysaniz e-postayi dikkate almayabilirsiniz.\n\n` +
    `Carloi`;

  return sendEmail(email, 'Carloi hesabini dogrula', html, text, options);
}

async function sendResetPasswordEmail(email, codeOrLink, options = {}) {
  const safeValue = String(codeOrLink || '').trim();
  const html = renderMailLayout({
    preheader: 'Sifreni yenilemek icin guvenli baglantini kullan.',
    title: 'Sifreni yenile',
    body:
      'Carloi hesabin icin bir sifre sifirlama istegi aldik.\nAsagidaki butona tiklayarak yeni sifreni belirleyebilirsin.\nBu baglanti sinirli sure boyunca gecerlidir.' +
      (isHttpUrl(safeValue) ? '' : `\n\nSifirlama kodun: ${safeValue}`),
    value: isHttpUrl(safeValue) ? '' : safeValue,
    buttonLabel: 'Sifreyi Yenile',
    buttonHref: isHttpUrl(safeValue) ? safeValue : '',
    footer: 'Bu istegi sen yapmadiysan hesabin guvende kalacaktir. Bu e-postayi dikkate almayabilirsin.',
  });
  const text =
    `Carloi sifre sifirlama istegi\n\n` +
    `Sifreni yenilemek icin guvenli baglantini kullan.\n\n` +
    `Carloi hesabin icin bir sifre sifirlama istegi aldik.\n` +
    `Asagidaki baglanti veya kod ile yeni sifreni belirleyebilirsin.\n` +
    `Bu baglanti sinirli sure boyunca gecerlidir.\n\n` +
    `${safeValue}\n\n` +
    `Bu istegi sen yapmadiysan hesabin guvende kalacaktir. Bu e-postayi dikkate almayabilirsin.\n\n` +
    `Carloi`;

  return sendEmail(email, 'Carloi sifre sifirlama istegi', html, text, options);
}

module.exports = {
  getMailServiceState,
  sendEmail,
  sendResetPasswordEmail,
  sendVerificationEmail,
  verifyMailerConnection,
};
