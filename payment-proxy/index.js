require('dotenv').config();

const { randomUUID } = require('node:crypto');
const express = require('express');
const { Pool, types } = require('pg');
const {
  computePaymentCallbackSignature,
  normalizeMoney,
} = require('../server/modules/billing/payment-security');
const {
  PAYMENT_STATUS_FAILED,
  PAYMENT_STATUS_INITIATED,
  PAYMENT_STATUS_PENDING,
  PAYMENT_STATUS_SUCCESS,
  isPaymentSuccessLike,
  normalizePaymentStatus,
} = require('../server/modules/billing/payment-status');
const {
  GARANTI_DEFAULT_API_VERSION,
  GARANTI_DEFAULT_LANGUAGE,
  GARANTI_DEFAULT_TXN_TYPE,
  buildGarantiFormFields,
  normalizeText,
  validateGarantiCallback,
} = require('./garanti-adapter');

types.setTypeParser(20, (value) => Number(value));

const paymentProxyHost = process.env.HOST || '0.0.0.0';
const paymentProxyPort = Number(process.env.PORT || process.env.VCARX_PAYMENT_PROXY_PORT || 4100);
const paymentProvider = String(
  process.env.VCARX_PAYMENT_PROVIDER || process.env.VCAR_PAYMENT_PROVIDER || 'garanti_oos',
).toLowerCase();
const paymentProxyPublicBaseUrl = String(
  process.env.VCARX_PAYMENT_PROXY_PUBLIC_BASE_URL ||
    process.env.VCAR_PAYMENT_PROXY_PUBLIC_BASE_URL ||
    '',
).trim().replace(/\/+$/g, '');
const platformCallbackUrl =
  process.env.VCARX_PLATFORM_PAYMENT_CALLBACK_URL ||
  'http://localhost:4000/api/billing/garanti/callback';
const paymentCallbackToken =
  process.env.VCARX_PAYMENT_CALLBACK_TOKEN || process.env.VCAR_PAYMENT_CALLBACK_TOKEN || '';
const paymentCallbackSignatureSecret =
  process.env.VCARX_PAYMENT_CALLBACK_SIGNATURE_SECRET ||
  process.env.VCAR_PAYMENT_CALLBACK_SIGNATURE_SECRET ||
  '';
const paymentCallbackSignatureHeader =
  process.env.VCARX_PAYMENT_CALLBACK_SIGNATURE_HEADER ||
  process.env.VCAR_PAYMENT_CALLBACK_SIGNATURE_HEADER ||
  'x-payment-signature';
const databaseUrl = process.env.DATABASE_URL || '';
const paymentPageBaseUrl = String(
  process.env.VCARX_PAYMENT_PAGE_BASE_URL ||
    process.env.VCAR_PAYMENT_PAGE_BASE_URL ||
    process.env.APP_BASE_URL ||
    'http://localhost:3000',
).replace(/\/+$/g, '');
const paymentReturnScheme =
  process.env.VCARX_PAYMENT_RETURN_SCHEME ||
  process.env.VCAR_PAYMENT_RETURN_SCHEME ||
  'carloi://payment-result';
const databaseSsl =
  process.env.DATABASE_SSL === 'true' ||
  process.env.PGSSLMODE === 'require' ||
  process.env.PGSSLMODE === 'verify-full';

