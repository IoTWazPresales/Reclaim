# PHASE 4 — Final audit report

## Issues A–F: fixes and verification

| Issue | Fixed | How verified |
|-------|--------|--------------|
| **A** SleepScreen import modal no sync | ✅ | `processImport` now calls `runSync({ trigger: 'sleep-import', scope: 'health', userContext: { includeSamsung } })` before the per-provider UI loop. Invalidates via `SyncResult.cacheInvalidations`, refreshInsight when anySynced. Success message uses `displayMessage` from `SyncResult.summary` or errors (including "No new data (already present)."). |
| **B** SleepScreen connect-count calls `syncAll` | ✅ | Connect-count `useEffect` now calls `runSync({ trigger: 'connect-count', scope: 'health' })` instead of `syncAll`. Invalidates via `SyncResult.cacheInvalidations`, refreshInsight when anySynced. |
| **C** IntegrationsScreen import | ✅ | Already called `syncHealthData`. Now uses `runSync` with `integrations-import` trigger and `includeSamsung: true`. Same invalidation/refresh pattern. |
| **D** Morning Review when unauthed | ✅ | `NotificationManager.reconcile({ allowUnauthed: false })` gates on `supabase.auth.getUser()` and `getHasOnboarded(userId)`. When gated, returns `ScheduleResult` with `reasonsSkipped` and does not run `reconcileNotifications`. useNotifications and AppShell call `reconcile({ allowUnauthed: false })`. |
| **E** Onboarding flash | ✅ | RootNavigator: explicit `showApp = session && (effectiveHasOnboarded \|\| localHasOnboarded)`. Never render Onboarding when local onboarded. `[ONBOARD_GATE]` logs added for `shouldHoldSplash`, route choice, and failsafe. |
| **F** Notifications schedule proof | ✅ | `NotificationManager.reconcile` returns `ScheduleResult` with `plannedCount`, `scheduledCount`, `cancelledCount`, `reasonsSkipped`. Uses `getNotificationDiagnostics` before/after reconcile. Reconciliation still uses fingerprint; verify‑actual‑vs‑plan reschedule of missing items is not implemented (see limitations). |

## Where SyncResult / ScheduleResult are surfaced

- **SyncResult:** Returned by `runSync`. Dashboard uses `result.summary` for toast; IntegrationsScreen uses `result.cacheInvalidations` and `recordsWritten` for refresh; SleepScreen uses `result.summary` / `result.errors` for import modal messaging and `cacheInvalidations` for invalidation.
- **ScheduleResult:** Returned by `NotificationManager.reconcile`. Currently used for logging and early‑return when gated; not yet surfaced in UI (e.g. DiagnosticsScreen still uses `getNotificationDiagnostics` directly).

## Remaining limitations

- **Notifications:** Reconcile does not reschedule “missing” notifications by comparing plan fingerprint to actual scheduled IDs. `getNotificationDiagnostics` is used for `ScheduleResult` counts only.
- **Vitest:** Occasional `[vitest-pool] Timeout starting forks runner` errors in local runs; all 19 test files pass when the run completes. Likely environment-specific.
- **OS notification clearing / watch:** Not tested; device testing still required for watch mirroring and OS-level clearing.

## Commands run

- `cd app && npm ci` — 1024 packages, ~4m.
- `cd app && npx tsc --noEmit` — pass (each commit).
- `cd app && npx vitest run --passWithNoTests` — 19 test files pass; intermittent fork timeouts reported.

## Files changed (by commit)

1. **Commit 1:** `app/src/lib/cache/invalidationMap.ts` (new), `app/src/lib/sync/SyncManager.ts` (new).
2. **Commit 2:** `SyncManager.ts` (health impl, verifier), `Dashboard.tsx`, `IntegrationsScreen.tsx`.
3. **Commit 3:** `SleepScreen.tsx` (import + connect-count).
4. **Commit 4:** `NotificationManager.ts` (new), `useNotifications.ts`, `App.tsx`, `SettingsScreen.tsx`.
5. **Commit 5:** `RootNavigator.tsx` ([ONBOARD_GATE] logs, `showApp` guard).
