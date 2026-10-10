#!/usr/bin/env bash
# Benchmarks core_private.can_read on seeded data (Stage 1, step 11): a week of
# Plan and the whole list of Items, read through row-level security as each
# person. Uses the throwaway database of npm run db:test.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
KEEP_DB=1 "$ROOT/scripts/db-test.sh" >/dev/null
trap 'docker rm -f lifeos-db-test >/dev/null 2>&1 || true' EXIT
export PGHOST=localhost PGPORT=54329 PGPASSWORD=postgres PGDATABASE=postgres
psql -q -U postgres -tA -f "$ROOT/scripts/bench-can-read.sql"

run() { # $1 person, $2 label, $3 query
  local ms
  ms=$(psql -q -U postgres -tA <<SQL
begin;
select set_config('request.jwt.claims', '{"sub": "$1", "role": "authenticated"}', true),
       set_config('request.jwt.claim.sub', '$1', true) \g /dev/null
set local role authenticated;
create temp table t (ms float) on commit drop;
do \$\$
declare plan json; i int;
begin
  for i in 1..20 loop
    execute \$q\$explain (analyze, format json) $3\$q\$ into plan;
    insert into t values ((plan -> 0 ->> 'Execution Time')::float);
  end loop;
end
\$\$;
select round(percentile_cont(0.5) within group (order by ms)::numeric, 1) || ' ms median, '
    || round(max(ms)::numeric, 1) || ' ms worst, '
    || (select count(*) from ($3) q) || ' rows'
from t;
rollback;
SQL
)
  printf '%-44s %s\n' "$2" "$ms"
}

ANN=00000000-0000-4000-8000-00000000000a
BEN=00000000-0000-4000-8000-00000000000b
WEEK="select * from core.items where archived_at is null and (do_on between date '2026-03-02' and date '2026-03-08' or starts_at >= timestamptz '2026-03-02' and starts_at < timestamptz '2026-03-09')"
ALL="select * from core.items where archived_at is null"
run $ANN "Ann: a week of Plan" "$WEEK"
run $BEN "Ben: a week of Plan (with one-hop Items)" "$WEEK"
run $ANN "Ann: every live Item" "$ALL"
run $BEN "Ben: every live Item" "$ALL"
