const { db, isPostgresMode, toDbBoolean } = require('../../database');
const { decryptJson, decryptText } = require('../../security');
const { canViewMessageContent } = require('./access.service');
const { getFeatureFlagSnapshot, isFeatureEnabled } = require('../feature-flags/config');
const { listPendingCommercialReviews } = require('../commercial/commercial.service');
const { listFlaggableListings } = require('../compliance/compliance.repository');
const { getRiskOverview, listOpenRiskFlags } = require('../audit-risk/risk.service');
const { getBillingSnapshot } = require('../billing/subscription.service');

function jsonParse(value, fallback) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function summarizeListingJson(value) {
  const listing = jsonParse(value, null);
  return {
    title: listing?.title || 'Ilan',
    price: listing?.price || 'Belirtilmedi',
    location: listing?.location || 'Belirtilmedi',
    isSold: Boolean(listing?.isSold),
  };
}

const userAdminRolesTimestampColumn = isPostgresMode() ? 'granted_at' : 'created_at';

async function listAdminRoleKeysForUser(userId) {
  if (!userId) {
    return [];
  }

  const rows = await db
    .prepare(
      `SELECT role_key
       FROM user_admin_roles
       WHERE user_id = ?
       ORDER BY ${userAdminRolesTimestampColumn} ASC`,
    )
    .all(userId);

  return rows.map((row) => row.role_key).filter(Boolean);
}

