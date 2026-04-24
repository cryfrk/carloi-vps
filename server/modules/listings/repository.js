const { db } = require('../../database');

function normalizePlateNumber(value) {
  return String(value || '')
    .trim()
    .toLocaleUpperCase('tr')
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9]/g, '');
}

async function getListingById(postId) {
  return db.prepare('SELECT * FROM posts WHERE id = ? AND type = ?').get(postId, 'listing');
}

async function findPlateMatches(plateNumber, excludePostId) {
  const normalizedPlate = normalizePlateNumber(plateNumber);
  if (!normalizedPlate) {
    return [];
  }

  const rows = await db
    .prepare(
      `SELECT p.id, p.author_user_id, p.created_at, lc.listing_compliance_status
       FROM listing_compliance lc
       JOIN posts p ON p.id = lc.post_id
       WHERE p.type = 'listing'
         AND REPLACE(UPPER(COALESCE(lc.plate_number, '')), ' ', '') = ?
         AND (? IS NULL OR p.id != ?)
         AND lc.listing_compliance_status NOT IN ('rejected', 'suspended')`,
    )
    .all(normalizedPlate, excludePostId || null, excludePostId || null);

  return rows;
}

async function listUserListingPrices(userId, excludePostId) {
  const rows = await db
    .prepare(
      `SELECT p.id, p.listing_json
       FROM posts p
       WHERE p.type = 'listing'
         AND p.author_user_id = ?
         AND (? IS NULL OR p.id != ?)`,
    )
    .all(userId, excludePostId || null, excludePostId || null);

  return rows;
}

async function listSellerListingBodies(userId, excludePostId) {
  return db
    .prepare(
      `SELECT p.id, p.content, p.listing_json
       FROM posts p
       WHERE p.type = 'listing'
         AND p.author_user_id = ?
         AND (? IS NULL OR p.id != ?)`,
    )
    .all(userId, excludePostId || null, excludePostId || null);
}

module.exports = {
  findPlateMatches,
  getListingById,
  listSellerListingBodies,
  listUserListingPrices,
  normalizePlateNumber,
};
