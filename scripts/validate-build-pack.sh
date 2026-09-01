#!/usr/bin/env bash

set -euo pipefail

# Checks build pack completeness.

echo "Validating build-pack documents..."
MISSING=0
IS_V2=0
if [ -f build-pack/execution-state.json ] && grep -Eq '"schema_version"[[:space:]]*:[[:space:]]*2' build-pack/execution-state.json; then
  IS_V2=1
fi

if [ "$IS_V2" -eq 1 ]; then
  FILES=(
    00-source-to-build-review.md
    04-existing-codebase-discovery.md
    05-architecture-map.md
    10-implementation-plan.md
    11-task-graph.md
    12-test-plan.md
    13-review-gate.md
    14-rollback-plan.md
    16-definition-of-done.md
    PREFLIGHT_AND_MUTATION_PLAN.md
    capabilities.json
    execution-state.json
    grommet-approval.json
    preflight-evidence.json
    requirements.json
    source-manifest.json
    capabilities.schema.json
    execution-state.schema.json
    source-manifest.schema.json
    requirements.schema.json
    grommet-approval.schema.json
  )
else
  FILES=(
    00-confirmed-prd-summary.md
    01-prd-review-checklist.md
    02-build-brief.md
    03-implementation-contract.md
    04-existing-codebase-discovery.md
    05-architecture-map.md
    06-database-contract.md
    07-api-contract.md
    08-ui-contract.md
    09-permissions-contract.md
    10-implementation-plan.md
    11-task-graph.md
    12-test-plan.md
    13-review-gate.md
    14-rollback-plan.md
    15-pre-ship-checklist.md
    16-definition-of-done.md
  )
fi

for file in "${FILES[@]}"; do
  if [ ! -f "build-pack/$file" ]; then
    echo "[missing] build-pack/$file"
    MISSING=$((MISSING + 1))
  else
    if grep -q "<!-- TODO -->" "build-pack/$file" || grep -q "\[TODO\]" "build-pack/$file"; then
       echo "[placeholder] build-pack/$file contains placeholder markers"
    else
       echo "[ok] build-pack/$file is present"
    fi
  fi
done

if [ "$MISSING" -eq 0 ]; then
  if [ "$IS_V2" -eq 1 ]; then
    if ! compgen -G 'build-pack/tasks/*.md' >/dev/null; then
      echo "[missing] at least one build-pack/tasks/*.md task card"
      exit 1
    fi
  else
    for build_plan in \
      build-pack/build-plans/01-build-plan-index.md \
      build-pack/build-plans/02-ui-ux-build-plan.md; do
      if [ ! -f "$build_plan" ]; then
        echo "[missing] $build_plan"
        exit 1
      fi
    done

    if ! find build-pack/module-plans -maxdepth 1 -name 'M-*.md' ! -name 'M-000-*' | grep -q .; then
      echo "[missing] real build-pack/module-plans/M-*.md module plans beyond the M-000 template"
      exit 1
    fi
  fi
  PYTHON_BIN=""
  for candidate in python3 python; do
    if command -v "$candidate" >/dev/null 2>&1 && "$candidate" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)' >/dev/null 2>&1; then
      PYTHON_BIN="$candidate"
      break
    fi
  done
  if [ -z "$PYTHON_BIN" ]; then
    echo "[missing] Python 3.10 or newer is required to validate execution state"
    exit 1
  fi
  "$PYTHON_BIN" scripts/build-runner.py --root . validate
  echo "[ok] Build pack documents and executable task state are valid"
  exit 0
else
  echo "[missing] $MISSING build pack file(s)"
  exit 1
fi
