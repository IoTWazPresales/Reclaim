# Reclaim Repo — Read-Only Deep Audit Report

**Date:** 2026-01-28  
**Scope:** PHASE 0–6 per specification. No files modified; no formatting; no commits.

---

## PHASE 0 — BASELINE + REPO ORIENTATION

### 1) pwd

```
Path
----
C:\Reclaim
```

(Note: PowerShell `Get-Location` output; `pwd` alias may vary.)

### 2) ls (Get-ChildItem)

```
Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
d-----        2026/01/28     12:31                .cursor
d-----        2026/01/28     12:31                .github
d-----        2026/01/28     12:31                app
d-----        2026/01/28     12:31                docs
d-----        2026/01/28     12:31                scripts
-a----        2026/01/28     12:31            172 .gitignore
-a----        2026/01/28     12:31           3509 AGENT_RULES.md
-a----        2026/01/28     12:31             64 commit-message.txt
-a----        2026/01/28     12:31           9021 DUPLICATE_LOGIC_MAP.md
-a----        2026/01/28     12:31              0 env.example
-a----        2026/01/28     12:31           1109 MILESTONE_AGENT.md
... (AGENT_RULES, README, RUNTIME_TRUTH_REPORT, SAFE_FIX_PLAN, TRAINING_*, UI_REALITY_MATRIX, etc.)
```

### 3) git status --short

```
warning: unable to unlink 'C:/Reclaim/.git/index.lock': Invalid argument
```

(No other output; working tree otherwise clean per initial snapshot.)

### 4) git branch --show-current

```
main
```

### 5) git log -15 --oneline

```
31c1b0e chore: EAS preview readiness hardening (HealthKit strings, notif channels, onboarding failsafe)
4d898ea Harden Medication Intelligence v1.2: sleep calendar days, mood trend gating, defensive missed doses
22f1545 Implement meditation timing fixes, runtime state machine, and onboarding resilience v2
d92bc30 Add insight rotation policy and fix onboarding reappearance
18601f5 Add safe insight telemetry: insight_shown, insight_feedback_submitted, insight_refresh_pressed
6d6005b Move Muscle Frequency control to Baseline screen in collapsed Advanced section
2fafda6 Fix dateUtils test to handle UTC timezone environments
8e8a618 Merge pull request #7 from IoTWazPresales/feature/muscle-frequency-preference
b190ddf Implement milestone-002: Muscle Frequency Preference (1x vs 2x per week)
9f76a74 Fix timezone handling in training program scheduling
1b19bdc Fix Sunday scheduling bug in training program generation
f506d39 fix: centralize notification scheduling and eliminate duplicates
ed6a608 Merge pull request #2 from IoTWazPresales/feature/insights-reminders-mood
295d11e fix: resolve training set completion and session end regressions with optimistic UI
18cf13e Merge origin/main into feature/insights-reminders-mood
```

### 6) cd app && npm ci

**FAILED.**  
`npm` is not recognized in the PowerShell session used for the audit.  
Commands were run from `c:\Reclaim`; `npm`/`npx` are not on `PATH` in that environment.  
**No fix applied** — baseline note only.

### 7) cd app && npx tsc --noEmit

**FAILED.**  
`npx` not recognized (same reason as above).

### 8) cd app && npx vitest run --passWithNoTests

**FAILED.**  
`npx` not recognized (same reason as above).

---

## PHASE 1 — FULL CODE MAP (HIGH LEVEL)

### Entry points, routing, providers

| Item | Location | Purpose |
|------|----------|---------|
| App entry | `app/App.tsx` | Config gate (Supabase env), ErrorBoundary, SafeAreaProvider, AuthProvider, InsightsProvider, DeepLinkAuthBridge, RootNavigator. AppShell: useNotifications, reconcileNotifications, background sync init, telemetry. |
| Routing root | `app/src/routing/RootNavigator.tsx` | Stack: Auth \| Onboarding \| App. Gating by session + onboarding (local SecureStore + remote `profiles.has_onboarded`). Splash while boot/remote unknown. |
| App navigator | `app/src/routing/AppNavigator.tsx` | Drawer; HomeTabs, Sleep, Mood, Meds, Training, Mindfulness, Meditation, Integrations, Notifications, About, DataPrivacy, ReclaimMoments, Diagnostics (__DEV__). |
| Onboarding navigator | `app/src/routing/OnboardingNavigator.tsx` | Stack: Welcome, Capabilities, MoodCheckin, Reset, Meds, Sleep, Finish. |
| Auth provider | `app/src/providers/AuthProvider.tsx` | Session from Supabase auth; `onAuthStateChange`; `setSession` on token refresh. |
| Insights provider | `app/src/providers/InsightsProvider.tsx` | Insights context for Dashboard/cards. |

### Major modules / screens

