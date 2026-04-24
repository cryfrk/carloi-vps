const { randomUUID } = require('node:crypto');

const { db } = require('../../database');

function nowIso() {
  return new Date().toISOString();
}

function toBoolean(value) {
  return value === true || value === 1;
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseMetadata(value) {
  if (!value) {
    return {};
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function mapSubscriptionPlan(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    code: row.code,
    monthlyPrice: String(row.monthly_price ?? row.monthlyPrice ?? '0'),
    yearlyPrice:
      row.yearly_price === null || row.yearlyPrice === null
        ? null
        : String(row.yearly_price ?? row.yearlyPrice),
    currency: row.currency || 'TRY',
    maxListingsPerMonth: toNumber(row.max_listings_per_month ?? row.maxListingsPerMonth, 0),
    maxFeaturedListings: toNumber(row.max_featured_listings ?? row.maxFeaturedListings, 0),
    isCommercialOnly: toBoolean(row.is_commercial_only ?? row.isCommercialOnly),
    isActive: toBoolean(row.is_active ?? row.isActive),
    createdAt: row.created_at || row.createdAt || null,
    updatedAt: row.updated_at || row.updatedAt || null,
  };
}

function mapBillingSettings(row) {
  if (!row) {
    return {
      id: 'default',
      paidListingsEnabled: false,
      subscriptionRequiredForCommercial: false,
      individualListingFeeEnabled: false,
      featuredListingFeeEnabled: false,
      individualListingFeeAmount: '0',
      featuredListingFeeAmount: '0',
      currency: 'TRY',
      updatedAt: null,
    };
  }

  return {
    id: row.id || 'default',
    paidListingsEnabled: toBoolean(row.paid_listings_enabled ?? row.paidListingsEnabled),
    subscriptionRequiredForCommercial: toBoolean(
      row.subscription_required_for_commercial ?? row.subscriptionRequiredForCommercial,
    ),
    individualListingFeeEnabled: toBoolean(
      row.individual_listing_fee_enabled ?? row.individualListingFeeEnabled,
    ),
    featuredListingFeeEnabled: toBoolean(
      row.featured_listing_fee_enabled ?? row.featuredListingFeeEnabled,
    ),
    individualListingFeeAmount: String(
      row.individual_listing_fee_amount ?? row.individualListingFeeAmount ?? '0',
    ),
    featuredListingFeeAmount: String(
      row.featured_listing_fee_amount ?? row.featuredListingFeeAmount ?? '0',
    ),
    currency: row.currency || 'TRY',
    updatedAt: row.updated_at || row.updatedAt || null,
  };
}

function mapUserSubscription(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id || row.userId,
    planId: row.plan_id || row.planId,
    status: row.status,
    startAt: row.start_at || row.startAt || null,
    endAt: row.end_at || row.endAt || null,
    renewalAt: row.renewal_at || row.renewalAt || null,
    paymentProvider: row.payment_provider || row.paymentProvider || null,
    paymentStatus: row.payment_status || row.paymentStatus || null,
    externalPaymentReference:
      row.external_payment_reference || row.externalPaymentReference || null,
    createdAt: row.created_at || row.createdAt || null,
    updatedAt: row.updated_at || row.updatedAt || null,
    plan: row.plan_id || row.planId
      ? {
          id: row.plan_id || row.planId,
          name: row.plan_name || row.name || '',
          code: row.plan_code || row.code || '',
          monthlyPrice: row.plan_monthly_price
            ? String(row.plan_monthly_price)
            : row.monthly_price
              ? String(row.monthly_price)
              : undefined,
          currency: row.plan_currency || row.currency || 'TRY',
        }
      : null,
  };
}

function mapPaymentRecord(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id || row.userId,
    listingId: row.listing_id || row.listingId || null,
    type: row.type,
    amount: String(row.amount ?? '0'),
    currency: row.currency || 'TRY',
    provider: row.provider,
    status: row.status,
    externalRef: row.external_ref || row.externalRef || null,
    metadata: parseMetadata(row.metadata),
    createdAt: row.created_at || row.createdAt || null,
    updatedAt: row.updated_at || row.updatedAt || null,
  };
}

function buildInClause(values) {
  return values.map(() => '?').join(', ');
}

