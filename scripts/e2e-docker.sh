#!/usr/bin/env bash
# Runs the browser tests inside Playwright's own image — the same one CI
# uses — so screenshots are drawn identically in both. Build first with
# npm run build:e2e. Extra arguments go to `playwright test`
# (e.g. --update-snapshots after an intended visual change).
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
docker run --rm --ipc=host --network host -v "$ROOT:/work" -w /work \
  -e CI= -e HOME=/tmp mcr.microsoft.com/playwright:v1.56.1-noble \
  npx playwright test "$@"