| Module | Key files | Purpose |
|--------|-----------|---------|
| Auth | `AuthScreen.tsx`, `lib/auth.ts` | Sign-in, OAuth, magic link; Supabase auth. |
| Onboarding | `screens/onboarding/*`, `completeOnboarding.ts`, `state/onboarding.ts` | Flow + local `hasOnboarded` (SecureStore) and remote `profiles.has_onboarded`. |
| Dashboard | `Dashboard.tsx` | Home tabs hero, sync status, runHealthSync, pull-to-refresh, insights, routines. |
| Sleep | `SleepScreen.tsx`, `lib/sync.ts` (syncHealthData, importSamsungHistory), `lib/api.ts` (sleep CRUD) | Sleep UI, provider connect, import modal, add manual session, wake detection; health sync writes `sleep_sessions`. |
| Mood | `MoodScreen.tsx`, `lib/api.ts` (mood_checkins, mood_entries) | Mood logging, list, Supabase upsert. |
| Meds | `MedsScreen.tsx`, `MedDetailsScreen.tsx`, `lib/api.ts` (meds, meds_log) | Meds CRUD, logging, reminders. |
| Training | `TrainingScreen.tsx`, `TrainingSetupScreen.tsx`, `lib/training/*`, `lib/api.ts` (training_*) | Sessions, sets, program, offline queue → Supabase. |
| Meditation | `MeditationScreen.tsx`, `lib/sync.ts` (syncAll), local meditations | Session recording, `syncAll` (mood + meditation upsert). |
| Mindfulness | `MindfulnessScreen.tsx` | Mindfulness UI; writes via API. |
| Integrations | `IntegrationsScreen.tsx`, `useHealthIntegrationsList`, health providers | Connect/disconnect Health Connect, Google Fit, etc.; Samsung import. |
| Settings | `SettingsScreen.tsx`, `lib/userSettings.ts`, `lib/backgroundSync.ts` | User prefs, feedback→logs, background sync toggle. |
| Data & Privacy | `DataPrivacyScreen.tsx`, `lib/dataPrivacy.ts` | Export, delete-all, reset onboarding. |

### Core services

| Service | Key files | Purpose |
|---------|-----------|---------|
| Supabase client | `lib/supabase.ts` | `createClient` with PKCE, SecureStore/AsyncStorage fallback for session. |
| API layer | `lib/api.ts` | All Supabase reads/writes (profiles, entries, meds, mood, sleep, training, insights, etc.). `requireUser` for RLS. |
| Sync layer | `lib/sync.ts` | `syncAll` (mood + meditation upsert only), `syncHealthData` (HC + GF sleep/activity/vitals, writes `sleep_sessions`, `activity_daily`, `vitals_daily`), `importSamsungHistory`, `syncHistoricalHealthData` (unused). |
| Health providers | `lib/health/healthConnectService.ts`, `googleFitService.ts`, `providers/googleFit.ts`, `appleHealthKit.ts`, `samsungHealthService.ts` | Read sleep/activity/vitals; no direct Supabase writes. |
| Notifications | `lib/notifications/NotificationScheduler.ts` | Schedule/cancel reminders; `reconcileNotifications`; inserts `notification_events`. |
| Background sync | `lib/backgroundSync.ts` | `enableBackgroundHealthSync` / `disableBackgroundHealthSync`; TaskManager + BackgroundFetch run `syncHealthData`. |
| Telemetry / logs | `lib/telemetry.ts` (`app_logs`), `lib/logger.ts` (`logs`) | `logTelemetry` → `app_logs`; `logger.logError` / `logger.warn` → `logs`. |

### Module map (concise)

| Module | Key files | Purpose | Key dependencies |
|--------|-----------|---------|------------------|
| App shell | `App.tsx` | Config, ErrorBoundary, providers, background sync init | AuthProvider, InsightsProvider, RootNavigator |
| Routing | `RootNavigator`, `AppNavigator`, `OnboardingNavigator` | Auth / onboarding / app gating | AuthProvider, onboarding state, Supabase `profiles` |
| Dashboard | `Dashboard.tsx` | Home, sync, insights, routines | `syncHealthData`, runHealthSync, InsightsProvider |
| Sleep | `SleepScreen.tsx`, `sync.ts`, `api.ts` | Sleep UI, connect, import, manual add | `syncAll` (connect effect), `syncHealthData` (not called from Sleep), `listSleepSessions`, `addSleepSession`, `upsertSleepSessionFromHealth` |
| Mood | `MoodScreen.tsx`, `api.ts` | Mood CRUD | mood_checkins, mood_entries |
| Meds | `MedsScreen`, `MedDetailsScreen`, `api.ts` | Meds + logs | meds, meds_log |
| Training | `TrainingScreen`, `TrainingSetupScreen`, `offlineSync`, `api.ts` | Sessions, program, offline queue | training_sessions, training_set_logs, etc. |
| Meditation | `MeditationScreen`, `sync.ts` | Record + `syncAll` | meditation_sessions (via syncAll) |
| Integrations | `IntegrationsScreen`, health hooks | Connect providers, Samsung import | `importSamsungHistory`, `syncHealthData` not used |
| Settings | `SettingsScreen`, `userSettings`, `backgroundSync` | Prefs, feedback, background sync | `logs`, `app_logs`, `syncHealthData` (background) |

---

## PHASE 2 — “WHERE DOES THE APP WRITE TO SUPABASE?” (COMPLETE WRITE MAP)

