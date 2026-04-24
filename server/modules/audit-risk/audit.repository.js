const { randomUUID } = require('node:crypto');

const { db } = require('../../database');

async function appendAuditLog(entry) {
  const statement = db.prepare(`
    INSERT INTO audit_logs (
      id, actor_type, actor_id, target_type, target_id, action, metadata, ip_address, user_agent, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const id = randomUUID();
  const now = new Date().toISOString();

  await statement.run(
    id,
    entry.actorType,
    entry.actorId || null,
    entry.targetType,
    entry.targetId || null,
    entry.action,
    JSON.stringify(entry.metadata || {}),
    entry.ipAddress || null,
    entry.userAgent || null,
    now,
  );

  return id;
}

async function listAuditLogs(limit = 50) {
  const statement = db.prepare(`
    SELECT *
    FROM audit_logs
    ORDER BY created_at DESC
    LIMIT ?
  `);

  return statement.all(limit);
}

module.exports = {
  appendAuditLog,
  listAuditLogs,
};
