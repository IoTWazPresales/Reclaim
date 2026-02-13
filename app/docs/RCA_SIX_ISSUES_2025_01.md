# Root Cause Analysis — Six Issues (January 2025)

**Scope:** Training notifications, login/onboarding flash, sleep integration, auto meditation, fold screen layout, training delete loop.  
**No code changes in this document — evidence and fix plan only.**

---

## 1. Training Notifications & Guided Watch Actionability

### User Expectation
- No training notifications until a session is started.
- Guided mode: actively force notifications during the session and ensure they appear on the watch (Done button, timing, etc.).

### Evidence

**1a. AppState gating (primary cause)**  
`TrainingSessionView.tsx:273`, `:299`:
```ts
if (AppState.currentState === 'active') return;
```
- `scheduleTrainingRest` and `scheduleTrainingSet` only run when the app is backgrounded.
- If the user keeps the app open during training, no rest/set notifications are scheduled.

**1b. No guided vs normal distinction**  
- Same notification path for normal and guided.
- No "force notifications" behavior for guided mode.

**1c. Watch actionability**  
- `TRAINING_SET` and `TRAINING_REST` have `categoryIdentifier` and actions (SET_DONE, EDIT_SET, NEXT_SET).
- Channels use `importance: HIGH`, `lockscreenVisibility: PUBLIC`.
- Possible conflict: `App.tsx:415-422` also sets channels; last setup may downgrade importance.

**1d. Rest completion cancels notification**  
- On rest timer complete while app is active, `cancelRestFinishNotification` runs; the "rest complete" notification is cancelled instead of shown.

### Likely Root Causes
1. AppState gating blocks scheduling when app is foreground.
2. No guided-specific scheduling (no forced notifications).
3. Possible channel config conflict affecting watch delivery.

### Recommended Fixes (no code here)
1. Remove or relax AppState gating for guided mode; keep gating for normal mode.
2. When guided session starts, explicitly schedule session-scoped notifications.
3. Add a guided flag to `scheduleTrainingRest` / `scheduleTrainingSet` to bypass gating when guided.
4. Unify channel setup in one place (e.g. NotificationScheduler) and remove duplicate setup in App.tsx.
5. On rest complete while foreground: show in-app UI; optionally still deliver notification for watch users.

---

## 2. Login / Onboarding Flash

### User Expectation
- After first login and onboarding completion, show a load screen that holds until auth, onboarding check, and bootstrap (optionally initial sync) are done, then go to Dashboard.

### Evidence

**2a. RootNavigator flow**  
`RootNavigator.tsx`:
- `appReady`, `hasOnboarded`, `remoteOnboarded`, `failsafeTriggered` control what is shown.
- `shouldHoldSplash` keeps splash until: `appReady` and onboarding state resolved.
- Render: Auth | Onboarding | App based on `session` and `effectiveHasOnboarded`.

**2b. Race conditions**  
- AuthProvider `getSession` is async (5s timeout).
- PHASE A: `getHasOnboarded(userId)` from SecureStore.
- PHASE B: remote fetch of `profiles.has_onboarded` (2s timeout, retries).
- Flash occurs when:
  1. Session loads → show Onboarding (if `hasOnboarded` not yet true).
  2. Remote returns true → switch to App.
  3. Or: show Auth briefly, then session arrives, then Onboarding, then App.

**2c. No dedicated “post-onboard” load screen**  
- Splash holds until onboarding decision, but there is no explicit “loading while checking auth + sync” screen after onboarding.

### Likely Root Causes
1. Render occurs before async hydration finishes.
2. Multiple state transitions (Auth → Onboarding → App) visible in quick succession.
3. No single “bootstrap complete” gate that includes optional initial sync.

### Recommended Fixes
1. Define a startup state machine: `auth_pending` → `auth_ready` → `onboarding_check` → `bootstrap` → `ready`.
2. Keep a loading/splash screen until `ready`, with no intermediate Auth/Onboarding flash.
3. Optionally run initial sync during bootstrap and gate `ready` on it (with timeout).
4. Ensure SecureStore and remote onboarding state are read before first meaningful render.

---

## 3. Sleep Integration — No Upload, No Sync, Data Disappears