All write paths below. `api.ts` uses `requireUser()` unless noted.

### Auth / profile

| Feature area | Table | Operation | Writer function (file::fn) | Trigger / call site | Notes |
|--------------|-------|-----------|----------------------------|---------------------|-------|
| Auth/Profile | `profiles` | upsert | `api::ensureProfile` | `completeOnboarding`, `PermissionsScreen` finish, `AuthScreen` post-OAuth | `has_onboarded: false` on ensure |
| Auth/Profile | `profiles` | upsert | `completeOnboarding` | Welcome/Finish “Skip”/“Finish” | `has_onboarded: true` |
| Auth/Profile | `profiles` | upsert | `PermissionsScreen` | Finish onboarding | `has_onboarded: true` |
| Auth/Profile | `profiles` | upsert | `GoalsScreen` | Goals step | `goals` only |
| Auth/Profile | `profiles` | update | `RootNavigator::onFinishOnboarding` | Onboarding done | `has_onboarded: true` |
| Auth/Profile | `profiles` | upsert | `api::ensureProfile` (logout path) | `api` logout flow | `has_onboarded: false` |
| Auth/Profile | `profiles` | update | `dataPrivacy::deleteAllPersonalData` | Data & Privacy delete-all | `has_onboarded: false` |

### Onboarding

(Covered above under Auth/Profile.)

### Mood

| Feature area | Table | Operation | Writer function (file::fn) | Trigger / call site | Notes |
|--------------|-------|-----------|----------------------------|---------------------|-------|
| Mood | `mood_entries` | upsert | `sync::syncAll` (via `supabase.from('mood_entries').upsert`) | Dashboard refresh, MeditationScreen post-save, SleepScreen connect-count effect, AnalyticsScreen “Sync now” | `syncAll` upserts mood + meditation only |
| Mood | `mood_checkins` | insert | `api::createMoodCheckin` | MoodScreen, onboarding MoodCheckin | |
| Mood | `mood_checkins` | update | `api` (update mood checkin) | MoodScreen edit | |
| Mood | `mood_checkins` | delete | `api` (delete mood checkin) | MoodScreen delete | |
| Mood | `mood_entries` | upsert | `api` (mood entry upsert) | MoodScreen | |

### Sleep

| Feature area | Table | Operation | Writer function (file::fn) | Trigger / call site | Notes |
|--------------|-------|-----------|----------------------------|---------------------|-------|
| Sleep | `sleep_sessions` | insert | `api::addSleepSession` | Manual add (SleepScreen), `api::resolveSleepCandidate` (accept) | |
| Sleep | `sleep_sessions` | upsert | `api::upsertSleepSessionFromHealth` | `sync::syncHealthData` (HC + GF), `sync::importSamsungHistory`, `sync::syncHistoricalHealthData` (unused) | ID from `sleepSessionId(userId, startISO, endISO)` |
| Sleep | `sleep_prefs` | upsert | `api::upsertSleepPrefs` | `sleepSettings::saveSleepSettings` (SleepScreen settings), Settings sleep prefs | |
| Sleep | `sleep_candidates` | insert | `api::insertSleepCandidate` | UI add candidate | |
| Sleep | `sleep_candidates` | delete | `api::resolveSleepCandidate` | Accept/reject candidate | |

### Training

| Feature area | Table | Operation | Writer function (file::fn) | Trigger / call site | Notes |
|--------------|-------|-----------|----------------------------|---------------------|-------|
| Training | `training_sessions` | insert | `api::createTrainingSession` | TrainingScreen, offlineSync | |
| Training | `training_sessions` | update | `api::updateTrainingSession` | TrainingScreen, offlineSync | |
| Training | `training_session_items` | insert | `api` | TrainingSessionView, offlineSync | |
| Training | `training_session_items` | update | `api` | TrainingSessionView, offlineSync | |
| Training | `training_set_logs` | insert | `api::logTrainingSet` | TrainingSessionView, offlineSync | |
| Training | `training_post_session_checkins` | insert | `api::createPostSessionCheckin` | TrainingScreen | |
| Training | `training_profiles` | upsert | `api` | TrainingSetupScreen | |
| Training | `training_profiles` | delete | `api` | TrainingSetupScreen | |
| Training | `training_program_instances` | insert | `api::createProgramInstance` | TrainingSetupScreen | |
| Training | `training_program_days` | insert | `api::createProgramDays` | TrainingSetupScreen | |
| Training | `training_events` | insert | `api::logTrainingEvent` | TrainingScreen, TrainingSetupScreen, TrainingSessionView, offlineSync | Telemetry-style |

### Meds

| Feature area | Table | Operation | Writer function (file::fn) | Trigger / call site | Notes |
|--------------|-------|-----------|----------------------------|---------------------|-------|
| Meds | `meds` | upsert | `api` | MedsScreen add/edit | |
| Meds | `meds` | delete | `api` | MedsScreen delete | |
| Meds | `meds_log` | insert | `api::logMedDose` | MedsScreen, MedDetailsScreen | |

### Meditation / mindfulness