const garantiConfig = {
  mode: String(process.env.GARANTI_MODE || 'TEST').trim().toUpperCase(),
  apiVersion: String(process.env.GARANTI_API_VERSION || GARANTI_DEFAULT_API_VERSION).trim(),
  secure3dModel: String(process.env.GARANTI_SECURE3D_MODEL || '3D_OOS_PAY').trim().toUpperCase(),
  merchantId: String(process.env.GARANTI_MERCHANT_ID || '').trim(),
  terminalId: String(process.env.GARANTI_TERMINAL_ID || '').trim(),
  terminalProvUserId: String(process.env.GARANTI_TERMINAL_PROV_USER_ID || '').trim(),
  terminalUserId: String(
    process.env.GARANTI_TERMINAL_USER_ID || process.env.GARANTI_TERMINAL_PROV_USER_ID || '',
  ).trim(),
  provisionPassword: String(process.env.GARANTI_PROVISION_PASSWORD || '').trim(),
  storeKey: String(process.env.GARANTI_STORE_KEY || '').trim(),
  gate3dengineUrl: String(process.env.GARANTI_GATE3DENGINE_URL || '').trim(),
  companyName: String(process.env.GARANTI_COMPANY_NAME || 'Carloi').trim(),
  language: String(process.env.GARANTI_LANGUAGE || GARANTI_DEFAULT_LANGUAGE).trim().toLowerCase(),
};

if (!databaseUrl) {
  throw new Error('DATABASE_URL zorunludur. Payment proxy PostgreSQL kullanir.');
}

if (!['garanti_oos', 'garanti_virtual_pos', 'garanti'].includes(paymentProvider)) {
  throw new Error('Payment proxy artik yalnizca Garanti 3D OOS akislarini destekler.');
}

const missingGarantiEnv = [
  ['VCARX_PAYMENT_PROXY_PUBLIC_BASE_URL', paymentProxyPublicBaseUrl],
  ['VCARX_PLATFORM_PAYMENT_CALLBACK_URL', platformCallbackUrl],
  ['GARANTI_MERCHANT_ID', garantiConfig.merchantId],
  ['GARANTI_TERMINAL_ID', garantiConfig.terminalId],
  ['GARANTI_TERMINAL_PROV_USER_ID', garantiConfig.terminalProvUserId],
  ['GARANTI_TERMINAL_USER_ID', garantiConfig.terminalUserId],
  ['GARANTI_PROVISION_PASSWORD', garantiConfig.provisionPassword],
  ['GARANTI_STORE_KEY', garantiConfig.storeKey],
  ['GARANTI_GATE3DENGINE_URL', garantiConfig.gate3dengineUrl],
].filter(([, value]) => !value);

