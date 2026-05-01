# PHASE 2 — Architecture design (write-up + file-by-file plan)

## 1. SyncManager (`app/src/lib/sync/SyncManager.ts`)

- **Entrypoint:** `runSync({ trigger, scope, userContext }): Promise<SyncResult>`
- **Scopes:** `health` (sleep/activity/vitals), `localPush` (mood/meditation), `trainingQueue`, `all`
- **SyncResult:** `trigger`, `scope`, `startedAt`, `durationMs`, `providersAttempted` / `providersSkipped` (with reason enums), `recordsFetched` / `recordsWritten` / `recordsDeduped` by domain, `postWriteVerification` (at least sleep), `errors[]`, `cacheInvalidations[]` (query keys), `summary` ("Imported", "No new data (already present)", "Connect permissions first", etc.)
- **Implementation:** `health` → `syncHealthData` + Samsung import when requested; `localPush` → `syncAll`; `trainingQueue` → `syncOfflineQueue`; `all` → run health then localPush then trainingQueue. Use `CacheInvalidationMap` for invalidations. Run `SyncVerifier` after health sync for sleep.

## 2. SyncVerifier (same file or `sync/SyncVerifier.ts`)

- Lightweight post-write read-back for `sleep_sessions`:
  - If `fetched > 0` and we expected writes → verify ≥1 matching row in time window.
  - If `deduped === fetched` and `writes === 0` → `SyncResult.summary` = "No new data (already present)"; do not claim "Imported".

## 3. CacheInvalidationMap (`app/src/lib/cache/invalidationMap.ts`)

- **Mapping:** `domain` → list of React Query keys to invalidate.
- **Domains:** `sleep`, `activity`, `vitals`, `mood`, `meditation`, `training`, `dashboard`, etc.
- **API:** `getInvalidationKeys(domains: string[]): (string | string[])[]` (query keys). Used only via SyncManager for sync-related invalidations; screens use map indirectly through SyncResult / SyncManager.

## 4. NotificationManager (`app/src/lib/notifications/NotificationManager.ts`)

- **Entrypoint:** `reconcile({ trigger, allowUnauthed }): Promise<ScheduleResult>`
- **Hard gates:** Do not schedule daily-plan notifications (morning_review, mood_*, sleep_*) unless auth confirmed and user onboarded. When `allowUnauthed === false`, check `supabase.auth.getUser()` and `getHasOnboarded(userId)`; if missing, skip daily plan, return `ScheduleResult` with `reasonsSkipped`.
- **ScheduleResult:** `plannedCount`, `scheduledCount`, `cancelledCount`, `nextFireAt` per category (at least daily plan), `reasonsSkipped[]`.
- **Reconciliation:** Compare expected plan fingerprint vs actual scheduled notifications (`getNotificationDiagnostics`); reschedule missing. Do not show “notifications enabled” UI when `scheduledCount === 0` for plans that should schedule.

## 5. Onboarding flash fix (RootNavigator)

- **Monotonic onboarding:** Local `true` always wins.
- **Avoid rendering Onboarding** when local indicates onboarded, even if remote unknown.
- **Avoid flowKey remount** that causes a visible intermediate Onboarding route when we’ve already decided App (e.g. local true). Ensure we don’t mount Onboarding transiently before App.
- **Failsafe:** Keep it but ensure it doesn’t cause Onboarding flash when remote later upgrades (e.g. don’t show Onboarding if local is true; only show when we’re confident user hasn’t onboarded).

## 6. UX policy

- Import buttons call SyncManager and display SyncResult (toast/label: fetched/written/deduped or “No new data” / “Connect permissions first”).
- Prefer auto-sync on app open/foreground (cooldown), post-onboarding, pull-to-refresh; manual Sync as fallback with evidence.

## 7. Logging

- Structured logs: `[SYNC]`, `[SYNC_VERIFY]`, `[NOTIF]`, `[NOTIF_RECONCILE]`, `[ONBOARD_GATE]`. No sensitive payloads.

---

## File-by-file change plan

### Commit 1 — SyncManager + invalidation map (skeleton, no behavior change)