| Feature area | Table | Operation | Writer function (file::fn) | Trigger / call site | Notes |
|--------------|-------|-----------|----------------------------|---------------------|-------|
| Meditation | `meditation_sessions` | upsert | `sync::syncAll` (via `supabase.from('meditation_sessions').upsert`) | Same as mood above | |
| Mindfulness | `mindfulness_events` | insert | `api` | MindfulnessScreen | |
| Mindfulness | `entries` | insert/update | `api` | Various | |

### Activity / vitals (health sync)

| Feature area | Table | Operation | Writer function (file::fn) | Trigger / call site | Notes |
|--------------|-------|-----------|----------------------------|---------------------|-------|
| Activity | `activity_daily` | upsert | `api::upsertDailyActivityFromHealth` | `sync::syncHealthData`, `sync::syncHistoricalHealthData` | HC + GF |
| Vitals | `vitals_daily` | upsert | `api::upsertVitalsDailyFromHealth` | `sync::syncHealthData`, `sync::syncHistoricalHealthData` | HC + GF |

### Insights feedback

| Feature area | Table | Operation | Writer function (file::fn) | Trigger / call site | Notes |
|--------------|-------|-----------|----------------------------|---------------------|-------|
| Insights | `insight_feedback` | insert | `api::logInsightFeedback` | InsightCard (helpful / not helpful) | |
| Insights | `insight_feedback` | update | `api::updateInsightFeedback` | InsightCard | |

### Telemetry / logs

| Feature area | Table | Operation | Writer function (file::fn) | Trigger / call site | Notes |
|--------------|-------|-----------|----------------------------|---------------------|-------|
| Telemetry | `app_logs` | insert | `telemetry::logTelemetry` | AppShell launch, ErrorBoundary report, insight refresh, sync toggle, etc. | No `user_id` in insert |
| Logs | `logs` | insert | `logger::logError` | ErrorBoundary, unhandled errors, logError calls | `user_id` from `getUser` |
| Logs | `logs` | insert | `logger.warn` (production) | `logger.warn` when not __DEV__ | |
| Logs | `logs` | insert | `SettingsScreen::reportMut` | User feedback form | `user_id` can be null |

### Routines

| Feature area | Table | Operation | Writer function (file::fn) | Trigger / call site | Notes |
|--------------|-------|-----------|----------------------------|---------------------|-------|
| Routines | `routine_suggestions` | upsert | `routines::upsertRoutineSuggestionRemote` | Dashboard `persistRoutineState` | Best-effort |

### Notifications

| Feature area | Table | Operation | Writer function (file::fn) | Trigger / call site | Notes |
|--------------|-------|-----------|----------------------------|---------------------|-------|
| Notifications | `notification_events` | insert | `NotificationScheduler` | Reconcile path (e.g. `logReconciliationEvent`) | `reconcileNotifications` on app launch |

### Privacy / export / delete

| Feature area | Table | Operation | Writer function (file::fn) | Trigger / call site | Notes |
|--------------|-------|-----------|----------------------------|---------------------|-------|
| Privacy | Multiple | delete | `dataPrivacy::deleteAllPersonalData` | Data & Privacy “Delete all” | meds_log, meds, mood_entries, sleep_sessions, sleep_candidates, mindfulness_events, meditation_sessions, entries |
| Privacy | `profiles` | update | `dataPrivacy::deleteAllPersonalData` | Same | `has_onboarded: false` |

### Other

| Feature area | Table | Operation | Writer function (file::fn) | Trigger / call site | Notes |
|--------------|-------|-----------|----------------------------|---------------------|-------|
| Entries | `entries` | insert | `api::insertEntry` | Various | |
| Entries | `entries` | update | `api` | Various | |

---

## PHASE 3 — “WHY ARE SLEEP SESSIONS NOT WRITING TO SUPABASE?” (ROOT CAUSE INVESTIGATION)

### Expected pipeline (text diagram)

```
Provider (HC / GF / Samsung) → read sleep sessions
    → map to Health SleepSession (startTime, endTime, source, …)
    → syncHealthData / importSamsungHistory
    → api::upsertSleepSessionFromHealth
    → supabase.from('sleep_sessions').upsert(row, { onConflict: 'id' })
    → cache invalidation (sleep:last, sleep:sessions:30d) + UI refresh
```

- **Who reads:** `healthConnectGetSleepSessions` / `healthConnectGetLatestSleepSession`, `googleFitGetSleepSessions` / `googleFitGetLatestSleepSession`, `samsungReadSleep`.
- **Who writes:** `api::upsertSleepSessionFromHealth` (`api.ts` 893–968). Only caller that actually persists health sleep is `sync::syncHealthData` (HC + GF), `sync::importSamsungHistory` (Samsung), and `sync::syncHistoricalHealthData` (defined but never called).

### Exact write functions and call sites

| Function | File | Call sites |
|----------|------|------------|
| `upsertSleepSessionFromHealth` | `lib/api.ts` | `sync::syncHealthData` (HC loop, GF latest), `sync::importSamsungHistory`, `sync::syncHistoricalHealthData` |
| `addSleepSession` | `lib/api.ts` | Manual add on SleepScreen, `api::resolveSleepCandidate` (accept) |

