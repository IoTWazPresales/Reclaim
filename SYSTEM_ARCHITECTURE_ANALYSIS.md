# Reclaim — System Architecture Analysis (Read-Only)

**Scope:** `app/src/**`, routing, screens, lib, hooks, providers, health, notifications, training, meditation, sync, api, App, RootNavigator, app.config, supabase, background tasks.  
**Rules:** No code changes, no refactors, no formatting. Purely analytical.

---

## STEP 1 — Full Repo Comprehension

### 1.1 High-level architecture (textual)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  App.tsx                                                                     │
│  Config gate (Supabase env) → ErrorBoundary → SafeAreaProvider               │
│  → AuthProvider → InsightsProvider → DeepLinkAuthBridge → RootNavigator      │
│  AppShell: useNotifications, reconcileNotifications, background sync init,   │
│  telemetry (app_launched), AppState → session refresh                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  RootNavigator                                                               │
│  Stack key=flowKey (navKey:session:hasOnboarded).                            │
│  Splash (splash.png + ActivityIndicator) while shouldHoldSplash.             │
│  Then: Auth | Onboarding | App (Drawer)                                      │
│  Gating: session, hasOnboarded (local), remoteOnboarded, failsafe 8s         │
└─────────────────────────────────────────────────────────────────────────────┘
         │                    │                         │
         ▼                    ▼                         ▼
    AuthScreen         OnboardingNavigator         AppNavigator (Drawer)
    (OAuth, magic      Welcome→…→Finish            HomeTabs, Sleep, Mood,
     link, PKCE)        completeOnboarding          Meds, Training, Mindfulness,
                        setHasOnboarded             Meditation, Integrations,
                        profiles upsert             Notifications, About,
                                                    DataPrivacy, ReclaimMoments,
                                                    Diagnostics (__DEV__)