### User Expectation
- Sleep sessions are uploaded to the Supabase `sleep_sessions` table.
- Connecting Health Connect triggers sync.
- Connected Health Connect reliably loads sleep history; data does not disappear after first load.

### Evidence

**3a. Write path**  
- `syncHealthData()` in `lib/sync.ts` calls `upsertSleepSessionFromHealth()`.
- `syncHealthData` is invoked from: Dashboard `runHealthSync`, IntegrationsScreen (HC connect, import), SleepStepScreen, backgroundSync.

**3b. Read path (SleepScreen)**  
- `fetchLastSleepSession`: providers first, then `listSleepSessions` (Supabase).
- `fetchSleepSessions`: Supabase first, then providers.
- `sleepProviderOrder` determines provider order.

**3c. “Data disappears”**  
- First load: provider (or cached Supabase) returns data.
- On AppState `active`: `sleep:last` and `sleep:sessions:30d` are invalidated and refetched.
- Refetch: if provider fails or returns empty, and Supabase is empty, result is null/[].
- So: initial load shows data; refetch overwrites with empty.

**3d. “Connect doesn’t sync”**  
- IntegrationsScreen calls `syncHealthData()` after HC connect (`id === 'health_connect'`).
- Sync may fail (permissions, network, RLS) without clear feedback.
- Connect flow may not wait for sync completion before navigating away.

**3e. “HC doesn’t load history anymore”**  
- `healthConnectGetSleepSessions` may fail due to permissions, date range, or API changes.
- Or integration status (`getIntegrationStatus('health_connect')`) is not updated correctly after connect.

### Likely Root Causes
1. `syncHealthData` not running successfully (auth, RLS, network) or not being awaited.
2. Provider vs Supabase read priority causes refetch to overwrite good data with empty.
3. Connect flow not waiting for sync or not surfacing sync errors.
4. Health Connect read path (permissions, date filter, mapping) failing.

### Recommended Fixes
1. Add telemetry/logging in `syncHealthData` and `upsertSleepSessionFromHealth` (start, success, error, row count).
2. Verify RLS on `sleep_sessions` allows insert/upsert for the current user.
3. After connect: await `syncHealthData`, show progress/error, then invalidate sleep queries.
4. Consider making Supabase the primary source and provider the backfill; or merge provider + Supabase in fetch logic to avoid overwriting good data with empty.
5. Audit `healthConnectGetSleepSessions` and `getIntegrationStatus` for regressions.

---

## 4. Auto Meditation Not Starting

### User Expectation
- When the scheduled meditation time (fixed or after-wake) is reached, the notification fires and auto-starts the meditation.

### Evidence

**4a. Scheduling**  
- `scheduleMeditationAtTime` / `scheduleMeditationAfterWake` in `useMeditationScheduler.tsx` write intents and call `reconcileNotifications`.
- Meditation uses `getLatestWakeTime()` for after-wake rules; if null, fallback to fixed 8:00.

**4b. Notification tap**  
- Deep link: `reclaim://meditation?source=...&autoStart=true` or `?type=...&autoStart=true`.

**4c. MeditationScreen auto-start**  
`MeditationScreen.tsx:803-828`:
```ts
useEffect(() => {
  if (!autoStart) return;
  if (!selectedScript) return;  // ← Guard
  if (!selectedType) return;    // ← Guard
  if (didAutoStartRef.current) return;
  // ...
  setTimeout(() => onStart(true), 250);
}, [autoStart, selectedScript?.id, selectedType]);
```
- Auto-start depends on `selectedScript` and `selectedType`.
- If the screen opens from a notification without these set (e.g. no script/type in route params), the effect exits early and nothing starts.

**4d. `getLatestWakeTime`**  
- Depends on Health Connect / Google Fit / Apple Health for last sleep end.
- If no sleep data, after-wake rules fall back to a fixed time; fixed-time rules are unaffected.

### Likely Root Causes
1. `selectedScript` / `selectedType` not set when opening from notification → auto-start guard blocks.
2. `getLatestWakeTime` returns null → after-wake uses fallback, which may not match user expectation.
3. Notification not scheduled (permissions, reconcile, or intent store issue).

### Recommended Fixes
1. Derive `selectedScript` and `selectedType` from the notification deep link (e.g. `source` or `type` param) when opening from notification.
2. If `autoStart=true` and no script/type in params, apply a default (e.g. body_scan) and allow auto-start.
3. Add logging around meditation scheduling and notification delivery.
4. Document/validate fallback behavior when `getLatestWakeTime` is null.

