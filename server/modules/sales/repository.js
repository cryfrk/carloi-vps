const { randomUUID } = require('node:crypto');

const { db } = require('../../database');

function nowIso() {
  return new Date().toISOString();
}

function mapSaleProcess(row) {
  return row
    ? {
        id: row.id,
        listingId: row.listing_id,
        buyerUserId: row.buyer_user_id,
        sellerUserId: row.seller_user_id,
        status: row.status,
        safePaymentReferenceCode: row.safe_payment_reference_code || null,
        safePaymentProviderName: row.safe_payment_provider_name || null,
        safePaymentStatusNote: row.safe_payment_status_note || null,
        safePaymentInfoAcceptedAt: row.safe_payment_info_accepted_at || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    : null;
}

async function getSaleProcessById(saleProcessId) {
  const row = await db
    .prepare('SELECT * FROM sale_processes WHERE id = ? LIMIT 1')
    .get(saleProcessId);
  return mapSaleProcess(row);
}

async function getSaleProcessByListingAndBuyer(listingId, buyerUserId) {
  const row = await db
    .prepare(
      `SELECT *
       FROM sale_processes
       WHERE listing_id = ?
         AND buyer_user_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .get(listingId, buyerUserId);
  return mapSaleProcess(row);
}

async function getLatestSaleProcessForParticipant(listingId, userId) {
  const row = await db
    .prepare(
      `SELECT *
       FROM sale_processes
       WHERE listing_id = ?
         AND (buyer_user_id = ? OR seller_user_id = ?)
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .get(listingId, userId, userId);
  return mapSaleProcess(row);
}

async function createSaleProcess(payload) {
  const id = randomUUID();
  const createdAt = payload.createdAt || nowIso();
  await db
    .prepare(
      `INSERT INTO sale_processes (
        id, listing_id, buyer_user_id, seller_user_id, status,
        safe_payment_reference_code, safe_payment_provider_name, safe_payment_status_note,
        safe_payment_info_accepted_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      payload.listingId,
      payload.buyerUserId,
      payload.sellerUserId,
      payload.status || 'interest',
      payload.safePaymentReferenceCode || null,
      payload.safePaymentProviderName || null,
      payload.safePaymentStatusNote || null,
      payload.safePaymentInfoAcceptedAt || null,
      createdAt,
      payload.updatedAt || createdAt,
    );

  return getSaleProcessById(id);
}

async function updateSaleProcess(processId, patch) {
  const current = await getSaleProcessById(processId);
  if (!current) {
    return null;
  }

  await db
    .prepare(
      `UPDATE sale_processes
       SET status = ?,
           safe_payment_reference_code = ?,
           safe_payment_provider_name = ?,
           safe_payment_status_note = ?,
           safe_payment_info_accepted_at = ?,
           updated_at = ?
       WHERE id = ?`,
    )
    .run(
      patch.status ?? current.status,
      patch.safePaymentReferenceCode === undefined
        ? current.safePaymentReferenceCode
        : patch.safePaymentReferenceCode,
      patch.safePaymentProviderName === undefined
        ? current.safePaymentProviderName
        : patch.safePaymentProviderName,
      patch.safePaymentStatusNote === undefined
        ? current.safePaymentStatusNote
        : patch.safePaymentStatusNote,
      patch.safePaymentInfoAcceptedAt === undefined
        ? current.safePaymentInfoAcceptedAt
        : patch.safePaymentInfoAcceptedAt,
      patch.updatedAt || nowIso(),
      processId,
    );

  return getSaleProcessById(processId);
}

async function getListingSellerRow(listingId) {
  return db
    .prepare(
      `SELECT id, author_user_id, listing_json, created_at
       FROM posts
       WHERE id = ?
         AND type = 'listing'
       LIMIT 1`,
    )
    .get(listingId);
}

module.exports = {
  createSaleProcess,
  getLatestSaleProcessForParticipant,
  getListingSellerRow,
  getSaleProcessById,
  getSaleProcessByListingAndBuyer,
  updateSaleProcess,
};