```

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Data flow                                                                   │
│                                                                              │
│  UI (screens) → hooks (useHealthIntegrationsList, useMedReminderScheduler,   │
│       useMeditationScheduler, useNotifications) → lib                        │
│                                                                              │
│  • API path:    UI → api.ts (requireUser, CRUD) → supabase client → Supabase │
│  • Sync path:   UI → sync.ts (syncAll / syncHealthData / importSamsung*)     │
│                 → health providers (HC, GF, Samsung, Apple) → api upserts    │
│                 → Supabase                                                   │
│  • Notifications: NotificationScheduler, useNotifications, useMeditation*,   │
│                 refillReminders, health/notificationTriggers                 │
│                 → expo-notifications → OS.                                   │
│                 Actions (e.g. Taken, Snooze) → useNotifications handler      │
│                 → logMedDose / navigate / schedule snooze                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Core modules and responsibilities

| Module | Location | Responsibility |
|--------|----------|----------------|
| **Auth** | `AuthProvider`, `AuthScreen`, `lib/auth` | Session via Supabase PKCE/OAuth; `getSession`, `onAuthStateChange`, `refreshSessionIfNeeded`; deep link tokens → `setSession`. |
| **Onboarding** | `state/onboarding`, `screens/onboarding/*`, `completeOnboarding` | Local `hasOnboarded` (SecureStore per user); remote `profiles.has_onboarded`; RootNavigator gating; `__refreshOnboarding` global. |
| **Dashboard** | `Dashboard` | Home tabs hero, `runHealthSync` (syncHealthData), pull-to-refresh, initial sync, app-state-active sync (60s cooldown), quick mood, insights, routines. |
| **Sleep** | `SleepScreen`, `lib/sync`, `lib/api` (sleep), `sleep/*` | Sleep UI, connect flow, Import modal, manual add, wake detection; `listSleepSessions`, `addSleepSession`; health sync writes via `syncHealthData` (not invoked from Sleep Import). |
| **Mood** | `MoodScreen`, `api` (mood_checkins, mood_entries), local `@reclaim/mood/v1` | Mood logging; local-first then `syncAll` upsert to `mood_entries`; checkins → Supabase. |
| **Meds** | `MedsScreen`, `MedDetailsScreen`, `api` (meds, meds_log), `useMedReminderScheduler` | Meds CRUD; med reminders (scheduleMedReminderActionable); refill reminders (`refillReminders`). |
| **Training** | `TrainingScreen`, `TrainingSetupScreen`, `lib/training/*`, `offlineQueue`, `offlineSync` | Sessions, sets, program, offline queue → Supabase; `syncOfflineQueue` on mount. |
| **Meditation** | `MeditationScreen`, `lib/meditation*`, `syncAll` | Session recording; local `@reclaim/meditations/v1`; post-save `syncAll` upsert to `meditation_sessions`. |
| **Mindfulness** | `MindfulnessScreen`, `api` (mindfulness_events) | Logging → Supabase; health triggers → mindfulness notifications. |
| **Integrations** | `IntegrationsScreen`, `useHealthIntegrationsList`, health providers | Connect/disconnect HC, GF, etc.; `handleConnectIntegration` (HC) → `syncHealthData`; `processImport` → `syncHealthData`; Samsung import. |
| **Settings** | `SettingsScreen`, `userSettings`, `backgroundSync` | User prefs (AsyncStorage); feedback → `logs`; background sync toggle. |
| **Insights** | `InsightsProvider`, `lib/insights/*`, `InsightCard` | Context builder, picker, seen store; `logInsightFeedback` → `insight_feedback`. |
| **Health** | `lib/health/*` | HC, GF, Samsung, Apple HealthKit; read-only fetch; sync layer writes via api. |
| **Sync** | `lib/sync` | `syncAll` (mood + meditation); `syncHealthData` (HC, Apple, Samsung, GF → sleep/activity/vitals); `importSamsungHistory`; `syncHistoricalHealthData` (unused). |
| **Background** | `lib/backgroundSync` | TaskManager + BackgroundFetch → `syncHealthData`; ~1h; enabled via Settings. |

### 1.3 Navigation flow (Auth → Onboarding → App)

- **No session:** `RootNavigator` shows `Auth` (AuthScreen). Deep link / OAuth → `setSession` → `onAuthStateChange` → `session` set → re-render.
- **Session, not onboarded:** `effectiveHasOnboarded` false → `Onboarding` stack (Welcome → … → Finish). `completeOnboarding` / Permissions finish → `setHasOnboarded`, profiles upsert, `__refreshOnboarding` → `hasOnboarded` true, `flowKey` change → stack remount → `App`.
- **Session, onboarded:** `effectiveHasOnboarded` true → `App` (Drawer). Tabs: Home (Dashboard), Analytics, Settings; Drawer: Sleep, Mood, Meds, Training, Mindfulness, Meditation, Integrations, Notifications, About, DataPrivacy, ReclaimMoments, Diagnostics (__DEV__).

Linking: `reclaim://`; routes for `auth`, `onboarding`, `home`, `sleep`, `mood`, `meds`, `training`, `mindfulness`, `meditation`, `integrations`, `notifications`, `about`, `privacy`, `evidence-notes`, `moments`.

### 1.4 Data flow layers

- **UI → hooks → lib/api → Supabase:** Mood checkins, meds, meds_log, entries, mindfulness_events, sleep manual add, sleep_candidates, training_* writes, insight_feedback, profiles (ensureProfile, onboarding), routine_suggestions (optional remote). All use `requireUser()` unless otherwise noted.
- **UI → sync → health providers → Supabase:** `syncHealthData` (and Samsung import) read from HC/GF/Apple/Samsung; normalize; dedupe by date key; `upsertSleepSessionFromHealth`, `upsertDailyActivityFromHealth`, `upsertVitalsDailyFromHealth`. `syncAll` reads local mood/meditation, upserts to `mood_entries`, `meditation_sessions`.
- **Notifications → actions → Supabase:** Med reminder actions Taken/Skip → `logMedDose` (mutates `meds_log`). Snooze → reschedule only (local). Reconciliation → `notification_events` insert. Tap-only routes (Mood, Sleep, Training, etc.) navigate; no direct write except when actionable med handler runs.

### 1.5 Local storage layers

- **SecureStore:** `state/onboarding` (`reclaim_has_onboarded_v1`, `reclaim_has_onboarded_v1:<userId>`); Supabase session storage (lib/supabase) with AsyncStorage fallback when payload > ~1900 chars (`@reclaim/supabase/fallback/*`).
- **AsyncStorage:**  
  - `@reclaim/mood/v1`, `@reclaim/meditations/v1`, `@reclaim/meds/logs/v1` (api);  
  - `@reclaim/sync/last` (sync);  
  - `@reclaim/sleep/settings`, `@reclaim/sleep/wakeDetections` (sleepSettings);  
  - `@reclaim/meditation:autoStart:notificationIds:v1` (meditation scheduler);  
  - `@reclaim/meditation/settings/v1`, `@reclaim/meditations/voice_pref` (meditation);  
  - `@reclaim/meditations/active` (meditationRuntime);  
  - `reclaim:meditationSources:v1`, `reclaim:meditationDefaultSource:v1` (meditationSources);  
  - `@reclaim/refillReminders:v1` (refillReminders);  
  - `@reclaim/notifications/planFingerprint`, `@reclaim/notifications/lastScheduled` (NotificationScheduler);  
  - `settings:notificationPrefs`, `settings:user:v1` (notificationPreferences, userSettings);  
  - `settings:routine_templates:v1` (routineSettings);  
  - `@reclaim/routines/<date>`, `@reclaim/routine_intent` (routines);  
  - `@reclaim/training/offline_queue` (training offline);  
  - `@reclaim/providerPreference:v1` (providerPreferences);  
  - `@reclaim/just_onboarded_hint` (completeOnboarding, Dashboard);  
  - `recovery:progress:v1` (recovery);  
  - `streaks:v1` (streaks);  
  - `@reclaim/health/notifications/last_<triggerType>` (health notificationTriggers).
- **React Query cache:** `queryKey`-based; e.g. `sleep:last`, `sleep:sessions:30d`, `sleep:settings`, `mood:*`, `meds*`, `training:*`, `dashboard:lastSleep`, etc. Invalidated on sync/manual refetch.
- **Offline queues:** Training `@reclaim/training/offline_queue` (createSession, upsertItem, insertSetLog, finalizeSession); synced by `syncOfflineQueue` (offlineSync) to `training_sessions`, `training_session_items`, `training_set_logs`.

---

## STEP 2 — Supabase WRITE MAP

| Table | Function(s) | Screen/hook trigger | Payload shape | Op | Local/remote | Dedupe/idempotency | Silent fail? |
|-------|-------------|---------------------|---------------|-----|--------------|--------------------|--------------|
| **profiles** | `ensureProfile` (api) | AuthProvider (session established, onAuthStateChange) | `{ id, has_onboarded: false }` | insert | Remote-first | Fetch exists first; insert only if missing | No (throws) |
| **profiles** | `completeOnboarding`, PermissionsScreen | Welcome/Finish, Permissions finish | `{ id, has_onboarded: true }` | upsert | Hybrid | onConflict id | No |
| **profiles** | `RootNavigator.onFinishOnboarding` | Onboarding done | `{ has_onboarded: true }` | update | Remote | eq id | Yes (logged __DEV__ only) |
| **profiles** | `api` logout path | Logout | `{ id, has_onboarded: false }` | upsert | Remote | onConflict id | No |
| **profiles** | `dataPrivacy.deleteAllPersonalData` | Data & Privacy delete | `{ has_onboarded: false }` | update | Remote | eq id | No |
| **entries** | `insertEntry`, `upsertTodayEntry` (api) | Various | `user_id`, `day_date`, `mood`, `sleep_hours`, etc. | insert/update | Remote | upsertToday: select then update or insert | No |
| **meds** | `upsertMed`, `deleteMed` (api) | MedsScreen, MedDetails | `id`, `user_id`, schedule, etc. | upsert/delete | Remote | onConflict id, eq user_id | No |
| **meds_log** | `logMedDose` (api) | MedDetails, **Taken/Skip notification action** | `user_id`, `med_id`, `status`, `taken_at`, `scheduled_for` | insert | Remote | None | No |
| **mood_checkins** | `createMoodCheckin`, … (api) | MoodScreen, onboarding MoodCheckin | `user_id`, `rating`, `note`, `source`, etc. | insert/update/delete | Remote | — | No |
| **mood_entries** | `syncAll` (sync), api mood upsert | Dashboard/Mood/Meditation/Analytics sync, MoodScreen | `id`, `user_id`, `rating`, `note`, `created_at` | upsert | Local-first → sync | onConflict id | No (syncAll throws) |
| **meditation_sessions** | `syncAll` (sync) | Same as mood_entries | `id`, `user_id`, `meditation_type`, `start_time`, `end_time`, `duration_sec`, `note` | upsert | Local-first → sync | onConflict id | No |
| **sleep_sessions** | `addSleepSession` (api) | SleepScreen manual add, `resolveSleepCandidate` | `user_id`, `start_time`, `end_time`, `source`, etc. | insert | Remote | — | No |
| **sleep_sessions** | `upsertSleepSessionFromHealth` (api) | `syncHealthData`, `importSamsungHistory`, `syncHistoricalHealthData` | `id` (deterministic), `user_id`, `start_time`, `end_time`, `source`, `duration_minutes`, etc. | upsert | Hybrid (provider → api) | onConflict id; date-key dedupe before call | No (throws, sync catches) |
| **sleep_prefs** | `upsertSleepPrefs` (api) | sleepSettings, Settings sleep prefs | `user_id`, `typical_wake_time`, `target_sleep_minutes`, etc. | upsert | Hybrid | onConflict user_id | No |
| **sleep_candidates** | `insertSleepCandidate`, `resolveSleepCandidate` (api) | UI add, accept/reject | `user_id`, `start_guess`, `end_guess`, … | insert/delete | Remote | — | No |
| **activity_daily** | `upsertDailyActivityFromHealth` (api) | `syncHealthData`, `syncHistoricalHealthData` | `id` (user+date), `user_id`, `activity_date`, `steps`, `active_energy`, `source` | upsert | Provider → api | onConflict id | No (sync catches) |
| **vitals_daily** | `upsertVitalsDailyFromHealth` (api) | Same | `id`, `user_id`, `date`, `resting_heart_rate_bpm`, etc. | upsert | Same | onConflict id | No |
| **insight_feedback** | `logInsightFeedback`, `updateInsightFeedback` (api) | InsightCard (helpful / not helpful) | `user_id`, `insight_id`, `helpful`, `reason`, etc. | insert/update | Remote | — | No |
| **routine_suggestions** | `upsertRoutineSuggestionRemote` (routines) | Dashboard `persistRoutineState` | `routine_template_id`, `date`, `state`, etc. | upsert | Hybrid | Best-effort | Yes (catch) |
| **notification_events** | `logReconciliationEvent` (NotificationScheduler) | `reconcileNotifications` | `user_id`, `event_type: 'reconcile'`, `notification_count`, `created_at` | insert | Remote | — | Yes (ignore) |
| **training_sessions** | `createTrainingSession`, `updateTrainingSession` (api) | TrainingScreen, offlineSync | session payload | insert/update | Remote / offline queue | — | No |
| **training_session_items** | api | TrainingSessionView, offlineSync | item payload | insert/update | Same | — | No |
| **training_set_logs** | `logTrainingSet` (api) | TrainingSessionView, offlineSync | set log payload | insert | Same | — | No |
| **training_post_session_checkins** | `createPostSessionCheckin` (api) | TrainingScreen | `session_id`, `felt`, `note` | insert | Remote | — | No |
| **training_profiles** | api | TrainingSetupScreen | profile payload | upsert/delete | Remote | onConflict user_id | No |
| **training_program_instances** | `createProgramInstance`, `updateProgramInstance` (api) | TrainingSetupScreen | program payload | insert/update | Remote | — | No |
| **training_program_days** | `createProgramDays` (api) | TrainingSetupScreen | days payload | insert | Remote | — | No |
| **training_events** | `logTrainingEvent` (api) | TrainingScreen, Setup, SessionView, offlineSync | `user_id`, `event_name`, `payload` | insert | Remote | — | Yes (warn only) |
| **logs** | `logger.logError`, `logger.warn` (production), Settings `reportMut` | ErrorBoundary, unhandled errors, user feedback | `user_id`, `level`, `message`, `details`, `created_at` | insert | Remote | — | Yes (logger); reportMut throws on error |
| **app_logs** | `logTelemetry` (telemetry) | AppShell, ErrorBoundary report, insight refresh, sync, etc. | `event_name`, `severity`, `properties` (no `user_id`) | insert | Remote | — | Yes (warn) |
| **Various** | `dataPrivacy.deleteAllPersonalData` | Data & Privacy delete | — | delete | Remote | eq user_id | No |

---

## STEP 3 — Sleep Pipeline Forensic Analysis

### Per-provider flow

**Google Fit**

1. **Fetch:** `googleFitService.googleFitGetLatestSleepSession` (7d) or `provider.getSleepSessions(start, end)`; `lib/health/providers/googleFit` → `getSleepSessions`.
2. **Normalize:** Provider returns `SleepSession[]` (health types); `startTime`/`endTime` `Date`, `durationMinutes`, `source`, etc.
3. **Dedupe:** `syncHealthData` builds `existingDateKeys` via `getExistingSleepDateKeys` (Supabase `sleep_sessions` 30d window; keys from `start_time`). For each session, `dayKey = toDateKey(startTime)`; skip if `existingDateKeys.has(dayKey)`; after upsert, `existingDateKeys.add(dayKey)`.
4. **Write:** `api.upsertSleepSessionFromHealth` → `supabase.from('sleep_sessions').upsert(row, { onConflict: 'id' })`. `id = sleepSessionId(userId, startISO, endISO)`.
5. **Cache:** React Query `sleep:last`, `sleep:sessions:30d`; invalidated after sync.
6. **Invalidate:** Dashboard runHealthSync, Integrations processImport / HC connect, background task → invalidate `sleep:*`, `dashboard:lastSleep`.
7. **UI triggers:** Dashboard Sync / pull-to-refresh / initial / app-state active; Integrations Import (+ HC connect for HC); Background sync; **not** SleepScreen Import or connect-count effect.

**Health Connect**

1. **Fetch:** `healthConnectService.healthConnectGetSleepSessions(days)` → `readRecords('SleepSession', timeRangeFilter)`; `mapRecordToSleepSession` → `SleepSession[]`.
2. **Normalize:** `startTime`/`endTime` via `safeDate`; `durationMinutes` from diff; `source: 'health_connect'`; stages mapped.
3. **Dedupe:** Same as GF in `syncHealthData` (existingDateKeys, toDateKey(startTime)).
4. **Write:** Same `upsertSleepSessionFromHealth`.
5. **Cache / invalidate / UI triggers:** Same as above.

**Samsung Health**

1. **Fetch:** `samsungHealthService.samsungReadSleep(from, to)` → native module → `normalizeSessions` → `SamsungSleepSession[]`.
2. **Normalize:** `startTime`/`endTime` `Date`, `durationMinutes`, `stages`, `source: 'samsung_health'`.
3. **Dedupe:** `importSamsungHistory` uses `getExistingSleepDateKeys`; `sleepDateKeyFromSession` uses `endTime ?? startTime`; skip if key exists; add after upsert.
4. **Write:** Same `upsertSleepSessionFromHealth` with `source: 'samsung_health'`.
5. **Cache / invalidate:** Same keys; triggered by Samsung import (Integrations, SleepScreen “Import Samsung history”) and by `syncHealthData` when Samsung connected (integrationStore).
6. **UI triggers:** “Import Samsung history” (Integrations, SleepScreen); `syncHealthData` (Dashboard, Integrations Import/HC connect, background).

**Apple HealthKit**

1. **Fetch:** `syncHealthData` uses `AppleHealthKitProvider.getSleepSessions` when `getIntegrationStatus('apple_healthkit')?.connected`; `lib/health/providers/appleHealthKit`.
2. **Normalize:** Provider returns `SleepSession[]` (health types).
3. **Dedupe:** Same as HC/GF; `sleepDateKeyFromSession` for Apple loop.
4. **Write:** Same `upsertSleepSessionFromHealth` with `source: 'apple_healthkit'`.
5. **Cache / invalidate / UI triggers:** Same as HC/GF.

### Why sleep sessions might NOT be written

1. **SleepScreen “Import” modal does not run health sync**  
   **Evidence:** `SleepScreen` `processImport` (`screens/SleepScreen.tsx` ~486–575) loops over `connectedIntegrations`, updates UI steps, invalidates `sleep:last` and `sleep:sessions:30d`, calls `refreshInsight('sleep-health-import')`. It does **not** call `syncHealthData` or any sync. User sees “Sleep and activity imported” but no fetch/write occurs.  
   **Result:** Triggering sync only from Import on Sleep tab never writes sleep.

2. **SleepScreen connect-count effect runs `syncAll`, not `syncHealthData`**  
   **Evidence:** `SleepScreen` `useEffect` on `connectedIntegrations.length` (~940–964) calls `syncAll()` then invalidates sleep queries. `syncAll` (`lib/sync.ts` 67–114) only upserts `mood_entries` and `meditation_sessions`.  
   **Result:** Connecting a provider from Sleep tab runs mood/meditation sync only; no sleep write.

3. **IntegrationsScreen Import does run `syncHealthData`**  
   **Evidence:** `IntegrationsScreen` `processImport` (~264–298) calls `syncHealthData()` first, then invalidates sleep/dashboard. So from Integrations, Import **can** write sleep. Same screen also runs `syncHealthData` after Health Connect connect (with 450ms delay).

4. **Dashboard and background**  
   **Evidence:** Dashboard `runHealthSync` → `syncHealthData`; pull-to-refresh, initial sync, app-state-active sync use it. Background task runs `syncHealthData`.  
   **Result:** Sleep can be written when user syncs from Dashboard or when background sync runs, but not when user only uses Sleep Import or connect-from-Sleep.

5. **Permissions / provider availability**  
   **Evidence:** HC uses `healthConnectHasPermissions`; if false, `healthConnectGetSleepSessions` returns `[]`. GF uses `googleFitHasPermissions`; if false, sleep fetch skipped. Apple checks `getIntegrationStatus('apple_healthkit')?.connected` and `requestPermissions`. Samsung `samsungIsAvailable` / `samsungRequestPermissions`.  
   **Result:** If a provider is not available or permission denied, that provider’s sleep is never fetched or written.

6. **`requireUser`**  
   **Evidence:** `upsertSleepSessionFromHealth` uses `requireUser()`; no session → throw → no write. Callers catch and log; flow continues but that session is not persisted.

7. **Dedupe skip**  
   **Evidence:** `existingDateKeys` built from existing `sleep_sessions`; `dayKey = toDateKey(startTime)` (or `sleepDateKeyFromSession` for Samsung). If key exists, session is skipped.  
   **Result:** Already-synced nights are not re-written (by design); no bug per se, but possible confusion if user expects “rewrite.”

8. **`syncHistoricalHealthData` never used**  
   **Evidence:** Exported from `sync.ts`; no call sites.  
   **Result:** Historical GF-only backfill never runs.

---

## STEP 4 — Onboarding Flash Forensic Analysis

### 1) How onboarding state is determined

- **Local:** `state/onboarding`: `getHasOnboarded(userId)` / `setHasOnboarded(userId, value)`. SecureStore keys `reclaim_has_onboarded_v1` and `reclaim_has_onboarded_v1:<userId>`; value `'1'` or `'0'`. Legacy key migration: once read from `reclaim_has_onboarded_v1`, migrate to per-user key then delete legacy.
- **Remote:** `profiles.has_onboarded` via `supabase.from('profiles').select('has_onboarded').eq('id', userId).maybeSingle()`. RootNavigator fetches in PHASE B; 2s timeout, up to 2 retries.
- **RootNavigator state:** `hasOnboarded` (useState, init `null`), `remoteOnboarded` (`true`|`false`|`null`), `remoteStatus` (`idle`|`checking`|`known`|`unknown`), `appReady`, `failsafeTriggered`, `checkTrigger`.
- **Effective:** `localHasOnboarded = hasOnboarded === true`; `effectiveHasOnboarded = localHasOnboarded || remoteOnboarded === true`. Onboarding shows when `session` exists and **not** `effectiveHasOnboarded`.
- **flowKey:** `navKey:session:hasOnboarded` → `app:ON` / `app:OFF` / `auth:NA`. Stack `key={flowKey}` forces remount when switching Auth vs Onboarding vs App.

### 2) Timeline on app reopen

1. App mount → AuthProvider `getSession` (race with 5s timeout).
2. Session resolves → `userId` set; RootNavigator PHASE A runs (useEffect on `userId`).
3. PHASE A: `getHasOnboarded(userId)` from SecureStore. If **local true** → `setHasOnboardedState(true)`, `setAppReady(true)`, bump `checkTrigger`, return (no wait for remote). If **local false/null** → `setHasOnboardedState(local)`, `setAppReady(true)`, bump `checkTrigger`.
4. PHASE B (useEffect on `userId`, `checkTrigger`, `hasOnboarded`): If `hasOnboarded === true` → skip fetch, set remote known. Else → fetch `profiles.has_onboarded` (with timeout/retries). On success → set `remoteOnboarded`, maybe upgrade local. On failure after retries → if local true, trust local; else `remoteStatus unknown`, `remoteOnboarded null`.
5. Failsafe (useEffect): If `!userId` or `hasOnboarded === true` or `failsafeTriggered` → return. Else if `remoteStatus === 'checking'` or `(unknown && remoteOnboarded === null)` → 8s timer → `setFailsafeTriggered(true)`.
6. **Splash:** `shouldHoldSplash = !appReady || hasOnboarded === null || (session && !localHasOnboarded && remoteOnboarded === null && !failsafeTriggered)`. While true, splash shown.
7. When **not** holding: render Auth | Onboarding | App from `effectiveHasOnboarded` and `session`.

### 3) Why onboarding can appear briefly

- **Remount via `flowKey`:** When `hasOnboarded` flips from false to true (e.g. after remote fetch or `__refreshOnboarding`), `flowKey` changes (`OFF` → `ON`). Stack remounts; we switch from Onboarding to App. The **moment** we decide “show App” we render App, but that decision happens only after state updates. If we had **already** left splash showing Onboarding (because `effectiveHasOnboarded` was false), we then show Onboarding until the flip; the flip causes a visible Onboarding → App transition.
- **Order of PHASE A vs B:** We set `appReady` and `hasOnboarded` from local immediately. If local is false, we still show splash until we either get remote known or failsafe. When we **stop** holding splash, we show Onboarding if `!effectiveHasOnboarded`. So we can briefly show Onboarding **before** remote confirms true — e.g. local false, we stop holding (failsafe or we optimistically allow), we show Onboarding; then remote returns true, we set `hasOnboarded`/`remoteOnboarded`, `flowKey` changes, we remount to App. That “show Onboarding then switch to App” is the flash.
- **`__refreshOnboarding`:** Reads local, sets `hasOnboardedState`, resets remote to idle/null, bumps `checkTrigger`. That re-runs PHASE B. If we were showing Onboarding, we can flip to App after B completes; again, a brief Onboarding frame before App.
- **Race:** PHASE B runs async. Initial render can have `hasOnboarded` false (or null) and `remoteOnboarded` null. We hold splash. Once we allow (e.g. failsafe), we show Onboarding. When B later sets `remoteOnboarded` true (or local true), we switch to App. The “few seconds” fit: splash a bit, then Onboarding, then App.

So the brief onboarding appearance is from **state transitions**: we exit splash with `effectiveHasOnboarded` false, render Onboarding, then update to true and remount to App. The remount and “show Onboarding until remote/local confirm” logic are the mechanism.

---

## STEP 5 — Sync Buttons & Sync Logic Map

| Location | Trigger | Function | Providers | Tables written | Caches invalidated | Side effects |
|----------|---------|----------|-----------|----------------|--------------------|--------------|
| **Dashboard** | “Sync” button | `runHealthSync` → `syncHealthData` | HC, Apple, Samsung, GF | `sleep_sessions`, `activity_daily`, `vitals_daily` | `dashboard:lastSleep`, `sleep:*`, `sleep:settings`; sleepQ, sleepSettingsQ refetch | `refreshInsight('health-sync')`; toast |
| **Dashboard** | Pull-to-refresh | `onRefresh` → `runHealthSync` | Same | Same | Same | Same + meds/calendar invalidate, insight refresh |
| **Dashboard** | Initial mount | `runHealthSync` (no lastSync or lastSync &gt; 5min ago) | Same | Same | Same (invalidate false on first run) | — |
| **Dashboard** | App state → active | `runHealthSync` (60s cooldown) | Same | Same | Same | — |
| **Sleep** | Connect-count change | `syncAll` | — | `mood_entries`, `meditation_sessions` | `sleep:last`, `sleep:sessions:30d` | `refreshInsight('sleep-auto-sync')` |
| **Sleep** | Import modal open | `processImport` | — | **None** | `sleep:last`, `sleep:sessions:30d` | `refreshInsight('sleep-health-import')` |
| **Sleep** | “Import Samsung history” | `importSamsungHistory` | Samsung | `sleep_sessions` | Manual invalidate typically via Import UX | — |
| **Integrations** | “Import latest data” / Import | `processImport` → `syncHealthData` | HC, Apple, Samsung, GF | `sleep_sessions`, `activity_daily`, `vitals_daily` | `sleep:last`, `sleep:sessions:30d`, `dashboard:lastSleep` | `refreshInsights('integrations-import')` |
| **Integrations** | Health Connect connect | `handleConnectIntegration` → 450ms → `syncHealthData` | HC (and sync path) | Same | Same | `refreshInsights('integrations-health-connect')`; Alert |
| **Integrations** | “Import Samsung history” | `importSamsungHistory` | Samsung | `sleep_sessions` | — | Alert |
| **Meditation** | Post-session save | `syncAll` | — | `mood_entries`, `meditation_sessions` | — | — |
| **Analytics** | “Sync now” | `syncAll` | — | `mood_entries`, `meditation_sessions` | — | Alert |
| **Settings** | Background sync ON | `enableBackgroundHealthSync` | — | — | — | Registers BackgroundFetch task |
| **Background** | BackgroundFetch (~1h) | `syncHealthData` | HC, Apple, Samsung, GF | Same as Dashboard sync | None (no RQ in bg) | `logTelemetry` background_sync |
| **Training** | Mount | `syncOfflineQueue` | — | `training_sessions`, `training_session_items`, `training_set_logs` | — | `logTrainingEvent` |

**Differences:** Dashboard and Integrations (Import / HC connect) run **health** sync and write sleep/activity/vitals. Sleep Import modal does **not** run any sync. Sleep connect-count change runs **mood+meditation** sync only. Meditation and Analytics “Sync now” run **mood+meditation** only. Background task runs **health** sync. Training mount drains **offline queue** only.

---

## STEP 6 — Notification Architecture Map

### Scheduling

- **NotificationScheduler** (`lib/notifications/NotificationScheduler`): `buildNotificationPlan` from notification prefs, user settings, sleep settings → mood_morning / mood_evening, morning_review, sleep_bedtime, sleep_confirm. Fingerprint of plan; if changed, cancel all app-tag notifications, schedule new, save fingerprint. `reconcileNotifications` on app start; `forceRescheduleNotifications` clears fingerprint and reconciles. Channels: `default`, `reminder-silent`; chime from user settings → `reminder-chime` or `reminder-silent`.
- **useNotifications** (`hooks/useNotifications`): Ensures permission; creates channels `default`, `reminder-chime`, `reminder-silent`, `meditation`; registers categories (MED_REMINDER, MOOD_REMINDER, SLEEP_REMINDER, TRAINING_*); runs `reconcileNotifications`, `cleanupPastNotifications`; subscribes `addNotificationResponseReceivedListener` and `getLastNotificationResponseAsync`. Med reminders: `scheduleMedReminderActionable` (interval or calendar trigger); mood `scheduleMoodCheckinReminders` (08:00, 20:00); sleep `scheduleBedtimeSuggestion`, `scheduleMorningConfirm` (from typical wake / target). Snooze uses `snoozeMinutes` and quiet hours.
- **useMeditationScheduler:** Fixed-time or “after wake” rules. Stores notification ids in `@reclaim/meditation:autoStart:notificationIds:v1` per user. Cancel-before-schedule per rule. Deep link `reclaim://meditation?source=...&autoStart=true` or `?type=...&autoStart=true`.
- **refillReminders:** `scheduleRefillReminders` per med (weekly, 2h before first dose); stores ids in `@reclaim/refillReminders:v1`. `cancelStoredRefills` on disable.
- **health/notificationTriggers:** Heart-rate / stress triggers → `triggerMindfulnessNotification` (immediate); channel `mindfulness-health`. Dedupe: `@reclaim/health/notifications/last_<triggerType>` (once per day).
- **TrainingSessionView:** Rest “Rest complete” timer notification; `restFinishNotificationIdRef` (in-memory); cancelled on app active. “Rest started” immediate notification when backgrounded during rest.

### Dedupe / cancel

- **NotificationScheduler:** Fingerprint of plan; cancel all app-tag notifications before reschedule. No per-notification id persistence.
- **Med reminders:** `isAlreadyScheduled(medId, doseTimeISO)` before schedule; `cancelRemindersForMed(medId)` on med delete/update.
- **Meditation:** Cancel by stored id before scheduling same rule; store id per rule.
- **Refill:** Cancel all stored refill ids, then schedule again.
- **Cleanup:** `cleanupPastNotifications` drops past-due **med** reminders &gt; 24h, non-repeating.

### Actions

- **MED_REMINDER:** Taken → `logMedDose` (Supabase `meds_log`); Snooze 10m → reschedule (respect quiet hours); Skip → `logMedDose` (skipped). `opensAppToForeground: false`.
- **TRAINING_REMINDER:** Start session → navigate to Training; Snooze 15m → reschedule 15m.
- **TRAINING_SET:** Done / Edit → navigate to Training with `notification.action` params.
- **TRAINING_REST:** Next set → navigate to Training with `next_set` params.
- **Mood / Sleep:** Tap-only → navigate to Mood / Sleep; no actions.

### Supabase writes from notifications

- **Med Taken/Skip:** `logMedDose` → `meds_log` insert.
- **Reconciliation:** `logReconciliationEvent` → `notification_events` insert (`event_type: 'reconcile'`, `notification_count`). All other notification behavior is local (schedule/cancel/navigate).

### Deep links

- Med reminder tap → navigate to Meds with `focusMedId` / `focusScheduledFor`.
- Mood → `navigateToMood`.
- Sleep → `navigateToSleep`.
- Training → `navigateTo` Training; params for set_done / edit_set / next_set.
- Meditation → ` Linking.openURL(url)` with `reclaim://meditation?source=...&autoStart=true` (or type).
- Health-trigger mindfulness → `reclaim://mindfulness?intervention=...&autoStart=true`.

### Watch readiness

- **Actionable on watch:** MED_REMINDER (Taken, Snooze 10m, Skip), TRAINING_REMINDER (Start, Snooze 15m), TRAINING_SET (Done, Edit), TRAINING_REST (Next set). These use `categoryIdentifier` and `options.opensAppToForeground`. Whether they actually mirror to Apple Watch / Wear OS depends on Expo/OS behavior; typically same categories can show actions on watch.
- **Tap-only:** Mood, Sleep, morning_review, etc. No actions; tap opens app and navigates.
- **Supabase from watch:** Only Taken/Skip trigger `logMedDose`. Snooze and other actions are local. Real-device testing needed to confirm watch display, action delivery, and correct navigation/writes.

---

## STEP 7 — Caching Architecture

| Layer | What it stores | When written | When invalidated | Risks |
|-------|----------------|--------------|------------------|-------|
| **React Query** | Server state (sleep, mood, meds, training, dashboard, insights, etc.) keyed by `queryKey` | Fetch on mount / invalidation | Explicit `invalidateQueries` / `refetch` after mutations or sync | Stale UI if sync runs but relevant keys not invalidated (e.g. Sleep Import invalidates sleep but does no sync). Multiple keys for same domain (e.g. `sleep:last` vs `sleep:sessions:30d`) can get out of sync if only some invalidated. |
| **AsyncStorage `@reclaim/sync/last`** | ISO of last successful health sync | `setLastSyncISO` after `syncHealthData` (or `syncAll` for mood/meditation) | Not invalidated; overwritten on next sync | Dashboard “last synced” can disagree with what actually ran (e.g. `syncAll` updates it per current `syncAll` implementation? No — `setLastSyncISO` only in `syncAll` and `syncHealthData`; `syncHealthData` sets it only when sleep or activity synced). |
| **AsyncStorage mood/meditation/meds_log** | Local mood, meditation sessions, meds_log cache | api read/write | On sync push (mood/meditation) or on med log | Stale if user edits on another device or sync fails. |
| **AsyncStorage sleep settings / wake detections** | Sleep prefs, wake detections | sleepSettings, manual add | — | Local-only wake detections; not in Supabase. |
| **SecureStore onboarding** | `has_onboarded` per user | `setHasOnboarded` on complete / `__refreshOnboarding` | On delete-all (data privacy) | Read/write errors ignored; migration from legacy key can race with multiple readers. |
| **Supabase session storage** | Auth session | Auth login/refresh | Logout, delete-all | SecureStore overflow → AsyncStorage fallback; large tokens can hit fallback. |
| **Offline queue `@reclaim/training/offline_queue`** | Training createSession, upsertItem, insertSetLog, finalizeSession | When offline and user performs those actions | `dequeueOperation` after successful sync | Replay order matters; duplicates avoided by precheck + dequeue. |
| **Notification fingerprint / lastScheduled** | Plan fingerprint, last scheduled ISO | After reconcile | `forceRescheduleNotifications` clears fingerprint | Stale plan if prefs change but forceReschedule not called. |
| **Meditation notification ids** | Per-rule notification id | After scheduling meditation reminder | On cancel rule / reschedule | Stale ids if OS clears notifications. |
| **Refill reminder ids** | Per-med refill notification id | After scheduling | On disable / reschedule | Same as above. |
| **Health trigger “last sent”** | `last_<triggerType>` ISO | After sending trigger notification | By date (once per day) | Clock/rollover edge cases. |

---

## STEP 8 — Critical Risks Before Real User Testing

**P0 (critical)**

1. **SleepScreen Import does not sync** — User taps Import on Sleep, sees “imported” UX, but no health fetch or `sleep_sessions` write. (`SleepScreen` `processImport`; no `syncHealthData`.)
2. **SleepScreen connect effect runs `syncAll`** — Connecting a provider from Sleep triggers mood+meditation sync only; sleep never written from that flow. (`SleepScreen` useEffect on `connectedIntegrations.length` → `syncAll`.)
3. **Onboarding flash** — Reopen app can show Onboarding briefly then App due to remote/local timing and `flowKey` remount. (RootNavigator PHASE A/B, `effectiveHasOnboarded`, `flowKey`.)

**P1 (high)**

4. **`syncHistoricalHealthData` dead code** — No UI or background path calls it; historical GF backfill never runs. (`sync.ts` export only.)
5. **Meditation “after wake” uses Google Fit only** — `useMeditationScheduler` / `getLatestWakeTime` use GF (and HC on Android); iOS uses HealthKit. “After wake” on Android HC-only uses `getLatestWakeTime` which does try HC then GF; implementation varies by platform. Confirm HC-only users get correct wake time.
6. **`app_logs` insert has no `user_id`** — Telemetry writes `event_name`, `severity`, `properties` only. RLS or analytics that assume `user_id` may fail or under-count. (`telemetry.ts`.)
7. **User feedback `logs` insert with `user_id` null** — Settings `reportMut` can send `user_id: null` if auth query not ready; RLS may reject. (`SettingsScreen` reportMut.)
8. **Silent logger/telemetry failures** — `logError` / `logTelemetry` catch and warn; no retry. Errors and events can be lost. (`logger.ts`, `telemetry.ts`.)

**P2 (medium)**

9. **Background sync reliability** — BackgroundFetch ~1h, optional; device may throttle. No guarantee sleep is synced if user never opens Dashboard. (`backgroundSync.ts`.)
10. **Watch action → Supabase** — Only med Taken/Skip write. Confirm on device that watch actions actually run handler and `logMedDose`. (useNotifications handler.)
11. **Dedupe key consistency** — Samsung uses `endTime ?? startTime` for date key; others use `startTime`. Overnight sessions could theoretically collide with HC/GF keying if we ever mix keys incorrectly; currently `getExistingSleepDateKeys` uses `start_time` for existing rows. Low risk but worth keeping consistent.
12. **Race: onboarding local vs remote** — PHASE A sets `hasOnboarded` from SecureStore; PHASE B fetches remote. Brief windows where local false but remote true (or vice versa) can produce odd transitions. (RootNavigator.)
13. **EnsureProfile fetch-then-insert** — If profile created elsewhere between fetch and insert, insert can fail. (`api` `ensureProfile`.)
14. **Training offline queue replay order** — Replay by `timestamp`; precheck prevents duplicate rows but partial replay (e.g. session created, items failed) can leave inconsistent state. (`offlineSync`.)

---

*End of analysis. No code was modified.*
