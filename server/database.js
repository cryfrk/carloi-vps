const { DatabaseSync } = require('node:sqlite');

const { Pool, types } = require('pg');

const { config } = require('./config');
const { logError, logWarn } = require('./logger');

types.setTypeParser(20, (value) => Number(value));

let sqliteDb = null;
let pgPool = null;
let initialized = false;
const allowInMemoryFallback = process.env.VCARX_ALLOW_INMEMORY_FALLBACK === 'true';
const pgPoolMax = Number(process.env.PG_POOL_MAX || 20);
const pgIdleTimeoutMillis = Number(process.env.PG_IDLE_TIMEOUT_MS || 30_000);
const pgConnectionTimeoutMillis = Number(process.env.PG_CONNECTION_TIMEOUT_MS || 10_000);
const pgQueryTimeoutMillis = Number(process.env.PG_QUERY_TIMEOUT_MS || 12_000);
const pgStatementTimeoutMillis = Number(process.env.PG_STATEMENT_TIMEOUT_MS || 12_000);

function isPostgresMode() {
  return Boolean(config.databaseUrl);
}

function isTransientPostgresError(error) {
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').trim().toUpperCase();

  return [
    'ETIMEDOUT',
    'ECONNRESET',
    'ECONNREFUSED',
    'EHOSTUNREACH',
    'ENETUNREACH',
    '57P03',
    '57014',
    '53300',
    '08001',
    '08006',
  ].includes(code)
    || message.includes('timeout')
    || message.includes('timed out')
    || message.includes('connection terminated unexpectedly')
    || message.includes('could not connect')
    || message.includes('the database system is starting up')
    || message.includes('too many clients');
}

function toPublicDatabaseError(error) {
  if (!isTransientPostgresError(error)) {
    return error;
  }

  const nextError = new Error(
    'Kayit istegi su anda tamamlanamadi. Sunucu gecici olarak yogun veya veritabani yavas yanit veriyor. Lutfen biraz sonra tekrar deneyin.',
  );
  nextError.statusCode = 503;
  nextError.expose = true;
  nextError.code = 'DB_UNAVAILABLE';
  return nextError;
}

function replacePositionalPlaceholders(sql) {
  let index = 0;
  let inSingleQuote = false;

  let result = '';
  for (let cursor = 0; cursor < sql.length; cursor += 1) {
    const char = sql[cursor];
    const previous = sql[cursor - 1];

    if (char === "'" && previous !== '\\') {
      inSingleQuote = !inSingleQuote;
      result += char;
      continue;
    }

    if (char === '?' && !inSingleQuote) {
      index += 1;
      result += `$${index}`;
      continue;
    }

    result += char;
  }

  return result;
}

function splitStatements(sql) {
  const statements = [];
  let current = '';
  let inSingleQuote = false;

  for (let cursor = 0; cursor < sql.length; cursor += 1) {
    const char = sql[cursor];
    const previous = sql[cursor - 1];

    if (char === "'" && previous !== '\\') {
      inSingleQuote = !inSingleQuote;
      current += char;
      continue;
    }

    if (char === ';' && !inSingleQuote) {
      const statement = current.trim();
      if (statement) {
        statements.push(statement);
      }
      current = '';
      continue;
    }

    current += char;
  }

  const trailing = current.trim();
  if (trailing) {
    statements.push(trailing);
  }

  return statements;
}

function translateSql(sql) {
  const compact = String(sql || '').trim();
  if (!compact) {
    return compact;
  }

  if (/^PRAGMA\s+journal_mode/i.test(compact) || /^PRAGMA\s+foreign_keys/i.test(compact)) {
    return '';
  }

  const pragmaMatch = compact.match(/^PRAGMA\s+table_info\(([^)]+)\)$/i);
  if (pragmaMatch) {
    const table = pragmaMatch[1].trim().replace(/^["'`]|["'`]$/g, '');
    return `
      SELECT column_name AS name
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = '${table}'
      ORDER BY ordinal_position
    `.trim();
  }

  let next = compact.replace(/^INSERT\s+OR\s+IGNORE/i, 'INSERT');
  if (next !== compact) {
    next += ' ON CONFLICT DO NOTHING';
  }

  return replacePositionalPlaceholders(next);
}

async function initializeDatabase({ sqliteSchemaSql = '' } = {}) {
  if (initialized) {
    return;
  }

  if (isPostgresMode()) {
    pgPool = new Pool({
      connectionString: config.databaseUrl,
      ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
      max: pgPoolMax,
      idleTimeoutMillis: pgIdleTimeoutMillis,
      connectionTimeoutMillis: pgConnectionTimeoutMillis,
      query_timeout: pgQueryTimeoutMillis,
      statement_timeout: pgStatementTimeoutMillis,
      keepAlive: true,
      keepAliveInitialDelayMillis: 5_000,
    });
    pgPool.on('error', (error) => {
      logError('database.pool.error', {
        code: error?.code || '',
        message: error?.message || 'unknown',
      });
    });

    const client = await pgPool.connect();
    client.release();
  } else {
    if (!allowInMemoryFallback) {
      throw new Error(
        'DATABASE_URL zorunludur. Yalnizca gelistirme icin VCARX_ALLOW_INMEMORY_FALLBACK=true ile gecici fallback acilabilir.',
      );
    }

    sqliteDb = new DatabaseSync(config.dbPath);
    if (sqliteSchemaSql.trim()) {
      sqliteDb.exec(sqliteSchemaSql);
    }
  }

  initialized = true;
}

async function queryPostgres(sql, params = []) {
  const translated = translateSql(sql);
  if (!translated) {
    return { rows: [], rowCount: 0 };
  }

  try {
    return await pgPool.query(translated, params);
  } catch (error) {
    const mappedError = toPublicDatabaseError(error);
    const logPayload = {
      code: error?.code || '',
      message: error?.message || 'unknown',
      mappedCode: mappedError?.code || '',
    };

    if (mappedError !== error) {
      logWarn('database.query.transient_failure', logPayload);
      throw mappedError;
    }

    logError('database.query.failed', logPayload);
    throw error;
  }
}

function prepare(sql) {
  if (!initialized) {
    throw new Error('Database has not been initialized yet.');
  }

  if (!isPostgresMode()) {
    const statement = sqliteDb.prepare(sql);
    return {
      get: async (...params) => statement.get(...params),
      all: async (...params) => statement.all(...params),
      run: async (...params) => statement.run(...params),
    };
  }

  return {
    get: async (...params) => {
      const result = await queryPostgres(sql, params);
      return result.rows[0];
    },
    all: async (...params) => {
      const result = await queryPostgres(sql, params);
      return result.rows;
    },
    run: async (...params) => {
      const result = await queryPostgres(sql, params);
      return {
        changes: result.rowCount || 0,
      };
    },
  };
}

async function exec(sql) {
  if (!initialized) {
    throw new Error('Database has not been initialized yet.');
  }

  if (!isPostgresMode()) {
    sqliteDb.exec(sql);
    return;
  }

  const statements = splitStatements(sql);
  for (const statement of statements) {
    const translated = translateSql(statement);
    if (!translated) {
      continue;
    }
    await pgPool.query(translated);
  }
}

async function closeDatabase() {
  if (!initialized) {
    return;
  }

  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }

  sqliteDb = null;
  initialized = false;
}

const db = {
  prepare,
  exec,
};

module.exports = {
  closeDatabase,
  db,
  initializeDatabase,
  isPostgresMode,
};