if (missingGarantiEnv.length) {
  throw new Error(
    `Garanti entegrasyonu icin eksik env: ${missingGarantiEnv.map(([key]) => key).join(', ')}`,
  );
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseSsl ? { rejectUnauthorized: false } : false,
  max: Number(process.env.PG_POOL_MAX || 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

const PAYMENT_PROXY_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS payment_orders (
    payment_reference TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    order_type TEXT NOT NULL DEFAULT 'insurance',
    payment_record_id TEXT,
    callback_url TEXT,
    user_id TEXT,
    listing_id TEXT,
    plan_code TEXT,
    amount TEXT NOT NULL,
    status TEXT NOT NULL,
    buyer_name TEXT,
    buyer_email TEXT,
    buyer_phone TEXT,
    payload_json TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    paid_at TIMESTAMPTZ
  );
  ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'insurance';
  ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS payment_record_id TEXT;
  ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS callback_url TEXT;
  ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS user_id TEXT;
  ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS listing_id TEXT;
  ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS plan_code TEXT;
  CREATE INDEX IF NOT EXISTS idx_payment_orders_conversation_id ON payment_orders(conversation_id);
`;

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

function nowIso() {
  return new Date().toISOString();
}

function logProxyEvent(event, metadata = {}) {
  console.log(
    `[payment-proxy] ${event} ${JSON.stringify({
      timestamp: nowIso(),
      ...metadata,
    })}`,
  );
}

function safeEncode(value) {
  return encodeURIComponent(String(value || ''));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parsePayload(value) {
  if (!value) {
    return {};
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(String(value));
  } catch {
    return {};
  }
}

function buildHostedPaymentUrl(paymentReference, overrides = {}) {
  const customBase = String(overrides.paymentPageBaseUrl || '').trim().replace(/\/+$/g, '');
  const baseUrl = customBase || paymentPageBaseUrl;
  return `${baseUrl}/pay?paymentReference=${safeEncode(paymentReference)}`;
}

function buildReturnUrls(paymentReference, payload = {}) {
  const metadata = payload.metadata || {};
  const conversationId = payload.conversationId || metadata.conversationId || '';
  const appSuccessUrl =
    metadata.appSuccessUrl ||
    `${paymentReturnScheme}?status=success&paymentReference=${safeEncode(paymentReference)}&conversationId=${safeEncode(conversationId)}`;
  const appFailureUrl =
    metadata.appFailureUrl ||
    `${paymentReturnScheme}?status=failed&paymentReference=${safeEncode(paymentReference)}&conversationId=${safeEncode(conversationId)}`;
  const appCancelledUrl =
    metadata.appCancelledUrl ||
    `${paymentReturnScheme}?status=cancelled&paymentReference=${safeEncode(paymentReference)}&conversationId=${safeEncode(conversationId)}`;
  const webSuccessUrl =
    metadata.webSuccessUrl ||
    `${buildHostedPaymentUrl(paymentReference, metadata)}&status=success`;
  const webFailureUrl =
    metadata.webFailureUrl ||
    `${buildHostedPaymentUrl(paymentReference, metadata)}&status=failed`;
  const webCancelledUrl =
    metadata.webCancelledUrl ||
    `${buildHostedPaymentUrl(paymentReference, metadata)}&status=cancelled`;

  return {
    appSuccessUrl,
    appFailureUrl,
    appCancelledUrl,
    webSuccessUrl,
    webFailureUrl,
    webCancelledUrl,
  };
}

function buildProxyCheckoutUrl(paymentReference) {
  return `${paymentProxyPublicBaseUrl}/api/pay/garanti/checkout/${safeEncode(paymentReference)}`;
}

function buildProxyCallbackUrl(paymentReference, flow = 'result') {
  return `${paymentProxyPublicBaseUrl}/api/pay/garanti/callback/${safeEncode(paymentReference)}?flow=${safeEncode(flow)}`;
}

function buildOrderSession(order) {
  const payload = parsePayload(order.payload_json);
  const returnUrls = buildReturnUrls(order.payment_reference, payload);
  const gatewayUrl = buildProxyCheckoutUrl(order.payment_reference);

  return {
    paymentReference: order.payment_reference,
    paymentRecordId: order.payment_record_id || null,
    orderType: order.order_type || 'insurance',
    status: order.status || PAYMENT_STATUS_PENDING,
    amount: String(order.amount || ''),
    currency: payload.currency || 'TRY',
    providerName: 'Garanti Virtual POS',
    paymentUrl:
      order.order_type === 'insurance'
        ? buildHostedPaymentUrl(order.payment_reference, payload.metadata || {})
        : gatewayUrl,
    gatewayUrl,
    trustMessage:
      'Odeme Garanti Virtual POS uzerinde tamamlanir. Carloi resmi odeme saglayicisi veya emanet kurumu degildir.',
    insuranceType:
      payload.metadata?.insuranceType || payload.insuranceType || 'Sigorta hizmeti',
    vehicleSummary: {
      title: payload.listing?.title || payload.metadata?.listingTitle || '',
      price: payload.listing?.price || payload.metadata?.listingPrice || '',
      location: payload.listing?.location || payload.metadata?.listingLocation || '',
      plateNumber: payload.listing?.registrationInfo?.plateNumber || payload.metadata?.plateNumber || '',
      modelYearSummary: payload.listing?.summaryLine || '',
    },
    returnUrls,
  };
}

async function initializePaymentProxy() {
  const client = await pool.connect();
  try {
    const statements = PAYMENT_PROXY_SCHEMA_SQL
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean);

    for (const statement of statements) {
      await client.query(statement);
    }
  } finally {
    client.release();
  }
}

async function createPaymentOrder(payload) {
  const paymentReference = randomUUID();
  const createdAt = nowIso();

  await pool.query(
    `INSERT INTO payment_orders
     (
       payment_reference, conversation_id, order_type, payment_record_id, callback_url,
       user_id, listing_id, plan_code, amount, status, buyer_name, buyer_email,
       buyer_phone, payload_json, created_at, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
    [
      paymentReference,
      payload.conversationId,
      payload.orderType || 'insurance',
      payload.paymentRecordId || null,
      payload.callbackUrl || null,
      payload.metadata?.userId || null,
      payload.metadata?.listingId || null,
      payload.metadata?.planCode || null,
      String(payload.amount),
      PAYMENT_STATUS_INITIATED,
      payload.buyer?.name || '',
      payload.buyer?.email || '',
      payload.buyer?.phone || '',
      JSON.stringify(payload),
      createdAt,
      createdAt,
    ],
  );

  logProxyEvent('payment_order_created', {
    paymentReference,
    paymentRecordId: payload.paymentRecordId || null,
    orderType: payload.orderType || 'insurance',
    amount: String(payload.amount || ''),
  });

  return paymentReference;
}

async function updateOrderStatus(paymentReference, status) {
  await pool.query(
    `UPDATE payment_orders
     SET status = $1, updated_at = $2, paid_at = CASE WHEN $3 = 'success' THEN $4 ELSE paid_at END
     WHERE payment_reference = $5`,
    [status, nowIso(), status, nowIso(), paymentReference],
  );
}

async function markOrderPending(paymentReference) {
  await updateOrderStatus(paymentReference, PAYMENT_STATUS_PENDING);
}

async function getOrder(paymentReference) {
  const result = await pool.query(
    'SELECT * FROM payment_orders WHERE payment_reference = $1',
    [paymentReference],
  );
  return result.rows[0] || null;
}

function buildPlatformCallbackPayload(order, paymentReference, paymentStatus, extra = {}) {
  const payload = parsePayload(order.payload_json);

  return {
    conversationId: order.conversation_id,
    paymentReference,
    paymentRecordId: order.payment_record_id,
    paymentStatus,
    orderType: order.order_type,
    listingId: order.listing_id,
    userId: order.user_id,
    planCode: order.plan_code,
    amount: normalizeMoney(order.amount),
    currency: String(payload.currency || 'TRY').toUpperCase(),
    provider: 'garanti_virtual_pos',
    callbackTimestamp: nowIso(),
    ...extra,
  };
}

async function notifyPlatformPaymentResult(order, paymentReference, paymentStatus, extra = {}) {
  const targetUrl = order.callback_url || platformCallbackUrl;
  const headers = {
    'Content-Type': 'application/json',
  };
  const payload = buildPlatformCallbackPayload(order, paymentReference, paymentStatus, extra);

  if (paymentCallbackToken) {
    headers['x-payment-callback-token'] = paymentCallbackToken;
  }

  if (paymentCallbackSignatureSecret) {
    headers[paymentCallbackSignatureHeader] = computePaymentCallbackSignature(
      payload,
      paymentCallbackSignatureSecret,
    );
  }

  const response = await fetch(targetUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || 'Ana platform odeme callback istegi basarisiz oldu.');
  }

  logProxyEvent('platform_callback_sent', {
    paymentReference,
    paymentRecordId: order.payment_record_id || null,
    status: paymentStatus,
    manualReviewRequired: extra.manualReviewRequired === true,
  });
}