async function getAdminDashboardSnapshot() {
  const [
    totalUsersRow,
    activeUsersRow,
    activeListingsRow,
    activeSubscriptionsRow,
    failedPaymentsRow,
  ] = await Promise.all([
    db.prepare('SELECT COUNT(*) AS count FROM users').get(),
    db
      .prepare(
        `SELECT COUNT(DISTINCT author_user_id) AS count
         FROM posts
         WHERE created_at >= ?`,
      )
      .get(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    db
      .prepare(
        `SELECT COUNT(*) AS count
         FROM listing_compliance
         WHERE listing_compliance_status = 'published'`,
      )
      .get(),
    db
      .prepare(
        `SELECT COUNT(*) AS count
         FROM user_subscriptions
         WHERE status = 'active'`,
      )
      .get(),
    db
      .prepare(
        `SELECT COUNT(*) AS count
         FROM payment_records
         WHERE status IN ('failed', 'cancelled')`,
      )
      .get(),
  ]);

  const [pendingCommercial, listings, riskOverview, openRiskFlags, billing] = await Promise.all([
    listPendingCommercialReviews(),
    listFlaggableListings(),
    getRiskOverview(),
    listOpenRiskFlags(20),
    getBillingSnapshot(null),
  ]);

  return {
    featureFlags: getFeatureFlagSnapshot(),
    totalUsers: Number(totalUsersRow?.count || 0),
    activeUsers: Number(activeUsersRow?.count || 0),
    activeListings: Number(activeListingsRow?.count || 0),
    activeSubscriptions: Number(activeSubscriptionsRow?.count || 0),
    failedPayments: Number(failedPaymentsRow?.count || 0),
    pendingCommercialCount: pendingCommercial.length,
    listingComplianceQueueCount: listings.filter((item) => item.listing_compliance_status !== 'published').length,
    riskOverview,
    openRiskFlags,
    billing,
  };
}

async function listAdminUsersSummary({
  limit = 100,
  query = '',
  accountType,
  commercialStatus,
  riskLevel,
  commercialBehaviorOnly = false,
} = {}) {
  const normalizedQuery = String(query || '').trim();
  const normalizedAccountType = String(accountType || '').trim();
  const normalizedCommercialStatus = String(commercialStatus || '').trim();
  const normalizedRiskLevel = String(riskLevel || '').trim();
  const conditions = [];
  const params = [];

  if (normalizedQuery) {
    conditions.push('(name LIKE ? OR handle LIKE ?)');
    params.push(`%${normalizedQuery}%`, `%${normalizedQuery}%`);
  }

  if (normalizedAccountType) {
    conditions.push('account_type = ?');
    params.push(normalizedAccountType);
  }

  if (normalizedCommercialStatus) {
    conditions.push('commercial_status = ?');
    params.push(normalizedCommercialStatus);
  }

  if (normalizedRiskLevel) {
    conditions.push('risk_level = ?');
    params.push(normalizedRiskLevel);
  }

  if (commercialBehaviorOnly) {
    conditions.push('commercial_behavior_flag = ?');
    params.push(toDbBoolean(true));
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = await db
    .prepare(
      `SELECT id, name, handle, verified, account_type, commercial_status, risk_level,
              yearly_vehicle_listing_count, yearly_vehicle_sale_count, commercial_behavior_flag,
              subscription_status, fraud_flag_count, created_at, updated_at
       FROM users
       ${whereClause}
       ORDER BY updated_at DESC
       LIMIT ?`,
    )
    .all(...params, limit);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    handle: row.handle,
    verified: Boolean(row.verified),
    accountType: row.account_type || 'individual',
    commercialStatus: row.commercial_status || 'not_applied',
    riskLevel: row.risk_level || 'low',
    yearlyVehicleListingCount: Number(row.yearly_vehicle_listing_count || 0),
    yearlyVehicleSaleCount: Number(row.yearly_vehicle_sale_count || 0),
    commercialBehaviorFlag: Boolean(row.commercial_behavior_flag),
    subscriptionStatus: row.subscription_status || 'inactive',
    fraudFlagCount: Number(row.fraud_flag_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

async function getAdminUserDetail(userId, { includePaymentInternals = false } = {}) {
  const user = await db
    .prepare(
      `SELECT id, name, handle, bio, email, phone, verified, account_type, commercial_status,
              commercial_approved_at, commercial_rejected_reason, commercial_reviewed_by_admin_id,
              yearly_vehicle_sale_count, yearly_vehicle_listing_count, commercial_behavior_flag,
              risk_score, risk_level, can_create_paid_listings, subscription_status,
              subscription_plan_id, last_login_ip, last_known_device_fingerprint,
              fraud_flag_count, created_at, updated_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
    )
    .get(userId);

  if (!user) {
    return null;
  }

  const [consents, riskFlags, auditTrail, listings, payments, commercialProfile, adminRoles] =
    await Promise.all([
      db
        .prepare(
          `SELECT consent_type, version, accepted_at, source_screen
           FROM user_consents
           WHERE user_id = ?
           ORDER BY accepted_at DESC`,
        )
        .all(userId),
      db
        .prepare(
          `SELECT id, type, severity, source, status, notes, created_at, related_listing_id
           FROM risk_flags
           WHERE user_id = ?
           ORDER BY created_at DESC
           LIMIT 50`,
        )
        .all(userId),
      db
        .prepare(
          `SELECT id, actor_type, actor_id, target_type, target_id, action, metadata, created_at
           FROM audit_logs
           WHERE actor_id = ? OR target_id = ?
           ORDER BY created_at DESC
           LIMIT 25`,
        )
        .all(userId, userId),
      db
        .prepare(
          `SELECT p.id, p.listing_json, p.created_at, lc.listing_compliance_status, lc.risk_level,
                  lc.authorization_status, lc.billing_status
           FROM posts p
           LEFT JOIN listing_compliance lc ON lc.post_id = p.id
           WHERE p.author_user_id = ?
             AND p.type = 'listing'
           ORDER BY p.created_at DESC
           LIMIT 20`,
        )
        .all(userId),
      db
        .prepare(
          `SELECT id, type, amount, currency, provider, status, external_ref, created_at, metadata
           FROM payment_records
           WHERE user_id = ?
           ORDER BY created_at DESC
           LIMIT 20`,
        )
        .all(userId),
      db
        .prepare(
          `SELECT id, company_name, status, city, district, submitted_at, updated_at
           FROM commercial_profiles
           WHERE user_id = ?
           LIMIT 1`,
        )
        .get(userId),
      db
        .prepare(
          `SELECT role_key, ${userAdminRolesTimestampColumn} AS created_at
           FROM user_admin_roles
           WHERE user_id = ?
           ORDER BY ${userAdminRolesTimestampColumn} DESC`,
        )
        .all(userId),
    ]);

  const paymentSummary = {
    totalCount: payments.length,
    paidCount: payments.filter((item) => ['paid', 'success'].includes(item.status)).length,
    failedCount: payments.filter((item) => item.status === 'failed').length,
    latestAt: payments[0]?.created_at || null,
    items: payments.map((payment) => ({
      id: payment.id,
      type: payment.type,
      status: payment.status,
      amount: includePaymentInternals ? payment.amount : undefined,
      currency: includePaymentInternals ? payment.currency : undefined,
      provider: includePaymentInternals ? payment.provider : undefined,
      externalRef: includePaymentInternals ? payment.external_ref || null : undefined,
      metadata: includePaymentInternals ? jsonParse(payment.metadata, {}) : undefined,
      createdAt: payment.created_at,
    })),
  };

  return {
    id: user.id,
    name: user.name,
    handle: user.handle,
    bio: user.bio || '',
    verified: Boolean(user.verified),
    accountType: user.account_type || 'individual',
    commercialStatus: user.commercial_status || 'not_applied',
    commercialApprovedAt: user.commercial_approved_at || null,
    commercialRejectedReason: user.commercial_rejected_reason || null,
    commercialReviewedByAdminId: user.commercial_reviewed_by_admin_id || null,
    yearlyVehicleSaleCount: Number(user.yearly_vehicle_sale_count || 0),
    yearlyVehicleListingCount: Number(user.yearly_vehicle_listing_count || 0),
    commercialBehaviorFlag: Boolean(user.commercial_behavior_flag),
    riskScore: Number(user.risk_score || 0),
    riskLevel: user.risk_level || 'low',
    canCreatePaidListings: Boolean(user.can_create_paid_listings),
    subscriptionStatus: user.subscription_status || 'inactive',
    subscriptionPlanId: user.subscription_plan_id || null,
    lastLoginIp: user.last_login_ip || null,
    lastKnownDeviceFingerprint: user.last_known_device_fingerprint || null,
    fraudFlagCount: Number(user.fraud_flag_count || 0),
    email: decryptText(user.email, ''),
    phone: decryptText(user.phone, ''),
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    consents: consents.map((consent) => ({
      consentType: consent.consent_type,
      version: consent.version,
      acceptedAt: consent.accepted_at,
      sourceScreen: consent.source_screen,
    })),
    riskFlags: riskFlags.map((flag) => ({
      id: flag.id,
      type: flag.type,
      severity: flag.severity,
      source: flag.source,
      status: flag.status,
      notes: flag.notes || null,
      relatedListingId: flag.related_listing_id || null,
      createdAt: flag.created_at,
    })),
    auditSummary: auditTrail.map((entry) => ({
      id: entry.id,
      actorType: entry.actor_type,
      actorId: entry.actor_id || null,
      targetType: entry.target_type,
      targetId: entry.target_id || null,
      action: entry.action,
      metadata: jsonParse(entry.metadata, {}),
      createdAt: entry.created_at,
    })),
    listingSummary: listings.map((listing) => {
      const summary = summarizeListingJson(listing.listing_json);
      return {
        id: listing.id,
        title: summary.title,
        price: summary.price,
        location: summary.location,
        isSold: summary.isSold,
        listingComplianceStatus: listing.listing_compliance_status || 'draft',
        authorizationStatus: listing.authorization_status || 'not_required',
        riskLevel: listing.risk_level || 'low',
        billingStatus: listing.billing_status || 'not_required',
        createdAt: listing.created_at,
      };
    }),
    paymentSummary,
    commercialProfile: commercialProfile
      ? {
          id: commercialProfile.id,
          companyName: commercialProfile.company_name,
          status: commercialProfile.status,
          city: commercialProfile.city,
          district: commercialProfile.district,
          submittedAt: commercialProfile.submitted_at || null,
          updatedAt: commercialProfile.updated_at,
        }
      : null,
    adminRoles: adminRoles.map((row) => ({
      roleKey: row.role_key,
      assignedAt: row.created_at,
    })),
  };
}

function mapAdminListingRow(row, openRiskByListingId) {
  const summary = summarizeListingJson(row.listing_json);
  const openRiskCount = openRiskByListingId.get(row.id) || 0;
  const suspiciousFlag =
    Boolean(row.duplicate_plate_flag) ||
    Boolean(row.abnormal_price_flag) ||
    Boolean(row.spam_content_flag) ||
    openRiskCount > 0 ||
    ['medium', 'high'].includes(row.risk_level || '');

  return {
    id: row.id,
    sellerUserId: row.author_user_id,
    sellerName: row.seller_name,
    sellerHandle: row.seller_handle,
    title: summary.title,
    price: summary.price,
    location: summary.location,
    plateNumber: row.plate_number || null,
    listingComplianceStatus: row.listing_compliance_status || 'draft',
    authorizationStatus: row.authorization_status || 'not_required',
    eidsStatus: row.eids_status || 'not_started',
    riskLevel: row.risk_level || 'low',
    riskScore: Number(row.risk_score || 0),
    duplicatePlateFlag: Boolean(row.duplicate_plate_flag),
    abnormalPriceFlag: Boolean(row.abnormal_price_flag),
    spamContentFlag: Boolean(row.spam_content_flag),
    reviewRequiredReason: row.review_required_reason || null,
    suspiciousFlag,
    openRiskCount,
    createdAt: row.created_at,
  };
}

async function listAdminListingsSummary({
  limit = 100,
  status,
  suspiciousOnly = false,
  riskLevel,
  duplicatePlateOnly = false,
  abnormalPriceOnly = false,
  query = '',
} = {}) {
  const normalizedStatus = String(status || '').trim();
  const normalizedRiskLevel = String(riskLevel || '').trim();
  const normalizedQuery = String(query || '').trim();
  const conditions = [`p.type = 'listing'`];
  const params = [];

  if (normalizedStatus) {
    conditions.push(`COALESCE(lc.listing_compliance_status, 'draft') = ?`);
    params.push(normalizedStatus);
  }

  if (normalizedRiskLevel) {
    conditions.push(`COALESCE(lc.risk_level, 'low') = ?`);
    params.push(normalizedRiskLevel);
  }

  if (duplicatePlateOnly) {
    conditions.push(`COALESCE(lc.duplicate_plate_flag, ?) = ?`);
    params.push(toDbBoolean(false), toDbBoolean(true));
  }

  if (abnormalPriceOnly) {
    conditions.push(`COALESCE(lc.abnormal_price_flag, ?) = ?`);
    params.push(toDbBoolean(false), toDbBoolean(true));
  }

  if (normalizedQuery) {
    conditions.push(
      `(p.listing_json LIKE ? OR u.name LIKE ? OR u.handle LIKE ? OR COALESCE(lc.plate_number, '') LIKE ?)`,
    );
    params.push(
      `%${normalizedQuery}%`,
      `%${normalizedQuery}%`,
      `%${normalizedQuery}%`,
      `%${normalizedQuery}%`,
    );
  }

  const rows = await db
    .prepare(
      `SELECT p.id, p.author_user_id, p.listing_json, p.created_at, u.name AS seller_name, u.handle AS seller_handle,
              lc.listing_compliance_status, lc.authorization_status, lc.eids_status, lc.risk_level,
              lc.risk_score, lc.duplicate_plate_flag, lc.abnormal_price_flag, lc.spam_content_flag,
              lc.review_required_reason, lc.plate_number
       FROM posts p
       JOIN users u ON u.id = p.author_user_id
       LEFT JOIN listing_compliance lc ON lc.post_id = p.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY p.created_at DESC
       LIMIT ?`,
    )
    .all(...params, limit);

  const riskRows = await db
    .prepare(
      `SELECT related_listing_id, COUNT(*) AS open_count
       FROM risk_flags
       WHERE related_listing_id IS NOT NULL
         AND status IN ('open', 'confirmed')
       GROUP BY related_listing_id`,
    )
    .all();

  const openRiskByListingId = new Map(
    riskRows.map((row) => [row.related_listing_id, Number(row.open_count || 0)]),
  );

  const mapped = rows.map((row) => mapAdminListingRow(row, openRiskByListingId));

  return suspiciousOnly ? mapped.filter((item) => item.suspiciousFlag) : mapped;
}

async function updateAdminListingModeration(postId, action, patch = {}) {
  const post = await db
    .prepare(
      `SELECT p.id, p.listing_json, lc.listing_compliance_status, lc.risk_level
       FROM posts p
       LEFT JOIN listing_compliance lc ON lc.post_id = p.id
       WHERE p.id = ?
         AND p.type = 'listing'
       LIMIT 1`,
    )
    .get(postId);

  if (!post) {
    return null;
  }

  const currentStatus = post.listing_compliance_status || 'draft';
  const nextStatus =
    action === 'suspend'
      ? 'suspended'
      : action === 'reject'
        ? 'rejected'
        : ['medium', 'high'].includes(post.risk_level || '')
          ? 'submitted'
          : 'published';

  const timestamp = new Date().toISOString();
  const existing = await db
    .prepare('SELECT post_id FROM listing_compliance WHERE post_id = ? LIMIT 1')
    .get(postId);

  if (existing) {
    await db
      .prepare(
        `UPDATE listing_compliance
         SET listing_compliance_status = ?,
             review_required_reason = ?,
             reviewed_by_admin_id = ?,
             reviewed_at = ?,
             updated_at = ?
         WHERE post_id = ?`,
      )
      .run(
        nextStatus,
        patch.reason || null,
        patch.adminId || null,
        timestamp,
        timestamp,
        postId,
      );
  } else {
    await db
      .prepare(
        `INSERT INTO listing_compliance (
          post_id, listing_compliance_status, review_required_reason, reviewed_by_admin_id,
          reviewed_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        postId,
        nextStatus,
        patch.reason || null,
        patch.adminId || null,
        timestamp,
        timestamp,
        timestamp,
      );
  }

  const riskRows = await db
    .prepare(
      `SELECT related_listing_id, COUNT(*) AS open_count
       FROM risk_flags
       WHERE related_listing_id = ?
         AND status IN ('open', 'confirmed')
       GROUP BY related_listing_id`,
    )
    .all(postId);
  const openRiskByListingId = new Map(
    riskRows.map((row) => [row.related_listing_id, Number(row.open_count || 0)]),
  );
  const listingRow = await db
    .prepare(
      `SELECT p.id, p.author_user_id, p.listing_json, p.created_at, u.name AS seller_name, u.handle AS seller_handle,
              lc.listing_compliance_status, lc.authorization_status, lc.eids_status, lc.risk_level,
              lc.risk_score, lc.duplicate_plate_flag, lc.abnormal_price_flag, lc.spam_content_flag,
              lc.review_required_reason, lc.plate_number
       FROM posts p
       JOIN users u ON u.id = p.author_user_id
       LEFT JOIN listing_compliance lc ON lc.post_id = p.id
       WHERE p.id = ?
         AND p.type = 'listing'
       LIMIT 1`,
    )
    .get(postId);

  return {
    previousStatus: currentStatus,
    nextStatus,
    listing: listingRow ? mapAdminListingRow(listingRow, openRiskByListingId) : null,
  };
}

async function listAdminMessagesSummary({
  limit = 40,
  includeContent = false,
  roleKeys = [],
} = {}) {
  const rows = await db
    .prepare(
      `SELECT c.id, c.type, c.name, c.handle, c.context_post_id, c.buyer_user_id, c.seller_user_id,
              c.created_at, COUNT(DISTINCT cp.user_id) AS participant_count,
              COUNT(DISTINCT m.id) AS message_count,
              MAX(m.created_at) AS last_message_at
       FROM conversations c
       LEFT JOIN conversation_participants cp ON cp.conversation_id = c.id
       LEFT JOIN messages m ON m.conversation_id = c.id
       GROUP BY c.id
       ORDER BY COALESCE(MAX(m.created_at), c.created_at) DESC
       LIMIT ?`,
    )
    .all(limit);

  const canIncludeContent = includeContent && canViewMessageContent(roleKeys);
  const listingTitleRows = await db
    .prepare(
      `SELECT id, listing_json
       FROM posts
       WHERE type = 'listing'`,
    )
    .all();
  const listingTitles = new Map(
    listingTitleRows.map((row) => [row.id, summarizeListingJson(row.listing_json).title]),
  );

  const conversations = [];
  for (const row of rows) {
    const participants = await db
      .prepare(
        `SELECT u.id, u.name, u.handle
         FROM conversation_participants cp
         JOIN users u ON u.id = cp.user_id
         WHERE cp.conversation_id = ?
         ORDER BY u.name ASC`,
      )
      .all(row.id);

    const conversation = {
      id: row.id,
      type: row.type,
      name: row.name,
      handle: row.handle,
      contextPostId: row.context_post_id || null,
      listingTitle: row.context_post_id ? listingTitles.get(row.context_post_id) || null : null,
      participantCount: Number(row.participant_count || 0),
      messageCount: Number(row.message_count || 0),
      lastMessageAt: row.last_message_at || row.created_at,
      buyerUserId: row.buyer_user_id || null,
      sellerUserId: row.seller_user_id || null,
      participants: participants.map((participant) => ({
        id: participant.id,
        name: participant.name,
        handle: participant.handle,
      })),
      messages: undefined,
    };

    if (canIncludeContent) {
      const messages = await db
        .prepare(
          `SELECT m.id, m.text, m.attachments_json, m.created_at, m.edited_at, m.deleted_for_everyone_at,
                  u.id AS sender_id, u.name AS sender_name, u.handle AS sender_handle
           FROM messages m
           JOIN users u ON u.id = m.sender_user_id
           WHERE m.conversation_id = ?
           ORDER BY m.created_at ASC
           LIMIT 120`,
        )
        .all(row.id);

      conversation.messages = messages.map((message) => ({
        id: message.id,
        senderId: message.sender_id,
        senderName: message.sender_name,
        senderHandle: message.sender_handle,
        createdAt: message.created_at,
        editedAt: message.edited_at || null,
        deletedForEveryoneAt: message.deleted_for_everyone_at || null,
        text: message.deleted_for_everyone_at ? null : decryptText(message.text, ''),
        attachments: message.deleted_for_everyone_at
          ? []
          : decryptJson(message.attachments_json, jsonParse(message.attachments_json, [])),
      }));
    }

    conversations.push(conversation);
  }

  return {
    viewer: {
      roleKeys,
      canViewContent: canViewMessageContent(roleKeys),
      canExportEvidence:
        isFeatureEnabled('enableAdminEvidenceExports') && canViewMessageContent(roleKeys),
    },
    conversations,
  };
}

async function exportAdminMessageEvidence(conversationId) {
  const baseRow = await db
    .prepare(
      `SELECT c.id, c.type, c.name, c.handle, c.context_post_id, c.buyer_user_id, c.seller_user_id,
              c.created_at, COUNT(DISTINCT cp.user_id) AS participant_count,
              COUNT(DISTINCT m.id) AS message_count,
              MAX(m.created_at) AS last_message_at
       FROM conversations c
       LEFT JOIN conversation_participants cp ON cp.conversation_id = c.id
       LEFT JOIN messages m ON m.conversation_id = c.id
       WHERE c.id = ?
       GROUP BY c.id
       LIMIT 1`,
    )
    .get(conversationId);

  if (!baseRow) {
    return null;
  }

  const participants = await db
    .prepare(
      `SELECT u.id, u.name, u.handle
       FROM conversation_participants cp
       JOIN users u ON u.id = cp.user_id
       WHERE cp.conversation_id = ?
       ORDER BY u.name ASC`,
    )
    .all(conversationId);
  const messages = await db
    .prepare(
      `SELECT m.id, m.text, m.attachments_json, m.created_at, m.edited_at, m.deleted_for_everyone_at,
              u.id AS sender_id, u.name AS sender_name, u.handle AS sender_handle
       FROM messages m
       JOIN users u ON u.id = m.sender_user_id
       WHERE m.conversation_id = ?
       ORDER BY m.created_at ASC`,
    )
    .all(conversationId);

  return {
    exportedAt: new Date().toISOString(),
    conversation: {
      id: baseRow.id,
      type: baseRow.type,
      name: baseRow.name,
      handle: baseRow.handle,
      contextPostId: baseRow.context_post_id || null,
      participantCount: Number(baseRow.participant_count || 0),
      messageCount: Number(baseRow.message_count || 0),
      lastMessageAt: baseRow.last_message_at || baseRow.created_at,
      buyerUserId: baseRow.buyer_user_id || null,
      sellerUserId: baseRow.seller_user_id || null,
      participants: participants.map((participant) => ({
        id: participant.id,
        name: participant.name,
        handle: participant.handle,
      })),
      messages: messages.map((message) => ({
        id: message.id,
        senderId: message.sender_id,
        senderName: message.sender_name,
        senderHandle: message.sender_handle,
        createdAt: message.created_at,
        editedAt: message.edited_at || null,
        deletedForEveryoneAt: message.deleted_for_everyone_at || null,
        text: message.deleted_for_everyone_at ? null : decryptText(message.text, ''),
        attachments: message.deleted_for_everyone_at
          ? []
          : decryptJson(message.attachments_json, jsonParse(message.attachments_json, [])),
      })),
    },
  };
}

module.exports = {
  getAdminDashboardSnapshot,
  exportAdminMessageEvidence,
  getAdminUserDetail,
  listAdminListingsSummary,
  listAdminMessagesSummary,
  listAdminRoleKeysForUser,
  listAdminUsersSummary,
  updateAdminListingModeration,
};
