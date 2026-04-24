const fs = require('node:fs');
const path = require('node:path');

const { Client } = require('pg');
const dotenv = require('dotenv');

const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

function toBoolean(value) {
  return String(value || '').trim().toLowerCase() === 'true';
}

function getClientConfig() {
  const connectionString = process.env.DATABASE_URL || '';
  if (!connectionString) {
    throw new Error('DATABASE_URL tanimli degil.');
  }

  return {
    connectionString,
    ssl: toBoolean(process.env.DATABASE_SSL)
      ? {
          rejectUnauthorized: false,
        }
      : false,
  };
}

async function main() {
  const schemaPath = path.join(process.cwd(), 'server', 'db', 'postgres', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  const client = new Client(getClientConfig());

  await client.connect();
  try {
    await client.query(schemaSql);
    console.log('PostgreSQL schema basariyla uygulandi.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('PostgreSQL migration hatasi:', error.message);
  process.exitCode = 1;
});
