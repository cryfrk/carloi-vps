#!/bin/sh
set -eu

echo "Carloi API startup basladi."

if [ "${AUTO_MIGRATE_POSTGRES:-true}" = "true" ] && [ -n "${DATABASE_URL:-}" ]; then
  echo "PostgreSQL schema migration calistiriliyor..."
  node scripts/migrate-postgres.js
fi

echo "API servisi baslatiliyor..."
exec node server/index.js
