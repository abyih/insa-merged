#!/usr/bin/env bash
set -e

# Initialize SQLite database if not present or empty
if [ ! -f /app/users.db ] || [ ! -s /app/users.db ]; then
  echo "📦 Initializing SQLite database (users.db)..."
  node setup-db.js
fi

exec "$@"
