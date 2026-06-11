#!/bin/sh
set -e

# Write runtime environment config for Next.js client bundles.
# Next.js bakes NEXT_PUBLIC_* at build time, so we inject values at container
# startup via window.__NEXT_ENV__ instead — allowing the same image to run in
# any environment without a rebuild.
API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:3000/api/v1}"
TMDB_BASE="${NEXT_PUBLIC_TMDB_IMAGE_BASE:-https://image.tmdb.org/t/p}"

printf 'window.__NEXT_ENV__ = { "NEXT_PUBLIC_API_URL": "%s", "NEXT_PUBLIC_TMDB_IMAGE_BASE": "%s" };\n' \
  "$API_URL" "$TMDB_BASE" \
  > /app/apps/web/public/env.js

echo "Runtime env config written."
exec node /app/node_modules/.bin/next start -p "${PORT:-3001}" -H "${HOSTNAME:-0.0.0.0}"
