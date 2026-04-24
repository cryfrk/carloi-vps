const { randomUUID } = require('node:crypto');

const { db } = require('../../database');

async function createRiskFlag(payload) {
  const statement = db.prepare(`
    INSERT INTO risk_flags (
      id, user_id, related_listing_id, type, severity, source, status, notes, created_at, reviewed_at, reviewed_by_admin_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const id = randomUUID();
  await statement.run(
    id,
    payload.userId,
    payload.relatedListingId || null,
    payload.type,
    payload.severity,
    payload.source,
    payload.status || 'open',
    payload.notes || null,
    payload.createdAt || new Date().toISOString(),
    payload.reviewedAt || null,
    payload.reviewedByAdminId || null,
  );

  return id;
}

async function listOpenRiskFlags(limit = 100) {
  const statement = db.prepare(`
    SELECT *
    FROM risk_flags
    WHERE status = 'open'
    ORDER BY created_at DESC
    LIMIT ?
  `);

  return statement.all(limit);
}

async function listRiskFlags({ status, limit = 100 } = {}) {
  if (status) {
    return db
      .prepare(
        `SELECT *
         FROM risk_flags
         WHERE status = ?
         ORDER BY created_at DESC
         LIMIT ?`,
      )
      .all(status, limit);
  }

  return db
    .prepare(
      `SELECT *
       FROM risk_flags
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .all(limit);
}

async function getRiskFlagById(flagId) {
  return db
    .prepare('SELECT * FROM risk_flags WHERE id = ? LIMIT 1')
    .get(flagId);
}

async function reviewRiskFlag(flagId, patch) {
  const current = await getRiskFlagById(flagId);
  if (!current) {
    return null;
  }

  await db
    .prepare(
      `UPDATE risk_flags
       SET status = ?,
           notes = ?,
           reviewed_at = ?,
           reviewed_by_admin_id = ?
       WHERE id = ?`,
    )
    .run(
      patch.status ?? current.status,
      patch.notes === undefined ? current.notes : patch.notes,
      patch.reviewedAt === undefined ? current.reviewed_at : patch.reviewedAt,
      patch.reviewedByAdminId === undefined
        ? current.reviewed_by_admin_id
        : patch.reviewedByAdminId,
      flagId,
    );

  return getRiskFlagById(flagId);
}

async function getRiskOverview() {
  const statement = db.prepare(`
    SELECT severity, COUNT(*) AS count
    FROM risk_flags
    GROUP BY severity
    ORDER BY severity ASC
  `);

  return statement.all();
}

module.exports = {
  createRiskFlag,
  getRiskFlagById,
  getRiskOverview,
  listRiskFlags,
  listOpenRiskFlags,
  reviewRiskFlag,
};
