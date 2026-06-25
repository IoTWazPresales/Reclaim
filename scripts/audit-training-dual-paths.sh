#!/usr/bin/env bash
# Guided training dual-path audit — fails while known SSOT violations remain.
# Run from repo root: ./scripts/audit-training-dual-paths.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/app/src"
FAIL=0
PASS=0

pass() {
  echo "PASS: $1"
  PASS=$((PASS + 1))
}

fail() {
  echo "FAIL: $1"
  FAIL=$((FAIL + 1))
}

rg_quiet() {
  rg -q "$@" 2>/dev/null
}

echo "=== Guided training dual-path audit ==="
echo "Root: $ROOT"
echo

# --- Violations (must reach zero before D9) ---

# B: NEXT_SET must not schedule from frozen payload lookahead
if rg_quiet 'data\.nextAfterSessionItemId' "$APP/lib/notifications/guidedTrainingNotificationActions.ts"; then
  fail "NEXT_SET handler still references data.nextAfterSessionItemId (payload lookahead)"
else
  pass "NEXT_SET handler has no data.nextAfterSessionItemId"
fi

if rg_quiet 'let nextAfter: TrainingNotificationNext' "$APP/lib/notifications/guidedTrainingNotificationActions.ts"; then
  fail "NEXT_SET handler still builds nextAfter from notification payload"
else
  pass "NEXT_SET handler does not build nextAfter from payload"
fi

# C: In-app parallel schedulers
if rg_quiet 'notifyRestStartIfNeeded' "$APP/components/training/TrainingSessionView.tsx"; then
  fail "TrainingSessionView still defines notifyRestStartIfNeeded (parallel scheduler)"
else
  pass "TrainingSessionView has no notifyRestStartIfNeeded"
fi

if rg_quiet 'scheduleRestFinishNotification' "$APP/components/training/TrainingSessionView.tsx"; then
  fail "TrainingSessionView still defines scheduleRestFinishNotification (parallel scheduler)"
else
  pass "TrainingSessionView has no scheduleRestFinishNotification"
fi

# D: Plan-based first-set builder
if rg_quiet 'function computeFirstSetInfo' "$APP/screens/TrainingScreen.tsx"; then
  fail "TrainingScreen still defines computeFirstSetInfo (plan lookahead)"
else
  pass "TrainingScreen has no computeFirstSetInfo"
fi

# External transition builder as scheduling authority
if rg_quiet 'buildGuidedRestNotificationContextAfterCompletedSet' "$APP/components/training/TrainingSessionView.tsx"; then
  fail "TrainingSessionView still uses buildGuidedRestNotificationContextAfterCompletedSet"
else
  pass "TrainingSessionView does not use buildGuidedRestNotificationContextAfterCompletedSet"
fi

# F: Offline replay without training session invalidation
if rg_quiet 'syncOfflineQueue' "$APP/hooks/useNotifications.ts" \
  && ! rg_quiet 'invalidateQueriesAfterTrainingOfflineReplay' "$APP/hooks/useNotifications.ts"; then
  fail "useNotifications calls syncOfflineQueue without invalidateQueriesAfterTrainingOfflineReplay"
else
  pass "useNotifications replay invalidates training session queries (or no direct replay)"
fi

if rg_quiet 'syncOfflineQueue' "$APP/screens/TrainingScreen.tsx" \
  && ! rg_quiet 'invalidateQueriesAfterTrainingOfflineReplay' "$APP/screens/TrainingScreen.tsx"; then
  fail "TrainingScreen calls syncOfflineQueue without invalidateQueriesAfterTrainingOfflineReplay"
else
  pass "TrainingScreen replay invalidates training session queries (or no direct replay)"
fi

# --- Required canonical modules (must exist) ---

for f in \
  "$APP/lib/training/applySetCompletion.ts" \
  "$APP/lib/training/trainingNotificationWorkPlan.ts" \
  "$APP/lib/training/scheduleGuidedTrainingAfterSetPersist.ts" \
  "$APP/lib/training/finalizeTrainingSession.ts" \
  "$APP/lib/training/sessionWorkAuthority.ts"
do
  if [[ -f "$f" ]]; then
    pass "canonical module exists: ${f#$ROOT/}"
  else
    fail "missing canonical module: ${f#$ROOT/}"
  fi
done

# G: Core progression module (extracted from work plan)
if [[ -f "$APP/lib/training/trainingSessionProgression.ts" ]]; then
  pass "trainingSessionProgression.ts present"
else
  fail "trainingSessionProgression.ts missing (PR-G)"
fi

# D: DB-derived session start scheduler
if rg_quiet 'scheduleGuidedTrainingSessionStart' "$APP/lib/training/scheduleGuidedTrainingAfterSetPersist.ts"; then
  pass "scheduleGuidedTrainingSessionStart present"
else
  fail "scheduleGuidedTrainingSessionStart not implemented (PR-D)"
fi

# H: Dead plan-walk rest context builder removed
if rg_quiet 'buildGuidedRestNotificationContextAfterCompletedSet' "$APP"; then
  fail "buildGuidedRestNotificationContextAfterCompletedSet still exists (dead code)"
else
  pass "buildGuidedRestNotificationContextAfterCompletedSet removed"
fi

# F/G: Unified finalize + intent cleanup
if rg_quiet 'finalizeTrainingSessionAndCleanup' "$APP/lib/training/finalizeTrainingSession.ts"; then
  pass "finalizeTrainingSessionAndCleanup present"
else
  fail "finalizeTrainingSessionAndCleanup missing (PR-G/H)"
fi

if rg_quiet 'replayTrainingOfflineQueueAndRefreshUI' "$APP/lib/training/offlineSync.ts"; then
  pass "replayTrainingOfflineQueueAndRefreshUI present"
else
  fail "replayTrainingOfflineQueueAndRefreshUI missing (PR-F)"
fi

# B: DB-derived NEXT_SET scheduler
if rg_quiet 'scheduleGuidedTrainingNextSetFromDb' "$APP/lib/training/scheduleGuidedTrainingAfterSetPersist.ts"; then
  pass "scheduleGuidedTrainingNextSetFromDb present"
else
  fail "scheduleGuidedTrainingNextSetFromDb not implemented (PR-B)"
fi

echo
echo "=== Summary: $PASS passed, $FAIL failed ==="
if [[ "$FAIL" -gt 0 ]]; then
  echo "Audit FAILED — $FAIL known dual-path violation(s) remain."
  exit 1
fi

echo "Audit PASSED — no known dual-path violations."
exit 0
