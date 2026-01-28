# PHASE 3 — Verification + Tight Audit

## STEP 1 — File summaries (purpose + key behavior)

### app/src/lib/sync/SyncManager.ts
- **Purpose:** Single entrypoint for sync; produces verifiable `SyncResult`. Screens use `runSync` only, not raw `sync.ts` / health services.
- **Key behavior:** `runSync({ trigger, scope, userContext })` dispatches to `runHealthSync` for `health`/`all`. Runs `syncHealthData`, optionally `importSamsungHistory` when `userContext.includeSamsung`. Sets `result.summary` to `'No new data (already present).'` when no writes. Uses `getInvalidationKeys` for cache invalidations, runs `runSyncVerifier` post-write for sleep. Logs `[SYNC]` / `[SYNC_VERIFY]`.

### app/src/lib/sync.ts (syncHealthData entry)
- **Purpose:** Core health sync implementation. Exports `syncHealthData`, `importSamsungHistory`, `getLastSyncISO`, etc.
- **Key behavior:** `syncHealthData()` (≈247–631) fetches sleep/activity/vitals from Health Connect, Google Fit, Apple HealthKit, Samsung; upserts to Supabase; returns `{ sleepSynced, activitySynced, syncedAt, debug }`. Handles dedupe via `getExistingSleepDateKeys`, provider priority (HC activity before Fit).

### app/src/lib/cache/invalidationMap.ts
- **Purpose:** Central map of cache domains → React Query keys for sync-related invalidations. Used via SyncManager; screens should not invalidate ad-hoc for sync.
- **Key behavior:** `CACHE_DOMAINS` maps e.g. `sleep` → `['sleep:last','sleep:sessions:30d']`, `dashboard` → `['dashboard:lastSleep']`, etc. `getInvalidationKeys(domains)` returns deduplicated query keys for `queryClient.invalidateQueries`.

### app/src/lib/notifications/NotificationManager.ts
- **Purpose:** Unified notification reconcile entrypoint. Gates daily-plan scheduling on auth + onboarded.
- **Key behavior:** `reconcile({ trigger, allowUnauthed })`. When `allowUnauthed === false`, checks `supabase.auth.getUser()` and `getHasOnboarded(userId)`; if no user or not onboarded, returns early with `reasonsSkipped` and does not schedule. Otherwise runs `getNotificationDiagnostics` (before/after), `buildNotificationPlan`, `reconcileNotifications`, returns `ScheduleResult` with `plannedCount`, `scheduledCount`, `cancelledCount`, `nextFireAt`, `reasonsSkipped`. Logs `[NOTIF_RECONCILE]`.

### app/src/hooks/useNotifications.ts
- **Purpose:** App-wide notification setup, permission/channels, response handling, mood/sleep/med/training reminders.
- **Key behavior:** `useNotifications()` sets channels, categories, clears badge; calls `reconcile({ allowUnauthed: false })` on mount (≈326) and on AppState `active` (≈395). Processes notification taps (deep links, med/mood/sleep/training actions). Does not call `reconcileNotifications` directly; uses `NotificationManager.reconcile`.

### app/App.tsx (AppShell)
- **Purpose:** Hooks shell: `useNotifications`, `useAppUpdates`; intent capture; boot reconcile; background sync init; Android channel.
- **Key behavior:** `AppShell` runs `reconcile({ allowUnauthed: false })` once on launch (≈447–449). Reconcile is gated inside NotificationManager (auth + onboarded).

### app/src/routing/RootNavigator.tsx
- **Purpose:** Top-level nav: Auth vs Onboarding vs App. Determines route from `session`, `hasOnboarded`, `remoteOnboarded`, `effectiveHasOnboarded`, `shouldHoldSplash`, `flowKey`.
- **Key behavior:** Monotonic onboarding: `localHasOnboarded || remoteOnboarded === true`. Holds splash until `appReady` and onboarding known (or failsafe 8s). `showApp = session && (effectiveHasOnboarded || localHasOnboarded)`. Never shows Onboarding when local says onboarded. `flowKey` forces stack remount when onboarding flips. `[ONBOARD_GATE]` debug logs in __DEV__.

### app/src/screens/SleepScreen.tsx
- **Purpose:** Sleep UI, last night, hypnogram, insights, Import modal, connect-count auto-sync.
- **Key behavior:** Import modal `processImport` calls `runSync({ trigger: 'sleep-import', scope: 'health', userContext: { includeSamsung } })`, uses `syncResult.summary` or `'No new data (already present).'` for `displayMessage`, invalidates via `syncResult.cacheInvalidations`, refreshes insight when `anySynced`. Connect-count `useEffect` calls `runSync({ trigger: 'connect-count', scope: 'health' })` (not `syncAll`), invalidates caches, refreshes insight when `anySynced`.