### Who calls `syncHealthData` vs `syncAll`

- **`syncHealthData`** (performs sleep writes):  
  - `Dashboard`: `runHealthSync` → pull-to-refresh, “Sync” button, initial sync, app-state-active sync.  
  - `backgroundSync`: BackgroundFetch task when “Background health sync” enabled.  
- **`syncAll`** (mood + meditation only, **no** sleep):  
  - `SleepScreen`: `useEffect` on `connectedIntegrations.length` (when user connects a provider).  
  - `MeditationScreen`: after saving a session.  
  - `AnalyticsScreen`: “Sync now.”

So **SleepScreen never calls `syncHealthData`**. On connect it calls `syncAll`, which does not touch `sleep_sessions`.

### “Import” modal on SleepScreen and IntegrationsScreen

- **`processImport`** (both screens): loops over `connectedIntegrations`, sets step status (pending → running → success/error), invalidates `sleep:last` and `sleep:sessions:30d`, **but does not call any sync or import function**. No `syncAll`, no `syncHealthData`, no `importSamsungHistory`.  
- **“Import Samsung history”** explicitly calls `importSamsungHistory` and **does** write sleep (IntegrationsScreen, SleepScreen).  
- **“Import latest data”** / generic Import modal does **not** trigger any health sync or sleep write.

### Ranked likely causes (with evidence)

1. **SleepScreen uses wrong sync entrypoint (highest impact)**  
   - **Evidence:** `SleepScreen` effect on `connectedIntegrations.length` calls `syncAll` (`sync.ts` 64–112). `syncAll` only upserts `mood_entries` and `meditation_sessions`.  
   - **Location:** `app/src/screens/SleepScreen.tsx` ~945–961 (`syncAll`), `app/src/lib/sync.ts` 64–112.

2. **Import modal does not run any sync**  
   - **Evidence:** `processImport` on SleepScreen and IntegrationsScreen only updates UI state and invalidates queries; no sync/import calls.  
   - **Location:** `SleepScreen` ~485–574, `IntegrationsScreen` ~229–326.

3. **`syncHistoricalHealthData` never used**  
   - **Evidence:** Exported from `sync.ts` but no call sites.  
   - **Location:** `app/src/lib/sync.ts` 539–576; grep shows only definition.

4. **Dedupe key mismatch (start vs end date)**  
   - **Evidence:** `getExistingSleepDateKeys` uses `end_time ?? start_time` for existing rows (`sync.ts` 136–138). New sessions use `toDateKey(startTime)` (e.g. 293, 414). Overnight sleep: start = day 1, end = day 2 → existing key can be day 2, new key day 1; we may insert “duplicates” (same night) or skip incorrectly. Upsert by `id` prevents duplicate rows but can cause redundant upserts or wrong skips.  
   - **Location:** `sync.ts` 122–144, 291–294, 414–418.

5. **Google Fit early-return**  
   - **Evidence:** `syncHealthData` runs HC first, then GF. If `provider.isAvailable()` is false, it returns after HC (`sync.ts` 373–377). HC block runs first, so HC sleep can still be written.  
   - **Location:** `sync.ts` 371–388.

6. **HC/GF permissions**  
   - **Evidence:** HC uses `healthConnectHasPermissions`; GF uses `googleFitHasPermissions`. If false, HC returns `[]`, GF branch is skipped. No sleep written from that provider.  
   - **Location:** `healthConnectService` 240–242; `sync.ts` 278–285, 378–388.

7. **Session / `requireUser`**  
   - **Evidence:** `upsertSleepSessionFromHealth` uses `requireUser()`. No session → throw → no write.  
   - **Location:** `api.ts` 913–914.

8. **iOS HealthKit sleep not implemented**  
   - **Evidence:** `syncHealthData` only uses Health Connect and Google Fit. SleepScreen “Coming next” lists “iOS HealthKit sleep import.”  
   - **Location:** `sync.ts` 275–368 (HC), 371–434 (GF); no HealthKit path.

### Logs / telemetry on this path

- **Existing:** `syncHealthData` logs “Attempting to save…”, “✅ Sleep session saved…”, “❌ FAILED to upsert…” with `logger.debug` / `logger.error`; `upsertSleepSessionFromHealth` uses `console.log` / `console.error` for success and Supabase errors.  
- **Gaps:** No structured telemetry (e.g. `logTelemetry`) for “sleep_sync_start” / “sleep_sync_success” / “sleep_sync_failed” or provider-level success/fail. Hard to see in production whether sync ran, which provider, or how many sessions written.

---

## PHASE 4 — “WHY DOES ONBOARDING STILL FLASH FOR A FEW SECONDS?” (BOOT / GATING TRACE)

### Step-by-step timeline (cold start / reopen)

1. **App mount**  
   - `App.tsx` → config check → `AppShell` → `AuthProvider` → `RootNavigator`.

2. **Session bootstrap**  
   - `AuthProvider` calls `supabase.auth.getSession()` and subscribes to `onAuthStateChange`.  
   - Session can resolve quickly (cached) or later (network).

