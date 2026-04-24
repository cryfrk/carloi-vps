const { randomUUID } = require('node:crypto');

const { db } = require('../../database');
const { decryptText } = require('../../security');

function nowIso() {
  return new Date().toISOString();
}

function parseMetadata(value) {
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

function mapProfile(row) {
  return row
    ? {
        id: row.id,
        userId: row.user_id,
        companyName: row.company_name,
        taxOrIdentityType: row.tax_or_identity_type,
        taxOrIdentityNumber: row.tax_or_identity_number,
        tradeName: row.trade_name,
        mersisNumber: row.mersis_number,
        authorizedPersonName: row.authorized_person_name,
        authorizedPersonTitle: row.authorized_person_title,
        phone: row.phone,
        city: row.city,
        district: row.district,
        address: row.address,
        notes: row.notes,
        status: row.status,
        submittedAt: row.submitted_at || null,
        documentTruthfulnessAcceptedAt: row.document_truthfulness_accepted_at || null,
        additionalVerificationAcknowledgedAt:
          row.additional_verification_acknowledged_at || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    : null;
}

function mapDocument(row) {
  return row
    ? {
        id: row.id,
        userId: row.user_id,
        commercialProfileId: row.commercial_profile_id,
        type: row.type,
        fileUrl: row.file_url,
        originalFileName: row.original_file_name,
        mimeType: row.mime_type,
        fileSize: Number(row.file_size || 0),
        uploadedAt: row.uploaded_at,
        status: row.status,
        reviewedByAdminId: row.reviewed_by_admin_id || null,
        reviewedAt: row.reviewed_at || null,
        rejectReason: row.reject_reason || null,
        verificationMethod: row.verification_method || 'unverified',
        suspiciousFlag: Boolean(row.suspicious_flag),
      }
    : null;
}

function mapUserCommercialState(row) {
  return row
    ? {
        id: row.id,
        accountType: row.account_type || 'individual',
        commercialStatus: row.commercial_status || 'not_applied',
        commercialApprovedAt: row.commercial_approved_at || null,
        commercialRejectedReason: row.commercial_rejected_reason || null,
        commercialReviewedByAdminId: row.commercial_reviewed_by_admin_id || null,
        canCreatePaidListings: Boolean(row.can_create_paid_listings),
        yearlyVehicleSaleCount: Number(row.yearly_vehicle_sale_count || 0),
        yearlyVehicleListingCount: Number(row.yearly_vehicle_listing_count || 0),
        commercialBehaviorFlag: Boolean(row.commercial_behavior_flag),
        riskScore: Number(row.risk_score || 0),
        riskLevel: row.risk_level || 'low',
        fraudFlagCount: Number(row.fraud_flag_count || 0),
      }
    : null;
}

function mapAuditRow(row) {
  return row
    ? {
        id: row.id,
        actorType: row.actor_type,
        actorId: row.actor_id || null,
        targetType: row.target_type,
        targetId: row.target_id || null,
        action: row.action,
        metadata: parseMetadata(row.metadata),
        ipAddress: row.ip_address || null,
        userAgent: row.user_agent || null,
        createdAt: row.created_at,
      }
    : null;
}

async function getUserCommercialState(userId) {
  const row = await db
    .prepare(
      `SELECT id, account_type, commercial_status, commercial_approved_at,
              commercial_rejected_reason, commercial_reviewed_by_admin_id,
              can_create_paid_listings, yearly_vehicle_sale_count, yearly_vehicle_listing_count,
              commercial_behavior_flag, risk_score, risk_level, fraud_flag_count
       FROM users
       WHERE id = ?
       LIMIT 1`,
    )
    .get(userId);

  return mapUserCommercialState(row);
}

async function updateUserCommercialState(userId, patch) {
  const current = await db
    .prepare(
      `SELECT account_type, commercial_status, commercial_approved_at,
              commercial_rejected_reason, commercial_reviewed_by_admin_id,
              can_create_paid_listings, yearly_vehicle_sale_count, yearly_vehicle_listing_count,
              commercial_behavior_flag, risk_score, risk_level, fraud_flag_count
       FROM users
       WHERE id = ?
       LIMIT 1`,
    )
    .get(userId);

  if (!current) {
    return null;
  }

  await db
    .prepare(
      `UPDATE users
       SET account_type = ?,
           commercial_status = ?,
           commercial_approved_at = ?,
           commercial_rejected_reason = ?,
           commercial_reviewed_by_admin_id = ?,
           can_create_paid_listings = ?,
           yearly_vehicle_sale_count = ?,
           yearly_vehicle_listing_count = ?,
           commercial_behavior_flag = ?,
           risk_score = ?,
           risk_level = ?,
           fraud_flag_count = ?,
           updated_at = ?
       WHERE id = ?`,
    )
    .run(
      patch.accountType ?? current.account_type ?? 'individual',
      patch.commercialStatus ?? current.commercial_status ?? 'not_applied',
      patch.commercialApprovedAt === undefined
        ? current.commercial_approved_at || null
        : patch.commercialApprovedAt,
      patch.commercialRejectedReason === undefined
        ? current.commercial_rejected_reason || null
        : patch.commercialRejectedReason,
      patch.commercialReviewedByAdminId === undefined
        ? current.commercial_reviewed_by_admin_id || null
        : patch.commercialReviewedByAdminId,
      patch.canCreatePaidListings === undefined
        ? current.can_create_paid_listings || 0
        : patch.canCreatePaidListings
          ? 1
          : 0,
      patch.yearlyVehicleSaleCount === undefined
        ? current.yearly_vehicle_sale_count || 0
        : patch.yearlyVehicleSaleCount,
      patch.yearlyVehicleListingCount === undefined
        ? current.yearly_vehicle_listing_count || 0
        : patch.yearlyVehicleListingCount,
      patch.commercialBehaviorFlag === undefined
        ? current.commercial_behavior_flag || 0
        : patch.commercialBehaviorFlag
          ? 1
          : 0,
      patch.riskScore === undefined ? current.risk_score || 0 : patch.riskScore,
      patch.riskLevel ?? current.risk_level ?? 'low',
      patch.fraudFlagCount === undefined
        ? current.fraud_flag_count || 0
        : patch.fraudFlagCount,
      nowIso(),
      userId,
    );

  return getUserCommercialState(userId);
}

async function getCommercialProfileByUserId(userId) {
  const row = await db.prepare('SELECT * FROM commercial_profiles WHERE user_id = ? LIMIT 1').get(userId);
  return mapProfile(row);
}

async function getCommercialProfileById(profileId) {
  const row = await db.prepare('SELECT * FROM commercial_profiles WHERE id = ? LIMIT 1').get(profileId);
  return mapProfile(row);
}

async function upsertCommercialProfile(userId, payload) {
  const existing = await getCommercialProfileByUserId(userId);
  const now = nowIso();

  if (existing) {
    await db
      .prepare(
        `UPDATE commercial_profiles
         SET company_name = ?,
             tax_or_identity_type = ?,
             tax_or_identity_number = ?,
             trade_name = ?,
             mersis_number = ?,
             authorized_person_name = ?,
             authorized_person_title = ?,
             phone = ?,
             city = ?,
             district = ?,
             address = ?,
             notes = ?,
             status = ?,
             submitted_at = ?,
             document_truthfulness_accepted_at = ?,
             additional_verification_acknowledged_at = ?,
             updated_at = ?
         WHERE user_id = ?`,
      )
      .run(
        payload.companyName,
        payload.taxOrIdentityType,
        payload.taxOrIdentityNumber,
        payload.tradeName || null,
        payload.mersisNumber || null,
        payload.authorizedPersonName || null,
        payload.authorizedPersonTitle || null,
        payload.phone,
        payload.city,
        payload.district,
        payload.address,
        payload.notes || null,
        payload.status || existing.status || 'draft',
        payload.submittedAt === undefined ? existing.submittedAt : payload.submittedAt,
        payload.documentTruthfulnessAcceptedAt === undefined
          ? existing.documentTruthfulnessAcceptedAt
          : payload.documentTruthfulnessAcceptedAt,
        payload.additionalVerificationAcknowledgedAt === undefined
          ? existing.additionalVerificationAcknowledgedAt
          : payload.additionalVerificationAcknowledgedAt,
        now,
        userId,
      );

    return getCommercialProfileByUserId(userId);
  }

  const id = randomUUID();
  await db
    .prepare(
      `INSERT INTO commercial_profiles (
        id, user_id, company_name, tax_or_identity_type, tax_or_identity_number,
        trade_name, mersis_number, authorized_person_name, authorized_person_title,
        phone, city, district, address, notes, status, submitted_at,
        document_truthfulness_accepted_at, additional_verification_acknowledged_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      userId,
      payload.companyName,
      payload.taxOrIdentityType,
      payload.taxOrIdentityNumber,
      payload.tradeName || null,
      payload.mersisNumber || null,
      payload.authorizedPersonName || null,
      payload.authorizedPersonTitle || null,
      payload.phone,
      payload.city,
      payload.district,
      payload.address,
      payload.notes || null,
      payload.status || 'draft',
      payload.submittedAt || null,
      payload.documentTruthfulnessAcceptedAt || null,
      payload.additionalVerificationAcknowledgedAt || null,
      now,
      now,
    );

  return getCommercialProfileByUserId(userId);
}

async function updateCommercialProfileById(profileId, patch) {
  const existing = await getCommercialProfileById(profileId);
  if (!existing) {
    return null;
  }

  return upsertCommercialProfile(existing.userId, {
    ...existing,
    ...patch,
  });
}

async function listCommercialDocumentsByProfileId(profileId) {
  const rows = await db
    .prepare(
      `SELECT *
       FROM commercial_documents
       WHERE commercial_profile_id = ?
       ORDER BY uploaded_at DESC`,
    )
    .all(profileId);

  return rows.map(mapDocument);
}

async function listCommercialDocumentsByUserId(userId) {
  const rows = await db
    .prepare(
      `SELECT *
       FROM commercial_documents
       WHERE user_id = ?
       ORDER BY uploaded_at DESC`,
    )
    .all(userId);

  return rows.map(mapDocument);
}

async function getCommercialDocumentById(documentId) {
  const row = await db
    .prepare('SELECT * FROM commercial_documents WHERE id = ? LIMIT 1')
    .get(documentId);

  return mapDocument(row);
}

async function addCommercialDocument(payload) {
  const id = randomUUID();
  await db
    .prepare(
      `INSERT INTO commercial_documents (
        id, user_id, commercial_profile_id, type, file_url, original_file_name, mime_type,
        file_size, uploaded_at, status, reviewed_by_admin_id, reviewed_at, reject_reason,
        verification_method, suspicious_flag
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      payload.userId,
      payload.commercialProfileId,
      payload.type,
      payload.fileUrl,
      payload.originalFileName,
      payload.mimeType,
      payload.fileSize,
      payload.uploadedAt || nowIso(),
      payload.status || 'uploaded',
      payload.reviewedByAdminId || null,
      payload.reviewedAt || null,
      payload.rejectReason || null,
      payload.verificationMethod || 'unverified',
      payload.suspiciousFlag ? 1 : 0,
    );

  return getCommercialDocumentById(id);
}

async function findDuplicateCommercialDocument(profileId, payload) {
  const row = await db
    .prepare(
      `SELECT *
       FROM commercial_documents
       WHERE commercial_profile_id = ?
         AND type = ?
         AND (
           file_url = ?
           OR (
             original_file_name = ?
             AND mime_type = ?
             AND file_size = ?
           )
         )
       ORDER BY uploaded_at DESC
       LIMIT 1`,
    )
    .get(
      profileId,
      payload.type,
      payload.fileUrl,
      payload.originalFileName,
      payload.mimeType,
      payload.fileSize,
    );

  return mapDocument(row);
}

async function updateCommercialDocumentById(documentId, patch) {
  const existing = await getCommercialDocumentById(documentId);
  if (!existing) {
    return null;
  }

  await db
    .prepare(
      `UPDATE commercial_documents
       SET status = ?,
           reviewed_by_admin_id = ?,
           reviewed_at = ?,
           reject_reason = ?,
           verification_method = ?,
           suspicious_flag = ?
       WHERE id = ?`,
    )
    .run(
      patch.status ?? existing.status,
      patch.reviewedByAdminId === undefined
        ? existing.reviewedByAdminId
        : patch.reviewedByAdminId,
      patch.reviewedAt === undefined ? existing.reviewedAt : patch.reviewedAt,
      patch.rejectReason === undefined ? existing.rejectReason : patch.rejectReason,
      patch.verificationMethod ?? existing.verificationMethod,
      patch.suspiciousFlag === undefined
        ? existing.suspiciousFlag
          ? 1
          : 0
        : patch.suspiciousFlag
          ? 1
          : 0,
      documentId,
    );

  return getCommercialDocumentById(documentId);
}

async function bulkUpdateDocumentsByProfileId(profileId, allowedCurrentStatuses, patch) {
  const documents = await listCommercialDocumentsByProfileId(profileId);
  const nextDocuments = [];

  for (const document of documents) {
    if (allowedCurrentStatuses && !allowedCurrentStatuses.includes(document.status)) {
      nextDocuments.push(document);
      continue;
    }

    nextDocuments.push(
      await updateCommercialDocumentById(document.id, {
        ...patch,
        reviewedAt:
          patch.reviewedAt === undefined && patch.status && patch.status !== document.status
            ? nowIso()
            : patch.reviewedAt,
      }),
    );
  }

  return nextDocuments;
}

async function countRejectedDocumentsForUser(userId, type) {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM commercial_documents
       WHERE user_id = ?
         AND (? IS NULL OR type = ?)
         AND status = 'rejected'`,
    )
    .get(userId, type || null, type || null);

  return Number(row?.count || 0);
}

async function countCommercialProfileAction(profileId, action) {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM audit_logs
       WHERE target_type = 'commercial_profile'
         AND target_id = ?
         AND action = ?`,
    )
    .get(profileId, action);

  return Number(row?.count || 0);
}

async function listCommercialAdminNotes(profileId, limit = 50) {
  const rows = await db
    .prepare(
      `SELECT *
       FROM audit_logs
       WHERE target_type = 'commercial_profile'
         AND target_id = ?
         AND action = 'admin.commercial_note_added'
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .all(profileId, limit);

  return rows.map(mapAuditRow);
}

async function listCommercialAuditHistory(profileId, limit = 120) {
  const rows = await db
    .prepare(
      `SELECT *
       FROM audit_logs
       WHERE (
         target_type = 'commercial_profile'
         AND target_id = ?
       )
       OR (
         target_type = 'commercial_document'
         AND target_id IN (
           SELECT id FROM commercial_documents WHERE commercial_profile_id = ?
         )
       )
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .all(profileId, profileId, limit);

  return rows.map(mapAuditRow);
}

async function listCommercialProfilesByStatus(status) {
  const rows = await db
    .prepare(
      `SELECT cp.*, u.name AS user_name, u.email AS user_email, u.handle AS user_handle,
              u.account_type, u.commercial_status, u.risk_level,
              (
                SELECT COUNT(*) FROM commercial_documents cd
                WHERE cd.commercial_profile_id = cp.id
              ) AS document_count,
              (
                SELECT COUNT(*) FROM commercial_documents cd
                WHERE cd.commercial_profile_id = cp.id AND cd.suspicious_flag = 1
              ) AS suspicious_document_count
       FROM commercial_profiles cp
       JOIN users u ON u.id = cp.user_id
       WHERE (? IS NULL OR cp.status = ?)
       ORDER BY cp.updated_at DESC`,
    )
    .all(status || null, status || null);

  return rows.map((row) => ({
    profile: mapProfile(row),
    user: {
      id: row.user_id,
      name: row.user_name,
      email: decryptText(row.user_email, row.user_email || ''),
      handle: row.user_handle,
      accountType: row.account_type || 'individual',
      commercialStatus: row.commercial_status || 'not_applied',
      riskLevel: row.risk_level || 'low',
    },
    documentCount: Number(row.document_count || 0),
    suspiciousDocumentCount: Number(row.suspicious_document_count || 0),
  }));
}

async function getCommercialReviewDetail(profileId) {
  const row = await db
    .prepare(
      `SELECT cp.*, u.name AS user_name, u.email AS user_email, u.handle AS user_handle,
              u.account_type, u.commercial_status, u.risk_level,
              u.commercial_rejected_reason, u.commercial_reviewed_by_admin_id, u.commercial_approved_at,
              u.can_create_paid_listings
       FROM commercial_profiles cp
       JOIN users u ON u.id = cp.user_id
       WHERE cp.id = ?
       LIMIT 1`,
    )
    .get(profileId);

  if (!row) {
    return null;
  }

  return {
    profile: mapProfile(row),
    user: {
      id: row.user_id,
      name: row.user_name,
      email: decryptText(row.user_email, row.user_email || ''),
      handle: row.user_handle,
      accountType: row.account_type || 'individual',
      commercialStatus: row.commercial_status || 'not_applied',
      riskLevel: row.risk_level || 'low',
      commercialRejectedReason: row.commercial_rejected_reason || null,
      commercialReviewedByAdminId: row.commercial_reviewed_by_admin_id || null,
      commercialApprovedAt: row.commercial_approved_at || null,
      canCreatePaidListings: Boolean(row.can_create_paid_listings),
    },
    documents: await listCommercialDocumentsByProfileId(profileId),
    adminNotes: await listCommercialAdminNotes(profileId),
    history: await listCommercialAuditHistory(profileId),
  };
}

module.exports = {
  addCommercialDocument,
  bulkUpdateDocumentsByProfileId,
  countCommercialProfileAction,
  countRejectedDocumentsForUser,
  findDuplicateCommercialDocument,
  getCommercialDocumentById,
  getCommercialProfileById,
  getCommercialProfileByUserId,
  getCommercialReviewDetail,
  getUserCommercialState,
  listCommercialAdminNotes,
  listCommercialAuditHistory,
  listCommercialDocumentsByProfileId,
  listCommercialDocumentsByUserId,
  listCommercialProfilesByStatus,
  mapDocument,
  mapProfile,
  updateCommercialDocumentById,
  updateCommercialProfileById,
  updateUserCommercialState,
  upsertCommercialProfile,
};