### app/src/screens/IntegrationsScreen.tsx
- **Purpose:** Health provider connections, manual connect, Import flow.
- **Key behavior:** `handleConnectIntegration` uses `runSync({ trigger: 'manual', scope: 'health' })` after Health Connect connect. `processImport` uses `runSync({ trigger: 'integrations-import', scope: 'health', userContext: { includeSamsung: true } })`, invalidates via `syncResult.cacheInvalidations`, refreshes insights when `anySynced`.

### app/src/screens/Dashboard.tsx
- **Purpose:** Dashboard UI, last sleep, pull-to-refresh / initial health sync.
- **Key behavior:** `runHealthSync` callback uses `runSync({ trigger: 'dashboard', scope: 'health' })`, applies `cacheInvalidations`, sets `lastSyncedAt` from `result.syncedAt`, shows toast with `result.summary`.

---

## STEP 2 — Proof that intended fixes exist

### A) Sleep import modal calls runSync(health) and reports "No new data" correctly
- **Evidence:** `SleepScreen.tsx`
  - `processImport` calls `runSync({ trigger: 'sleep-import', scope: 'health', userContext: { includeSamsung } })` (≈509–513).
  - `displayMessage = syncResult?.errors?.length ? (errors[0]?.message ?? 'Import failed') : (syncResult?.summary ?? 'No new data (already present).')` (≈532–535).
  - Steps show `message: displayMessage` on success (≈589).
- **Snippet:** `syncResult = await runSync({ trigger: 'sleep-import', scope: 'health', ... });` … `(syncResult?.summary ?? 'No new data (already present).')`  
- **Lines:** ≈506–535, 589.

### B) Sleep connect-count effect calls runSync(health), NOT syncAll
- **Evidence:** `SleepScreen.tsx`
  - `useEffect` on `connectedIntegrations.length` runs `runSync({ trigger: 'connect-count', scope: 'health' })` (≈973). No `syncAll` usage.
- **Snippet:** `const result = await runSync({ trigger: 'connect-count', scope: 'health' });`  
- **Lines:** ≈965–993.

### D) Notification reconcile not scheduling when signed out (or not onboarded)
- **Evidence:** `NotificationManager.ts`  
  - When `allowUnauthed === false`, we check `supabase.auth.getUser()`; if `!user?.id`, return `{ ...empty, reasonsSkipped: ['no auth'] }` (≈44–47). If `!onboarded`, return `{ ...empty, reasonsSkipped: ['not onboarded'] }` (≈48–52). No call to `buildNotificationPlan` / `reconcileNotifications` in those paths.
- **Evidence:** `useNotifications.ts` and `App.tsx` call `reconcile({ allowUnauthed: false })` only.  
- **Snippet:** `if (!user?.id) { ... return { ...empty, reasonsSkipped: ['no auth'] }; }` … `if (!onboarded) { ... return { ...empty, reasonsSkipped: ['not onboarded'] }; }`  
- **Lines:** ≈39–56.  
- **Note:** Reconcile *is* invoked when signed out; scheduling is skipped via gate. Daily-plan notifications are not scheduled.

### F) Notification reconcile returns planned vs scheduled counts (post-schedule proof)
- **Evidence:** `NotificationManager.ts`
  - `getNotificationDiagnostics()` before reconcile → `cancelledCount = diagBefore?.scheduledCount ?? 0`.
  - `buildNotificationPlan()` → `plannedCount = plan.notifications.length`.
  - `reconcileNotifications()` then `getNotificationDiagnostics()` after → `scheduledCount = diagAfter?.scheduledCount ?? 0`.
  - Returns `{ plannedCount, scheduledCount, cancelledCount, nextFireAt, reasonsSkipped }` (≈73–79). Logs `[NOTIF_RECONCILE] { plannedCount, scheduledCount, cancelledCount }` (≈73).
- **Snippet:** `plannedCount = plan.notifications.length;` … `scheduledCount = diagAfter?.scheduledCount ?? 0;` … `return { plannedCount, scheduledCount, cancelledCount, ... };`  
- **Lines:** ≈61–79.

---

## STEP 3 — Baseline run (logs)

- **tsc:** `npx tsc --noEmit` → exit code **0**. Output redirected to `C:\Reclaim\logs\tsc_phase3.log` (empty on success).
- **vitest:** `npx vitest run --passWithNoTests` → exit code **0**. Output to `C:\Reclaim\logs\vitest_phase3.log`. Last 50 lines (summary): 19 test files, 244 tests passed; Duration ~21.5s; InsightCard snapshot tests passed (react-test-renderer deprecation warning only).

## STEP 4 — Remaining issues

No blocking issues. Fixes A, B, D, F are present. Baseline passes. No code changes; no additional `[SYNC_VERIFY]` / `[NOTIF_VERIFY]` logs added (`[SYNC_VERIFY]` already in SyncManager; `[NOTIF_RECONCILE]` provides schedule proof).
