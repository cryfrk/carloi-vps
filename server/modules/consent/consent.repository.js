const { randomUUID } = require('node:crypto');

const { db } = require('../../database');

async function listUserConsents(userId) {
  return db
    .prepare(
      `SELECT *
       FROM user_consents
       WHERE user_id = ?
       ORDER BY accepted_at DESC`,
    )
    .all(userId);
}

async function insertMissingUserConsents(userId, consents) {
  const existingRows = await db
    .prepare(
      `SELECT consent_type, version
       FROM user_consents
       WHERE user_id = ?`,
    )
    .all(userId);

  const existingKeys = new Set(existingRows.map((row) => `${row.consent_type}:${row.version}`));
  const toInsert = consents.filter((consent) => !existingKeys.has(`${consent.type}:${consent.version}`));

  const statement = db.prepare(
    `INSERT OR IGNORE INTO user_consents (
      id, user_id, consent_type, version, accepted_at, source_screen
    ) VALUES (?, ?, ?, ?, ?, ?)`,
  );

  for (const consent of toInsert) {
    await statement.run(
      randomUUID(),
      userId,
      consent.type,
      consent.version,
      consent.acceptedAt,
      consent.sourceScreen,
    );
  }

  return toInsert;
}

module.exports = {
  insertMissingUserConsents,
  listUserConsents,
};
