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
  const buttonHtml = buttonHref
    ? `<a href="${escapeHtml(buttonHref)}" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;line-height:1;padding:14px 24px;border-radius:14px;">${escapeHtml(buttonLabel)}</a>`
    : `<div style="display:inline-block;background:#dc2626;color:#ffffff;font-weight:700;font-size:15px;line-height:1;padding:14px 24px;border-radius:14px;">${escapeHtml(buttonLabel)}</div>`;
  const valueBlock = safeValue
    ? `<div style="margin:0 0 24px;padding:18px 20px;border-radius:14px;background:#fafafa;border:1px solid #e5e7eb;text-align:center;"><div style="font-size:30px;font-weight:800;letter-spacing:4px;color:#111827;">${safeValue}</div></div>`
    : '';

  return (
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${safePreheader}</div>` +
    `<div style="margin:0;padding:32px 16px;background:#ffffff;font-family:Inter, Arial, sans-serif;color:#111827;">` +
    `<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #ececec;border-radius:16px;padding:36px 32px;box-shadow:0 12px 36px rgba(17,24,39,.08);">` +
    `<div style="font-size:12px;font-weight:800;letter-spacing:1.6px;color:#111827;text-transform:uppercase;margin-bottom:14px;">${safeEyebrow}</div>` +
    `<h1 style="margin:0 0 12px;font-size:30px;line-height:1.15;color:#111827;">${safeTitle}</h1>` +
    `<p style="margin:0 0 24px;font-size:15px;line-height:1.75;color:#4b5563;">${safeBody}</p>` +
    valueBlock +
    `<div style="margin:0 0 24px;">${buttonHtml}</div>` +
    `<p style="margin:0;font-size:13px;line-height:1.7;color:#6b7280;">${safeFooter}</p>` +
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
    tls: transportTls,
    ...extra,
    errorType: classifySmtpError(error),
    code: error?.code || '',
    command: error?.command || '',
    message: error?.message || '',
  };
}

function ensureMailerReady() {
  if (!transporter || !config.smtpFrom) {
    throw createMailerError(
      'SMTP mail servisi yapilandirilmadi. SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS ve MAIL_FROM degerlerini kontrol edin.',
    );
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
  if (config.disableEmail) {
    logWarn('mail.smtp.disabled', {
      reason: 'VCARX_DISABLE_EMAIL_or_SMTP_DISABLED',
    });
    return false;
  }

  if (!transporter || !config.smtpFrom) {
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

  if (config.disableEmail) {
    logWarn('mail.send.skipped_disabled', {
      to,
      subject,
      attachmentCount: attachments.length,
    });
    return {
      skipped: true,
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
    preheader: 'Hesabini aktiflestirmek icin e-posta adresini dogrula.',
    title: 'Hesabini dogrula',
    body:
      'Carloi hesabini guvenle kullanmaya baslamak icin e-posta adresini dogrulaman gerekiyor.\nAsagidaki butona tiklayarak hesabini aktiflestirebilirsin.' +
      (isHttpUrl(safeValue) ? '' : `\n\nDogrulama kodun: ${safeValue}`),
    value: isHttpUrl(safeValue) ? '' : safeValue,
    buttonLabel: 'Hesabimi Dogrula',
    buttonHref: isHttpUrl(safeValue) ? safeValue : '',
    footer: 'Eger bu hesabi sen olusturmadiysan bu e-postayi gormezden gelebilirsin.',
  });
  const text =
    `Carloi hesabini dogrula\n\n` +
    `Hesabini aktiflestirmek icin e-posta adresini dogrula.\n\n` +
    `Carloi hesabini guvenle kullanmaya baslamak icin e-posta adresini dogrulaman gerekiyor.\n` +
    `Asagidaki baglanti veya kod ile hesabini aktiflestirebilirsin.\n\n` +
    `${safeValue}\n\n` +
    `Eger bu hesabi sen olusturmadiysan bu e-postayi gormezden gelebilirsin.\n\n` +
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
  sendEmail,
  sendResetPasswordEmail,
  sendVerificationEmail,
  verifyMailerConnection,
};
