#!/usr/bin/env bash
# Applies every migration from empty to a throwaway Supabase Postgres (the
# same image as the live project) and runs the database tests in
# supabase/tests. CI uses the Supabase CLI instead (`supabase test db`); this
# is for sessions where the CLI's other images can't be fetched.
set -euo pipefail

IMAGE=supabase/postgres:17.11.0.003
NAME=lifeos-db-test
PORT=54329
ROOT=$(cd "$(dirname "$0")/.." && pwd)

docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=postgres -p "$PORT:5432" "$IMAGE" >/dev/null
trap 'docker rm -f "$NAME" >/dev/null 2>&1 || true' EXIT

export PGHOST=localhost PGPORT=$PORT PGPASSWORD=postgres PGDATABASE=postgres
for _ in $(seq 1 60); do
  if psql -U postgres -tAc 'select 1' >/dev/null 2>&1; then break; fi
  sleep 1
done
# The image finishes its own setup after it first accepts connections.
sleep 3


for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "migrate  $(basename "$f")"
  psql -q -U postgres -v ON_ERROR_STOP=1 -f "$f"
done

failed=0
for f in "$ROOT"/supabase/tests/*.sql; do
  echo "test     $(basename "$f")"
  if ! out=$(psql -q -U postgres -v ON_ERROR_STOP=1 -tA -f "$f" 2>&1); then failed=1; fi
  echo "         $(echo "$out" | grep -c '^ok') passed"
  echo "$out" | grep -E '^(not ok|# )' || true
  if echo "$out" | grep -q '^not ok'; then failed=1; fi
  if [ $failed -eq 1 ]; then echo "$out" | tail -20; fi
done

if [ $failed -eq 0 ]; then echo "database tests passed"; else echo "database tests FAILED"; exit 1; fi