| File | Action |
|------|--------|
| `app/src/lib/cache/invalidationMap.ts` | **NEW.** Export `CACHE_DOMAINS`, `getInvalidationKeys(domains)`. Map `sleep` → `['sleep:last','sleep:sessions:30d']`, `dashboard` → `['dashboard:lastSleep']`, `sleep_settings` → `['sleep:settings']`, `mood` → `['mood:local','mood:daily:supabase','mood:checkins:7d']`, `meditation` → `['meditations']`, `training` → `['training:sessions','training:profile','training:activeProgram']`. |
| `app/src/lib/sync/SyncManager.ts` | **NEW.** Define `SyncResult`, `SyncTrigger`, `SyncScope`, `runSync` stub that returns minimal `SyncResult` (no calls to `sync.ts`). Define `SyncVerifier` stub (no-op). `[SYNC]` log on entry. |

### Commit 2 — Route Dashboard + IntegrationsScreen through SyncManager (health)

| File | Action |
|------|--------|
| `app/src/lib/sync/SyncManager.ts` | Implement `runSync` for `health`: call `syncHealthData`, optionally `importSamsungHistory` when `userContext.includeSamsung`; run `SyncVerifier` for sleep; use `getInvalidationKeys(['sleep','dashboard','sleep_settings'])`; fill `SyncResult`. `[SYNC]` / `[SYNC_VERIFY]` logs. |
| `app/src/screens/Dashboard.tsx` | `runHealthSync` → `SyncManager.runSync({ scope: 'health', trigger: 'dashboard' })`. Invalidate via keys from `SyncResult.cacheInvalidations`. Toast from `SyncResult.summary` or “Health data synced” / “No new data”. |
| `app/src/screens/IntegrationsScreen.tsx` | `processImport` → `SyncManager.runSync({ scope: 'health', trigger: 'integrations-import', userContext: { includeSamsung: true } })`. Use `SyncResult` for invalidations and any UI feedback. |

### Commit 3 — Fix SleepScreen import + connect-count

| File | Action |
|------|--------|
| `app/src/screens/SleepScreen.tsx` | Connect-count effect: call `SyncManager.runSync({ scope: 'health', trigger: 'connect-count' })` instead of `syncAll`. Invalidate via SyncResult. |
| `app/src/screens/SleepScreen.tsx` | Import modal `processImport`: call `SyncManager.runSync` (health, trigger `sleep-import`). Include Samsung when relevant. Show “No new data” or “Connect permissions first” when `SyncResult.summary` indicates it; otherwise “Imported” / written count. Use `SyncResult.cacheInvalidations` for invalidation. |

### Commit 4 — NotificationManager + reconcile + gates

| File | Action |
|------|--------|
| `app/src/lib/notifications/NotificationManager.ts` | **NEW.** `reconcile({ trigger, allowUnauthed })`: if `!allowUnauthed`, check session + onboarded; if missing, return `ScheduleResult` with `reasonsSkipped`, no daily plan scheduled. Else call existing `reconcileNotifications` flow; optionally verify via `getNotificationDiagnostics`, reschedule missing; return `ScheduleResult` (plannedCount, scheduledCount, cancelledCount, nextFireAt, reasonsSkipped). `[NOTIF]` / `[NOTIF_RECONCILE]` logs. |
| `app/src/hooks/useNotifications.ts` | Call `NotificationManager.reconcile({ allowUnauthed: false })` instead of `reconcileNotifications`. Keep permission/channel setup. |
| `app/App.tsx` | AppShell boot `reconcile` → `NotificationManager.reconcile({ allowUnauthed: false })`. |
| `app/src/lib/notifications/NotificationScheduler.ts` | No change to `buildNotificationPlan` / fingerprint; gates live in NotificationManager. Optionally export helpers for Manager. |

### Commit 5 — Onboarding flash mitigation

| File | Action |
|------|--------|
| `app/src/routing/RootNavigator.tsx` | Refine `shouldHoldSplash` and render logic: never show Onboarding when `localHasOnboarded` is true (even if remote unknown). Avoid flowKey remount that briefly shows Onboarding before App. Adjust failsafe so it doesn’t expose Onboarding when local says onboarded. Add `[ONBOARD_GATE]` logs. |

---

## Implementation order

1. Commit 1: Add `invalidationMap.ts` and `SyncManager.ts` (skeleton only).
2. Commit 2: Implement health sync in SyncManager; wire Dashboard and IntegrationsScreen.
3. Commit 3: Fix SleepScreen import and connect-count effect.
4. Commit 4: Add NotificationManager; gate reconcile on auth+onboarded; switch useNotifications and AppShell.
5. Commit 5: RootNavigator onboarding flash fixes.

After each commit: `cd app && npx tsc --noEmit`, `cd app && npx vitest run --passWithNoTests`.