3. **RootNavigator boot**  
   - `userId = session?.user?.id ?? null`.  
   - **PHASE A (local):** `useEffect` on `userId` runs.  
     - If no `userId`: `hasOnboarded=false`, `appReady=true`, `remoteStatus=known`, `remoteOnboarded=false` → show Auth.  
     - If `userId`: `getHasOnboarded(userId)` from SecureStore.  
       - If **local true**: `setHasOnboardedState(true)`, `setAppReady(true)`, bump `checkTrigger` but **don’t wait** for remote.  
       - Else: `setHasOnboardedState(local)`, `setAppReady(true)`, bump `checkTrigger` for remote.

4. **PHASE B (remote)**  
   - `useEffect` on `[userId, checkTrigger, hasOnboarded]`.  
   - If `hasOnboarded === true`: mark remote known, skip fetch.  
   - Else: `setRemoteStatus('checking')`, fetch `profiles.has_onboarded` (with 2s timeout, retries).  
   - On success: `setRemoteStatus('known')`, `setRemoteOnboarded(remote)`, maybe upgrade local.  
   - On timeout/error after retries:  
     - If local true → treat remote known, trust local.  
     - Else → `setRemoteStatus('unknown')`, `setRemoteOnboarded(null)`.

5. **Splash vs onboarding vs app**  
   - `shouldHoldSplash = !appReady || hasOnboarded === null || (session && !localHasOnboarded && remoteOnboarded === null && !failsafeTriggered)`.  
   - **Splash** while any of: app not ready, onboarding state null, or (session + local not onboarded + remote unknown + no failsafe).  
   - **Failsafe:** If remote stays unknown >8s, `setFailsafeTriggered(true)` so we stop holding splash and can show onboarding.  
   - When not holding: **Auth** if no session; **Onboarding** if session and not `effectiveHasOnboarded`; **App** if session and `effectiveHasOnboarded`.

6. **`flowKey` remount**  
   - `flowKey = \`${navKey}:${session ? (hasOnboarded ? 'ON' : 'OFF') : 'NA'}\``.  
   - Stack `key={flowKey}` forces remount when switching Auth vs Onboarding vs App.

### Booleans that allow onboarding to show (even briefly)

- **`effectiveHasOnboarded = localHasOnboarded || remoteOnboarded === true`**  
  - `localHasOnboarded = (hasOnboarded === true)`.  
- Onboarding shows when **session exists** and **not** `effectiveHasOnboarded`.  
- So onboarding can appear if:  
  - `hasOnboarded` is false or null, **or**  
  - `remoteOnboarded` is false or null (and we’re not holding splash).

### “Few seconds” flash – best explanation

- **Initial state:** `hasOnboarded = null`, `remoteOnboarded = null`, `remoteStatus = 'idle'`.  
- **PHASE A:** We read SecureStore. If user **has** onboarded, we set `hasOnboarded=true` and `appReady=true` immediately and skip waiting for remote.  
- **PHASE B:** Runs after `checkTrigger` bump. If `hasOnboarded === true`, we mark remote known and return without fetching.  
- **Race:** Both effects run; order and batching can leave a short window where:  
  - `appReady` is true,  
  - `hasOnboarded` still null (or false) before SecureStore read resolves, or  
  - `remoteOnboarded` is still null and we haven’t yet applied “local true” or failsafe.  
- **Splash hold:** We hold until `!shouldHoldSplash`. If `hasOnboarded === null` we keep holding. So we shouldn’t show onboarding **during** hold.  
- **Flash scenario:** Once we stop holding we render **either** App **or** Onboarding. The “flash” is likely:  
  - We **briefly render Onboarding** before switching to App. That happens if we **leave** splash with `effectiveHasOnboarded === false` (e.g. `hasOnboarded` false, `remoteOnboarded` null) and **then** update to true (e.g. remote fetch or `__refreshOnboarding`).  
  - `flowKey` flip (e.g. `OFF` → `ON`) remounts the stack, so we get a visible Onboarding → App transition.  
- **Contributors:**  
  - **Default `hasOnboarded` null:** first render before PHASE A completes can leave onboarding “eligible” if we ever render before hold.  
  - **Remote unknown → failsafe:** After 8s we allow onboarding. If we then get “remote true” or “local true” and update state, we switch from Onboarding to App → flash.  
  - **`__refreshOnboarding`:** Reads local only, sets `hasOnboardedState`, resets remote to idle and bumps `checkTrigger`. That can cause a second resolution and stack remount.

**Relevant code:**  
- `RootNavigator` ~65–71 (state), ~96–127 (PHASE A), ~129–250 (PHASE B), ~306–314 (`shouldHoldSplash`), ~332–348 (render), ~298–334 (`flowKey`, `__refreshOnboarding`).  
- `state/onboarding.ts`: `getHasOnboarded` / `setHasOnboarded` (SecureStore).

### Suggested fixes (no code)

