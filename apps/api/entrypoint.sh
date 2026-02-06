#!/bin/sh
set -e

echo "Running database migrations..."
cd /app/packages/database && npm run migrate

echo "Starting API server..."
cd /app
exec node apps/api/dist/index.js
