#!/usr/bin/env bash
# Generates src/data/database.types.ts from the migrations (ADR-0042), using
# the same throwaway database as npm run db:test.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
KEEP_DB=1 "$ROOT/scripts/db-test.sh" >/dev/null
trap 'docker rm -f lifeos-db-test >/dev/null 2>&1 || true' EXIT
SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io npx -y supabase@2.120.0 gen types typescript \
  --db-url "postgresql://postgres:postgres@localhost:54329/postgres?sslmode=disable" \
  --schema core,food,shopping > "$ROOT/src/data/database.types.ts"
npx prettier --write "$ROOT/src/data/database.types.ts" >/dev/null
echo "src/data/database.types.ts generated"