function normalizeCallbackRequestPayload(source = {}) {
  return Object.fromEntries(
    Object.entries(source || {}).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ]),
  );
}

function buildFailureUrl(url, reason) {
  if (!reason) {
    return url;
  }

  try {
    const nextUrl = new URL(url);
    nextUrl.searchParams.set('reason', reason);
    return nextUrl.toString();
  } catch {
    return url;
  }
}

function sanitizeGarantiPayload(payload) {
  return {
    orderId: payload.orderId,
    procReturnCode: payload.procReturnCode,
    mdStatus: payload.mdStatus,
    amount: payload.amount,
    currencyCode: payload.currencyCode,
    clientId: payload.clientId,
    response: payload.response,
    errorMessage: payload.errorMessage,
    authCode: payload.authCode,
    hostRefNum: payload.hostRefNum,
    transactionType: payload.transactionType,
  };
}

function renderAutoSubmitPage({ paymentReference, actionUrl, fields, cancelUrl }) {
  const hiddenFields = Object.entries(fields)
    .map(
      ([key, value]) =>
        `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(value)}" />`,
    )
    .join('\n');

  return `<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Carloi Guvenli Odeme</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f5f7fb; color: #172033; padding: 24px; }
      .shell { max-width: 560px; margin: 0 auto; background: #fff; border-radius: 24px; padding: 28px; box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08); }
      .eyebrow { font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: #64748b; margin: 0 0 12px; }
      h1 { margin: 0 0 10px; font-size: 28px; line-height: 1.2; }
      p { color: #475569; line-height: 1.6; }
      .actions { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 24px; }
      button, a { border-radius: 999px; padding: 14px 18px; text-decoration: none; font-weight: 600; }
      button { background: #0f172a; color: #fff; border: none; cursor: pointer; }
      a { border: 1px solid rgba(15, 23, 42, 0.18); color: #0f172a; }
      .hint { margin-top: 18px; font-size: 14px; color: #64748b; }
    </style>
  </head>
  <body>
    <main class="shell">
      <p class="eyebrow">Carloi Payment</p>
      <h1>Guvenli odeme sayfasina gecis yapiliyor</h1>
      <p>Sigorta odemeniz Garanti Bankasi'nin guvenli odeme altyapisinda tamamlanacaktir. Kart bilgileriniz Carloi sistemlerinde tutulmaz.</p>
      <form id="garantiPaymentForm" method="post" action="${escapeHtml(actionUrl)}">
        ${hiddenFields}
        <div class="actions">
          <button type="submit">Garanti odeme sayfasina devam et</button>
          <a href="${escapeHtml(cancelUrl)}">Vazgec ve Carloi'ye don</a>
        </div>
      </form>
      <p class="hint">Odeme referansi: ${escapeHtml(paymentReference)}</p>
    </main>
    <script>
      window.setTimeout(function () {
        var form = document.getElementById('garantiPaymentForm');
        if (form) {
          form.submit();
        }
      }, 400);
    </script>
  </body>
</html>`;
}