- **Option A: Avoid rendering Onboarding until remote (or timeout) resolved when session exists**  
  - Keep holding splash when `session && !effectiveHasOnboarded && remoteOnboarded === null && !failsafeTriggered` (already done).  
  - Ensure we **never** show Onboarding during “unknown”; only show after explicit `remoteOnboarded === false` or failsafe.  
  - **Trade-off:** Slightly longer splash if remote is slow; avoids flashing onboarding when we later discover user has onboarded.

- **Option B: Prefer local, reduce remounts**  
  - When local says onboarded, don’t remount when remote later confirms.  
  - e.g. use a stable `flowKey` for “onboarded” once we’ve committed to App, or avoid flipping `flowKey` when only remote catches up.  
  - **Trade-off:** More logic to keep “local vs remote” and remount behavior in sync.

- **Option C: Failsafe only as last resort**  
  - Use 8s failsafe only if we **still** don’t have local onboarded.  
  - If local is true, never show onboarding regardless of remote.  
  - **Trade-off:** If local is wrong, user stays in App until we fix local state.

---

## PHASE 5 — “HOW DOES EVERY SYNC BUTTON WORK?” (INVENTORY + TRACE)

| Sync surface | What it syncs | Source | Destination | Write tables | Entry function | Notes |
|--------------|----------------|--------|-------------|--------------|----------------|-------|
| **Dashboard “Sync”** | Health (sleep, activity, vitals) | HC, GF | Supabase | `sleep_sessions`, `activity_daily`, `vitals_daily` | `runHealthSync` → `syncHealthData` | Idempotent (upsert). Foreground. |
| **Dashboard pull-to-refresh** | Same as above + meds/calendar invalidation, insight refresh | Same | Same | Same | `onRefresh` → `runHealthSync` | Same. |
| **Dashboard initial / app-state active** | Same | Same | Same | Same | `runHealthSync` (initial sync, 60s cooldown on active) | Same. |
| **SleepScreen “Connect & sync” auto-sync** | **Mood + meditation only** | Local (AsyncStorage, etc.) | Supabase | `mood_entries`, `meditation_sessions` | `syncAll` | **No sleep.** Triggered when `connectedIntegrations.length` changes. |
| **SleepScreen “Import” modal** | **Nothing** | — | — | — | `processImport` | UI-only; no sync/import. Invalidates sleep queries. |
| **SleepScreen “Import Samsung history”** | Samsung sleep | Samsung Health | Supabase | `sleep_sessions` | `importSamsungHistory` | Writes sleep. Foreground. |
| **IntegrationsScreen “Import latest data”** | **Nothing** | — | — | — | `processImport` | Same as SleepScreen Import modal. |
| **IntegrationsScreen “Import Samsung history”** | Samsung sleep | Samsung Health | Supabase | `sleep_sessions` | `importSamsungHistory` | Same as SleepScreen. |
| **MeditationScreen post-save** | Mood + meditation | Local | Supabase | `mood_entries`, `meditation_sessions` | `syncAll` | No sleep. |
| **AnalyticsScreen “Sync now”** | Mood + meditation | Local | Supabase | `mood_entries`, `meditation_sessions` | `syncAll` | No sleep. |
| **Settings “Background health sync” toggle ON** | Health (same as Dashboard sync) | HC, GF | Supabase | `sleep_sessions`, `activity_daily`, `vitals_daily` | `enableBackgroundHealthSync` → TaskManager task → `syncHealthData` | BackgroundFetch ~1h. Idempotent. |
| **TrainingScreen mount** | Offline training queue | Local queue | Supabase | `training_sessions`, `training_session_items`, `training_set_logs` | `syncOfflineQueue` | Foreground. |
| **MoodScreen** | No explicit “Sync” button | — | — | — | — | Uses `listMood` / API; no sync button. |
| **NotificationsScreen “Refresh schedule”** | Notification schedule | Local | Reschedule only | — | `handleRefreshSchedule` | No Supabase write; reloads schedule. |

### Meditation “after wake” dependency

- **useMeditationScheduler** `scheduleMeditationAfterWake` uses **`googleFitGetLatestSleepSession` only** (no Health Connect).  
- **Location:** `hooks/useMeditationScheduler.tsx` ~199.  
- On Android with **only** Health Connect, “after wake” meditation won’t schedule.

### Meds reminders reschedule

- **Settings / SleepScreen:** “Refresh reminders”, “Use rolling avg + update reminders”, etc. call `forceRescheduleNotifications` / `reconcileNotifications`.  
- Reschedule is local; `reconcileNotifications` can insert `notification_events` (telemetry), but reminder logic itself doesn’t sync meds or sleep.

---

## PHASE 6 — FINAL RISK LIST + NEXT DEBUG STEPS (NO CODE)

### Top 10 risks / bugs (with evidence pointers)

1. **SleepScreen never runs health sync**  
   - Connects provider → `syncAll` (mood + meditation). No `syncHealthData`, so no sleep write from HC/GF.  
   - **Evidence:** `SleepScreen.tsx` ~945–961; `sync.ts` 64–112.

2. **Import modal doesn’t sync or import**  
   - “Import latest data” / Import modal only updates UI and invalidates queries.  
   - **Evidence:** `processImport` in `SleepScreen.tsx` ~485–574, `IntegrationsScreen.tsx` ~229–326.