---

## 5. Fold Screen Dimensions Stuck

### User Expectation
- When switching between large and small screens (e.g. Z Fold), layout updates to the new dimensions.

### Evidence

**5a. Static dimension usage**  
- `MoodHero.tsx`, `SleepHero.tsx`, `LifecycleHero.tsx`: `Dimensions.get('window')` in render.
- `Dashboard.tsx`, `MoodScreen.tsx`, `StarfieldFullPage.tsx`, `TrainingAnalyticsScreen.tsx`: same pattern.
- `Dimensions.get()` returns a snapshot; it does not subscribe to changes.

**5b. No dimension change listener**  
- No `Dimensions.addEventListener('change', ...)`.
- No `useWindowDimensions()` (which would re-render on change).

### Likely Root Cause
- Layout is computed once from `Dimensions.get('window')` and never updated when the window size changes (e.g. fold open/close).

### Recommended Fixes
1. Replace `Dimensions.get('window')` with `useWindowDimensions()` where layout must respond to size changes.
2. Or add `Dimensions.addEventListener('change', ...)` and force re-render / update state when dimensions change.

---

## 6. Training Delete Program — “Loading Your Updated Plan” Loop

### User Expectation
- After deleting a program, the screen should show the setup CTA (“Create program”) without an endless loading state.

### Evidence

**6a. Delete flow**  
`TrainingSetupScreen.tsx:946`:
- `deleteProgramPlan()` → deletes profile, program instances, program days.
- `invalidateQueries` for `training:profile`, `training:activeProgram`, `training:programDays:*`.
- `onComplete()` closes the setup screen.

**6b. TrainingScreen loading logic**  
`TrainingScreen.tsx:262-269`:
```ts
const isInPostSetupReconcile = setupJustCompletedAt !== null && Date.now() - setupJustCompletedAt < 10_000;
const shouldShowLoading =
  isInPostSetupReconcile ||
  profileQ.isLoading ||
  activeProgramQ.isLoading ||
  profileQ.isFetching ||
  activeProgramQ.isFetching;
```
- `setupJustCompletedAt` is not set on delete (only on setup completion).
- `shouldShowLoading` is true when `profileQ` or `activeProgramQ` is loading/fetching.

**6c. After delete**  
- Invalidation triggers refetch.
- `getTrainingProfile()` and `getActiveProgramInstance()` return null/empty (profile and program are deleted).
- When refetch completes, `profileQ.data` and `activeProgramQ.data` are null.
- `shouldShowLoading` should become false once refetch completes.

**6d. Loop hypothesis**  
- If something repeatedly invalidates these queries, or if the query functions throw in a way that causes constant retry, loading could persist.
- Possible triggers: parent effect, navigation focus, or query dependency causing re-invalidation.

### Likely Root Causes
1. Repeated invalidation or refetch (e.g. from focus, dependency, or parent effect).
2. Query error handling causing retries that keep `isFetching` true.
3. `setupJustCompletedAt` or similar state incorrectly keeping loading visible (less likely for delete).

### Recommended Fixes
1. Add logging around `training:profile` and `training:activeProgram` query lifecycle (fetch start, success, error).
2. After delete, avoid invalidating queries that would trigger unnecessary refetches; or invalidate once and avoid chained invalidations.
3. Consider a short “post-delete” state that explicitly shows the setup CTA and suppresses loading after delete, instead of relying only on query state.

---

## Priority & Sequencing

| # | Issue                      | Priority | Effort (est.) | Dependencies |
|---|----------------------------|----------|---------------|--------------|
| 3 | Sleep integration          | P0       | High          | None         |
| 1 | Training notifications     | P0       | Medium        | None         |
| 2 | Login/onboarding flash     | P1       | Medium        | None         |
| 4 | Auto meditation            | P1       | Low           | None         |
| 6 | Training delete loop       | P1       | Low           | Instrumentation first |
| 5 | Fold dimensions            | P2       | Low           | None         |

---

## Next Steps

1. Confirm findings with logs/telemetry where possible.
2. Implement fixes in priority order.
3. Add regression tests or manual checklists for each area.