function validateOrderCreationPayload(payload = {}) {
  const amount = normalizeText(payload.amount);
  const buyerEmail = normalizeText(payload.buyer?.email || payload.metadata?.buyerEmail);
  const customerIpAddress = normalizeText(payload.customerIpAddress || payload.metadata?.customerIpAddress);

  if (!payload.paymentRecordId || !amount || !payload.callbackUrl) {
    const error = new Error('paymentRecordId, amount ve callbackUrl zorunludur.');
    error.statusCode = 400;
    throw error;
  }

  if (!buyerEmail) {
    const error = new Error('Garanti odemesi icin musteri e-posta adresi zorunludur.');
    error.statusCode = 400;
    throw error;
  }

  if (!customerIpAddress) {
    const error = new Error('Garanti odemesi icin musteri IP adresi zorunludur.');
    error.statusCode = 400;
    throw error;
  }
}

app.get('/health', (_request, response) => {
  response.json({
    success: true,
    provider: paymentProvider,
    port: paymentProxyPort,
    readiness: {
      garantiConfigured: true,
      paymentProxyPublicBaseUrlConfigured: Boolean(paymentProxyPublicBaseUrl),
      platformCallbackConfigured: Boolean(platformCallbackUrl),
      databaseConfigured: Boolean(databaseUrl),
    },
  });
});