3. **Onboarding flash**  
   - Remote unknown + failsafe or late local/remote resolution causes brief Onboarding then App.  
   - **Evidence:** `RootNavigator` flowKey, `shouldHoldSplash`, PHASE A/B effects.

4. **Dedupe key mismatch (start vs end date)**  
   - Existing keys use `end_time ?? start_time`; new use `startTime`. Overnight sessions can be mishandled.  
   - **Evidence:** `sync.ts` 122–144, 291–294, 414–418.

5. **`syncHistoricalHealthData` dead code**  
   - Never called; historical GF backfill never runs from UI.  
   - **Evidence:** `sync.ts` 539–576; grep.

6. **Meditation “after wake” HC gap**  
   - Uses only Google Fit; Health-Connect-only users don’t get “after wake”.  
   - **Evidence:** `useMeditationScheduler.tsx` ~199.

7. **iOS HealthKit sleep not implemented**  
   - `syncHealthData` only HC + GF.  
   - **Evidence:** `sync.ts`; SleepScreen “Coming next”.

8. **`app_logs` insert has no `user_id`**  
   - `logTelemetry` doesn’t set `user_id`; RLS or analytics may expect it.  
   - **Evidence:** `lib/telemetry.ts` 10–16.

9. **User feedback `logs` insert with null `user_id`**  
   - `reportMut` uses `userId ?? null`; insert can fail if RLS requires user.  
   - **Evidence:** `SettingsScreen.tsx` ~422–443.

10. **Google Fit early-return**  
    - If GF unavailable, `syncHealthData` returns after HC block. HC sleep still runs; GF sleep skipped.  
    - **Evidence:** `sync.ts` 371–377.

### Device test checklist

1. **Sleep sync → Supabase**  
   - Connect Health Connect or Google Fit **from Integrations**.  
   - On **Dashboard**, pull-to-refresh or tap “Sync”. Confirm `sleep_sessions` rows (e.g. Supabase dashboard or API).  
   - On **Sleep** tab, connect a provider; confirm **no** sleep sync runs from that action (only `syncAll`).  
   - Open **Import** modal on Sleep; confirm **no** sync/import, only UI + invalidation.  
   - Use **“Import Samsung history”** (if Samsung); confirm new `sleep_sessions` rows.

2. **Onboarding flash**  
   - Fresh install (or reset onboarding). Complete onboarding.  
   - Force-close, reopen. Note whether onboarding appears **at all** (even briefly) before App.  
   - Repeat with slow network (throttling) to stress remote fetch and 8s failsafe.

3. **Each sync path**  
   - **Dashboard:** Sync button, pull-to-refresh; verify health sync (e.g. `sleep_sessions`).  
   - **Sleep:** Connect provider → expect no sleep write; Samsung import → expect sleep write.  
   - **Integrations:** Import latest → no write; Samsung import → sleep write.  
   - **Meditation:** Save session → `syncAll` (mood + meditation), no sleep.  
   - **Analytics:** “Sync now” → `syncAll` only.  
   - **Settings:** Background sync ON → trigger BackgroundFetch (or wait); verify `syncHealthData` ran (e.g. logs).

### “What to log” (where to add logs later; do not add now)

- **`sync.ts` `syncHealthData`:**  
  - Start: provider list, permissions state.  
  - Per provider: “about to read sleep”, “read N sessions”, “about to upsert M”, “upsert done” / “upsert failed”.  
  - End: “syncHealthData done”, `sleepSynced`, `activitySynced`, `debug`.
- **`sync.ts` `syncAll`:**  
  - “syncAll called” (and from where, if easy), “mood/meditation upsert done”.
- **`api.ts` `upsertSleepSessionFromHealth`:**  
  - “upsert start” (id, source, start/end), “upsert ok” vs “upsert error” (with code/message).
- **`RootNavigator`:**  
  - “PHASE A done” (userId, local, appReady), “PHASE B start”, “PHASE B done” (remote, remoteStatus, effectiveHasOnboarded), “shouldHoldSplash” (value + why), “render Auth|Onboarding|App”.
- **Telemetry:**  
  - Optional `logTelemetry` for “sleep_sync_start”, “sleep_sync_success”, “sleep_sync_failed” (with provider/reason) to analyze sync outcomes in production.

---

## UNKNOWNS

- **npm / npx:** Not on `PATH` in audit environment. Could not run `npm ci`, `npx tsc --noEmit`, or `npx vitest run`. TypeScript and test status **UNKNOWN**.
- **Supabase schema:** No migrations or schema files in repo. Exact columns, RLS, and triggers for `sleep_sessions`, `app_logs`, `logs`, etc. **UNKNOWN**; assumed from usage.
- **Env / credentials:** `env.example` is empty. No `.env` or real Supabase keys inspected. RLS behavior and `app_logs`/`logs` behavior in production **UNKNOWN**.
- **BackgroundFetch behavior:** Real interval and success rate on device **UNKNOWN**; only code paths audited.
- **Health Connect / Google Fit on device:** Permissions and availability **UNKNOWN**; not run on physical device.

---

*End of audit report.*