async function ensureBillingSettingsRow() {
  const existing = await db
    .prepare('SELECT * FROM billing_settings WHERE id = ? LIMIT 1')
    .get('default');

  if (existing) {
    return existing;
  }

  const timestamp = nowIso();
  await db.prepare(
    `INSERT INTO billing_settings (
      id,
      paid_listings_enabled,
      subscription_required_for_commercial,
      individual_listing_fee_enabled,
      featured_listing_fee_enabled,
      individual_listing_fee_amount,
      featured_listing_fee_amount,
      currency,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run('default', 0, 0, 0, 0, '0', '0', 'TRY', timestamp);

  return db.prepare('SELECT * FROM billing_settings WHERE id = ? LIMIT 1').get('default');
}

async function listActiveSubscriptionPlans() {
  const statement = db.prepare(`
    SELECT *
    FROM subscription_plans
    WHERE is_active = 1 OR is_active = TRUE
    ORDER BY monthly_price ASC, name ASC
  `);

  const rows = await statement.all();
  return rows.map(mapSubscriptionPlan);
}

async function listAllSubscriptionPlans() {
  const rows = await db
    .prepare('SELECT * FROM subscription_plans ORDER BY is_active DESC, monthly_price ASC, name ASC')
    .all();
  return rows.map(mapSubscriptionPlan);
}

async function getSubscriptionPlanByCode(code) {
  const row = await db
    .prepare('SELECT * FROM subscription_plans WHERE code = ? LIMIT 1')
    .get(code);
  return mapSubscriptionPlan(row);
}

async function getSubscriptionPlanById(id) {
  const row = await db.prepare('SELECT * FROM subscription_plans WHERE id = ? LIMIT 1').get(id);
  return mapSubscriptionPlan(row);
}

async function upsertSubscriptionPlan(payload) {
  const timestamp = nowIso();
  const current = payload.id
    ? await db.prepare('SELECT * FROM subscription_plans WHERE id = ? LIMIT 1').get(payload.id)
    : await db.prepare('SELECT * FROM subscription_plans WHERE code = ? LIMIT 1').get(payload.code);

  if (current) {
    await db.prepare(
      `UPDATE subscription_plans
       SET name = ?, code = ?, monthly_price = ?, yearly_price = ?, currency = ?,
           max_listings_per_month = ?, max_featured_listings = ?, is_commercial_only = ?,
           is_active = ?, updated_at = ?
       WHERE id = ?`,
    ).run(
      payload.name,
      payload.code,
      String(payload.monthlyPrice),
      payload.yearlyPrice == null ? null : String(payload.yearlyPrice),
      payload.currency || 'TRY',
      toNumber(payload.maxListingsPerMonth, 0),
      toNumber(payload.maxFeaturedListings, 0),
      payload.isCommercialOnly ? 1 : 0,
      payload.isActive === false ? 0 : 1,
      timestamp,
      current.id,
    );

    return getSubscriptionPlanById(current.id);
  }

  const id = payload.id || randomUUID();
  await db.prepare(
    `INSERT INTO subscription_plans (
      id, name, code, monthly_price, yearly_price, currency,
      max_listings_per_month, max_featured_listings, is_commercial_only, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    payload.name,
    payload.code,
    String(payload.monthlyPrice),
    payload.yearlyPrice == null ? null : String(payload.yearlyPrice),
    payload.currency || 'TRY',
    toNumber(payload.maxListingsPerMonth, 0),
    toNumber(payload.maxFeaturedListings, 0),
    payload.isCommercialOnly ? 1 : 0,
    payload.isActive === false ? 0 : 1,
    timestamp,
    timestamp,
  );

  return getSubscriptionPlanById(id);
}

async function getBillingSettings() {
  return mapBillingSettings(await ensureBillingSettingsRow());
}

async function updateBillingSettings(patch) {
  const current = await ensureBillingSettingsRow();
  const next = {
    paid_listings_enabled:
      patch.paidListingsEnabled === undefined
        ? current.paid_listings_enabled
        : patch.paidListingsEnabled
          ? 1
          : 0,
    subscription_required_for_commercial:
      patch.subscriptionRequiredForCommercial === undefined
        ? current.subscription_required_for_commercial
        : patch.subscriptionRequiredForCommercial
          ? 1
          : 0,
    individual_listing_fee_enabled:
      patch.individualListingFeeEnabled === undefined
        ? current.individual_listing_fee_enabled
        : patch.individualListingFeeEnabled
          ? 1
          : 0,
    featured_listing_fee_enabled:
      patch.featuredListingFeeEnabled === undefined
        ? current.featured_listing_fee_enabled
        : patch.featuredListingFeeEnabled
          ? 1
          : 0,
    individual_listing_fee_amount:
      patch.individualListingFeeAmount === undefined
        ? current.individual_listing_fee_amount
        : String(patch.individualListingFeeAmount),
    featured_listing_fee_amount:
      patch.featuredListingFeeAmount === undefined
        ? current.featured_listing_fee_amount
        : String(patch.featuredListingFeeAmount),
    currency: patch.currency || current.currency || 'TRY',
  };

  await db.prepare(
    `UPDATE billing_settings
     SET paid_listings_enabled = ?, subscription_required_for_commercial = ?,
         individual_listing_fee_enabled = ?, featured_listing_fee_enabled = ?,
         individual_listing_fee_amount = ?, featured_listing_fee_amount = ?,
         currency = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    next.paid_listings_enabled,
    next.subscription_required_for_commercial,
    next.individual_listing_fee_enabled,
    next.featured_listing_fee_enabled,
    next.individual_listing_fee_amount,
    next.featured_listing_fee_amount,
    next.currency,
    nowIso(),
    'default',
  );

  return getBillingSettings();
}

async function createPaymentRecord(payload) {
  const id = payload.id || randomUUID();
  const timestamp = nowIso();

  await db.prepare(
    `INSERT INTO payment_records (
      id, user_id, listing_id, type, amount, currency, provider, status, external_ref, metadata, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    payload.userId,
    payload.listingId || null,
    payload.type,
    String(payload.amount),
    payload.currency || 'TRY',
    payload.provider,
    payload.status,
    payload.externalRef || null,
    JSON.stringify(payload.metadata || {}),
    timestamp,
    timestamp,
  );

  return getPaymentRecordById(id);
}

async function updatePaymentRecordById(id, patch) {
  const current = await db.prepare('SELECT * FROM payment_records WHERE id = ? LIMIT 1').get(id);
  if (!current) {
    return null;
  }

  const next = {
    status: patch.status || current.status,
    external_ref: patch.externalRef === undefined ? current.external_ref : patch.externalRef,
    provider: patch.provider || current.provider,
    metadata:
      patch.metadata === undefined
        ? current.metadata
        : JSON.stringify({ ...parseMetadata(current.metadata), ...patch.metadata }),
    amount: patch.amount === undefined ? current.amount : String(patch.amount),
    currency: patch.currency || current.currency,
    listing_id: patch.listingId === undefined ? current.listing_id : patch.listingId,
  };

  await db.prepare(
    `UPDATE payment_records
     SET listing_id = ?, amount = ?, currency = ?, provider = ?, status = ?, external_ref = ?, metadata = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    next.listing_id,
    next.amount,
    next.currency,
    next.provider,
    next.status,
    next.external_ref,
    next.metadata,
    nowIso(),
    id,
  );

  return getPaymentRecordById(id);
}

async function getPaymentRecordById(id) {
  const row = await db.prepare('SELECT * FROM payment_records WHERE id = ? LIMIT 1').get(id);
  return mapPaymentRecord(row);
}

async function getPaymentRecordByExternalRef(externalRef) {
  const row = await db
    .prepare('SELECT * FROM payment_records WHERE external_ref = ? LIMIT 1')
    .get(externalRef);
  return mapPaymentRecord(row);
}

async function listPaymentRecords(limit = 100) {
  const rows = await db
    .prepare('SELECT * FROM payment_records ORDER BY created_at DESC LIMIT ?')
    .all(limit);
  return rows.map(mapPaymentRecord);
}

async function findLatestListingPaymentRecord(userId, listingId, types, statuses = []) {
  const typeList = Array.isArray(types) && types.length ? types : ['listing_fee', 'featured_listing'];
  const typePlaceholders = buildInClause(typeList);
  const params = [userId, listingId, ...typeList];

  let sql = `
    SELECT *
    FROM payment_records
    WHERE user_id = ?
      AND listing_id = ?
      AND type IN (${typePlaceholders})
  `;

  if (statuses.length) {
    sql += ` AND status IN (${buildInClause(statuses)})`;
    params.push(...statuses);
  }

  sql += ' ORDER BY created_at DESC LIMIT 1';
  const row = await db.prepare(sql).get(...params);
  return mapPaymentRecord(row);
}

async function findLatestUserPaymentRecord(userId, types, statuses = []) {
  const typeList = Array.isArray(types) && types.length ? types : ['subscription'];
  const typePlaceholders = buildInClause(typeList);
  const params = [userId, ...typeList];

  let sql = `
    SELECT *
    FROM payment_records
    WHERE user_id = ?
      AND type IN (${typePlaceholders})
  `;

  if (statuses.length) {
    sql += ` AND status IN (${buildInClause(statuses)})`;
    params.push(...statuses);
  }

  sql += ' ORDER BY created_at DESC LIMIT 1';
  const row = await db.prepare(sql).get(...params);
  return mapPaymentRecord(row);
}

async function getLatestUserSubscription(userId) {
  const row = await db
    .prepare(
      `SELECT us.*, sp.name AS plan_name, sp.code AS plan_code, sp.monthly_price AS plan_monthly_price, sp.currency AS plan_currency
       FROM user_subscriptions us
       JOIN subscription_plans sp ON sp.id = us.plan_id
       WHERE us.user_id = ?
       ORDER BY us.created_at DESC
       LIMIT 1`,
    )
    .get(userId);
  return mapUserSubscription(row);
}

async function getActiveUserSubscription(userId) {
  const row = await db
    .prepare(
      `SELECT us.*, sp.name AS plan_name, sp.code AS plan_code, sp.monthly_price AS plan_monthly_price, sp.currency AS plan_currency
       FROM user_subscriptions us
       JOIN subscription_plans sp ON sp.id = us.plan_id
       WHERE us.user_id = ?
         AND us.status IN ('trial', 'active')
       ORDER BY us.created_at DESC
       LIMIT 1`,
    )
    .get(userId);
  return mapUserSubscription(row);
}

async function listUserSubscriptions(limit = 100) {
  const rows = await db
    .prepare(
      `SELECT us.*, sp.name AS plan_name, sp.code AS plan_code, sp.monthly_price AS plan_monthly_price, sp.currency AS plan_currency
       FROM user_subscriptions us
       JOIN subscription_plans sp ON sp.id = us.plan_id
       ORDER BY us.created_at DESC
       LIMIT ?`,
    )
    .all(limit);
  return rows.map(mapUserSubscription);
}

async function createUserSubscription(payload) {
  const id = payload.id || randomUUID();
  const timestamp = nowIso();

  await db.prepare(
    `INSERT INTO user_subscriptions (
      id, user_id, plan_id, status, start_at, end_at, renewal_at,
      payment_provider, payment_status, external_payment_reference, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    payload.userId,
    payload.planId,
    payload.status || 'inactive',
    payload.startAt || null,
    payload.endAt || null,
    payload.renewalAt || null,
    payload.paymentProvider || null,
    payload.paymentStatus || null,
    payload.externalPaymentReference || null,
    timestamp,
    timestamp,
  );

  const row = await db.prepare('SELECT * FROM user_subscriptions WHERE id = ? LIMIT 1').get(id);
  return mapUserSubscription(row);
}

async function updateUserSubscriptionById(id, patch) {
  const current = await db.prepare('SELECT * FROM user_subscriptions WHERE id = ? LIMIT 1').get(id);
  if (!current) {
    return null;
  }

  await db.prepare(
    `UPDATE user_subscriptions
     SET status = ?, start_at = ?, end_at = ?, renewal_at = ?, payment_provider = ?,
         payment_status = ?, external_payment_reference = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    patch.status || current.status,
    patch.startAt === undefined ? current.start_at : patch.startAt,
    patch.endAt === undefined ? current.end_at : patch.endAt,
    patch.renewalAt === undefined ? current.renewal_at : patch.renewalAt,
    patch.paymentProvider === undefined ? current.payment_provider : patch.paymentProvider,
    patch.paymentStatus === undefined ? current.payment_status : patch.paymentStatus,
    patch.externalPaymentReference === undefined
      ? current.external_payment_reference
      : patch.externalPaymentReference,
    nowIso(),
    id,
  );

  const row = await db.prepare('SELECT * FROM user_subscriptions WHERE id = ? LIMIT 1').get(id);
  return mapUserSubscription(row);
}

async function cancelActiveUserSubscriptionsForUser(userId, exceptId = null) {
  if (exceptId) {
    await db.prepare(
      `UPDATE user_subscriptions
       SET status = 'cancelled', updated_at = ?
       WHERE user_id = ? AND status IN ('trial', 'active', 'past_due') AND id != ?`,
    ).run(nowIso(), userId, exceptId);
    return;
  }

  await db.prepare(
    `UPDATE user_subscriptions
     SET status = 'cancelled', updated_at = ?
     WHERE user_id = ? AND status IN ('trial', 'active', 'past_due')`,
  ).run(nowIso(), userId);
}

module.exports = {
  createPaymentRecord,
  createUserSubscription,
  findLatestListingPaymentRecord,
  findLatestUserPaymentRecord,
  getActiveUserSubscription,
  getBillingSettings,
  getLatestUserSubscription,
  getPaymentRecordByExternalRef,
  getPaymentRecordById,
  getSubscriptionPlanByCode,
  getSubscriptionPlanById,
  listActiveSubscriptionPlans,
  listAllSubscriptionPlans,
  listPaymentRecords,
  listUserSubscriptions,
  mapBillingSettings,
  mapPaymentRecord,
  mapSubscriptionPlan,
  mapUserSubscription,
  updateBillingSettings,
  updatePaymentRecordById,
  updateUserSubscriptionById,
  upsertSubscriptionPlan,
  cancelActiveUserSubscriptionsForUser,
};