app.get('/api/pay/order/:paymentReference', async (request, response, next) => {
  try {
    const order = await getOrder(String(request.params.paymentReference || ''));
    if (!order) {
      const error = new Error('Odeme oturumu bulunamadi.');
      error.statusCode = 404;
      throw error;
    }

    response.json({
      success: true,
      session: buildOrderSession(order),
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/pay/garanti/checkout/:paymentReference', async (request, response, next) => {
  try {
    const paymentReference = normalizeText(request.params.paymentReference);
    const order = await getOrder(paymentReference);
    if (!order) {
      const error = new Error('Odeme oturumu bulunamadi.');
      error.statusCode = 404;
      throw error;
    }

    const payload = parsePayload(order.payload_json);
    const returnUrls = buildReturnUrls(paymentReference, payload);

    if (isPaymentSuccessLike(order.status)) {
      response.redirect(303, returnUrls.webSuccessUrl);
      return;
    }

    if (normalizePaymentStatus(order.status) === PAYMENT_STATUS_FAILED) {
      response.redirect(303, returnUrls.webFailureUrl);
      return;
    }

    const successUrl = buildProxyCallbackUrl(paymentReference, 'success');
    const errorUrl = buildProxyCallbackUrl(paymentReference, 'failed');
    const fields = buildGarantiFormFields(garantiConfig, order, payload, {
      successUrl,
      errorUrl,
      txType: payload.txType || GARANTI_DEFAULT_TXN_TYPE,
      installmentCount: payload.installmentCount || '',
    });

    await markOrderPending(paymentReference);

    logProxyEvent('payment.redirect', {
      paymentReference,
      paymentRecordId: order.payment_record_id || null,
      orderType: order.order_type,
      secure3dModel: garantiConfig.secure3dModel,
      txnAmount: fields.txnamount,
    });

    response
      .status(200)
      .type('html')
      .send(
        renderAutoSubmitPage({
          paymentReference,
          actionUrl: garantiConfig.gate3dengineUrl,
          fields,
          cancelUrl: returnUrls.webCancelledUrl || returnUrls.webFailureUrl,
        }),
      );
  } catch (error) {
    next(error);
  }
});

app.post('/api/pay/insurance', async (request, response, next) => {
  try {
    const payload = request.body || {};
    if (!payload.conversationId || !payload.amount) {
      const error = new Error('conversationId ve amount zorunludur.');
      error.statusCode = 400;
      throw error;
    }

    validateOrderCreationPayload({
      ...payload,
      paymentRecordId: payload.paymentRecordId || payload.conversationId,
    });

    const paymentReference = await createPaymentOrder(payload);
    const gatewayUrl = buildProxyCheckoutUrl(paymentReference);
    const paymentUrl = buildHostedPaymentUrl(paymentReference, payload.metadata || {});
    await markOrderPending(paymentReference);

    logProxyEvent('payment.order_ready', {
      paymentReference,
      orderType: payload.orderType || 'insurance',
      amount: String(payload.amount || ''),
      paymentRecordId: payload.paymentRecordId || null,
    });

    response.json({
      success: true,
      paymentReference,
      paymentUrl,
      gatewayUrl,
      returnUrls: buildReturnUrls(paymentReference, payload),
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/pay/order', async (request, response, next) => {
  try {
    const payload = request.body || {};
    validateOrderCreationPayload(payload);

    const enrichedPayload = {
      ...payload,
      conversationId: payload.conversationId || payload.paymentRecordId,
      orderType: payload.orderType || 'generic',
    };
    const paymentReference = await createPaymentOrder(enrichedPayload);
    const gatewayUrl = buildProxyCheckoutUrl(paymentReference);
    const paymentUrl =
      enrichedPayload.orderType === 'insurance'
        ? buildHostedPaymentUrl(paymentReference, payload.metadata || {})
        : gatewayUrl;
    await markOrderPending(paymentReference);

    logProxyEvent('payment.order_ready', {
      paymentReference,
      orderType: enrichedPayload.orderType,
      amount: String(enrichedPayload.amount || ''),
      paymentRecordId: enrichedPayload.paymentRecordId || null,
    });

    response.json({
      success: true,
      paymentReference,
      paymentUrl,
      gatewayUrl,
      returnUrls: buildReturnUrls(paymentReference, enrichedPayload),
    });
  } catch (error) {
    next(error);
  }
});

app.all('/api/pay/garanti/callback/:paymentReference', async (request, response, next) => {
  try {
    const paymentReference = normalizeText(request.params.paymentReference);
    const order = await getOrder(paymentReference);
    if (!order) {
      const error = new Error('Odeme kaydi bulunamadi.');
      error.statusCode = 404;
      throw error;
    }

    const orderPayload = parsePayload(order.payload_json);
    const returnUrls = buildReturnUrls(paymentReference, orderPayload);
    const callbackPayload = normalizeCallbackRequestPayload(
      request.method === 'GET' ? request.query : request.body,
    );
    const validation = validateGarantiCallback({
      payload: callbackPayload,
      paymentReference,
      expectedAmount: order.amount,
      expectedCurrency: orderPayload.currency || 'TRY',
      expectedTerminalId: garantiConfig.terminalId,
      secure3dModel: garantiConfig.secure3dModel,
      storeKey: garantiConfig.storeKey,
    });

    logProxyEvent('payment.callback', {
      paymentReference,
      paymentRecordId: order.payment_record_id || null,
      approved: validation.approved,
      validation: validation.validation,
      mdStatus: validation.payload.mdStatus || null,
      procReturnCode: validation.payload.procReturnCode || null,
      errors: validation.errors,
    });

    if (isPaymentSuccessLike(order.status) && validation.approved) {
      logProxyEvent('payment.callback_duplicate', {
        paymentReference,
        paymentRecordId: order.payment_record_id || null,
        status: order.status,
      });
      response.redirect(303, returnUrls.webSuccessUrl);
      return;
    }

    if (isPaymentSuccessLike(order.status) && !validation.approved) {
      try {
        await notifyPlatformPaymentResult(order, paymentReference, PAYMENT_STATUS_FAILED, {
          manualReviewRequired: true,
          manualReviewReason: 'conflicting_callback_after_success',
          providerPayload: sanitizeGarantiPayload(validation.payload),
          providerValidation: {
            validation: validation.validation,
            mdStatusAccepted: validation.mdStatusAccepted,
            allowedMdStatuses: validation.allowedMdStatuses,
            procReturnCodeApproved: validation.procReturnCodeApproved,
            amountMatches: validation.amountMatches,
            orderMatches: validation.orderMatches,
            currencyMatches: validation.currencyMatches,
            terminalMatches: validation.terminalMatches,
            hashVerified: validation.hashVerified,
            hashAlgorithm: validation.hashAlgorithm || null,
            validationErrors: validation.errors,
          },
        });
      } catch (error) {
        logProxyEvent('platform_callback_failed', {
          paymentReference,
          paymentRecordId: order.payment_record_id || null,
          error: error.message,
          duplicateConflict: true,
        });
      }

      response.redirect(303, buildFailureUrl(returnUrls.webFailureUrl, 'manual_review'));
      return;
    }

    const callbackStatus = validation.approved ? PAYMENT_STATUS_SUCCESS : PAYMENT_STATUS_FAILED;
    const providerPayload = sanitizeGarantiPayload(validation.payload);
    const providerValidation = {
      validation: validation.validation,
      mdStatusAccepted: validation.mdStatusAccepted,
      allowedMdStatuses: validation.allowedMdStatuses,
      procReturnCodeApproved: validation.procReturnCodeApproved,
      amountMatches: validation.amountMatches,
      orderMatches: validation.orderMatches,
      currencyMatches: validation.currencyMatches,
      terminalMatches: validation.terminalMatches,
      hashVerified: validation.hashVerified,
      hashAlgorithm: validation.hashAlgorithm || null,
      validationErrors: validation.errors,
    };

    await updateOrderStatus(paymentReference, callbackStatus);

    try {
      await notifyPlatformPaymentResult(order, paymentReference, callbackStatus, {
        manualReviewRequired: validation.manualReviewRequired,
        manualReviewReason: validation.manualReviewRequired
          ? validation.errors.join(',')
          : null,
        providerPayload,
        providerValidation,
      });
    } catch (error) {
      await updateOrderStatus(paymentReference, PAYMENT_STATUS_FAILED);
      logProxyEvent('platform_callback_failed', {
        paymentReference,
        paymentRecordId: order.payment_record_id || null,
        error: error.message,
      });
      response.redirect(303, buildFailureUrl(returnUrls.webFailureUrl, 'platform_callback_failed'));
      return;
    }

    if (validation.approved) {
      response.redirect(303, returnUrls.webSuccessUrl);
      return;
    }

    if (validation.manualReviewRequired) {
      logProxyEvent('payment.manual_review_required', {
        paymentReference,
        paymentRecordId: order.payment_record_id || null,
        errors: validation.errors,
      });
    }

    response.redirect(
      303,
      buildFailureUrl(
        returnUrls.webFailureUrl,
        validation.manualReviewRequired ? 'manual_review' : 'payment_failed',
      ),
    );
  } catch (error) {
    next(error);
  }
});

// Legacy internal webhook is kept for controlled testing only.
app.post('/api/payments/webhook/paid', async (request, response, next) => {
  try {
    if (
      paymentCallbackToken &&
      request.get('x-payment-callback-token') !== paymentCallbackToken
    ) {
      const error = new Error('Payment proxy webhook istegi yetkisiz.');
      error.statusCode = 401;
      throw error;
    }

    const paymentReference = normalizeText(request.body?.paymentReference);
    const requestedStatus = normalizePaymentStatus(
      request.body?.paymentStatus || PAYMENT_STATUS_SUCCESS,
    );
    if (!paymentReference) {
      const error = new Error('paymentReference zorunludur.');
      error.statusCode = 400;
      throw error;
    }

    const order = await getOrder(paymentReference);
    if (!order) {
      const error = new Error('Odeme kaydi bulunamadi.');
      error.statusCode = 404;
      throw error;
    }

    if (isPaymentSuccessLike(order.status)) {
      logProxyEvent('payment_callback_duplicate', {
        paymentReference,
        paymentRecordId: order.payment_record_id || null,
        existingStatus: order.status,
        requestedStatus,
      });

      response.json({
        success: true,
        duplicate: true,
      });
      return;
    }

    const normalizedStatus =
      requestedStatus === PAYMENT_STATUS_FAILED ? PAYMENT_STATUS_FAILED : PAYMENT_STATUS_SUCCESS;

    await updateOrderStatus(paymentReference, normalizedStatus);
    await notifyPlatformPaymentResult(order, paymentReference, normalizedStatus);

    logProxyEvent('payment_callback_processed', {
      paymentReference,
      paymentRecordId: order.payment_record_id || null,
      status: normalizedStatus,
    });

    response.json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  response.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Payment proxy istegi basarisiz oldu.',
  });
});

async function startPaymentProxy() {
  await initializePaymentProxy();

  app.listen(paymentProxyPort, paymentProxyHost, () => {
    console.log(`Carloi payment proxy listening on http://${paymentProxyHost}:${paymentProxyPort}`);
  });
}

startPaymentProxy().catch((error) => {
  console.error('Carloi payment proxy failed to start.', error);
  process.exit(1);
});
