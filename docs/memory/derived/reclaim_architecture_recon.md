# Reclaim — architecture recon (evidence-based)

## App composition root

| Artifact | Role |
|----------|------|
| `app/App.tsx` | Reanimated init, Sentry `initSentry()`, `QueryClientProvider`, `AuthProvider`, `InsightsProvider`, `FeedbackProvider`, `RootNavigator`, notification handler, `enableBackgroundHealthSync` / `disableBackgroundHealthSync`, `useAppUpdates`, `runPlayIntegrityMonitor` (Android) |
| `app/src/routing/RootNavigator.tsx` | Auth vs onboarding vs app; deep linking `reclaim://`; `requestHealthSync` on login; `HealthDisclaimerModal` |

## Navigation structure

**Root stack** (`RootNavigator`): `Auth` | `Onboarding` | `App`.

**Onboarding** (`OnboardingNavigator.tsx`): `Welcome`, `Capabilities`, `MoodCheckin`, `Reset`, `Meds`, `Sleep`, `Finish`.

**Main app** (`AppNavigator.tsx`): **Drawer** with:

- `HomeTabs` → `TabsNavigator` (hidden drawer item)
- Drawer screens: `Sleep`, `Mood`, `Meds` (stack), `Training`, `Mindfulness`, `Meditation`, `Integrations`, `Notifications`, `About`, `DataPrivacy`, `ReclaimMoments`, `EvidenceNotes` (hidden from drawer), `Diagnostics` (**`__DEV__` only**)

**Tabs** (`TabsNavigator.tsx`): `Home` → `Dashboard`; `Analytics`; `Settings`.

**Meds stack** (`MedsStack.tsx`): `MedsHome`, `MedDetails`.

**Training** (`TrainingScreen.tsx`): In-screen flows for setup (`TrainingSetupScreen`), active `TrainingSessionView`, analytics/history (**Inference:** nested components — file imports `TrainingAnalyticsScreen` patterns from grep).

**Deep link config** (`RootNavigator` `linking`): `home`, `analytics`, `settings`, `sleep`, `mood`, `meds`, `meds/:id`, `training`, `mindfulness`, `meditation`, `integrations`, `notifications`, `about`, `privacy`, `evidence-notes`, `moments`.

## Providers & global state

| Provider | File | Notes |
|----------|------|-------|
| Auth | `app/src/providers/AuthProvider.tsx` | Supabase session |
| Insights | `app/src/providers/InsightsProvider.tsx` | Loads `insights.json`, `fetchInsightContext`, premium `FREE_RULE_LIMIT` |
| Feedback | `app/src/providers/FeedbackProvider.tsx` | (not expanded this pass) |
| React Query | `app/src/lib/queryClient.ts` | Used app-wide |

## Data flow — remote

| System | Entry | Backend |
|--------|-------|---------|
| Primary API | `app/src/lib/api.ts` | Supabase tables (large module: mood, sleep, meds, training, feedback, …) |
| Auth | `app/src/lib/supabase.ts`, `authSessionService` | Supabase Auth |
| Telemetry | `app/src/lib/telemetry.ts` | `app_logs` table |

## Sync / background

| Component | File |
|-----------|------|
| Sync coordinator / health reasons | `app/src/sync/SyncCoordinator.ts` (imported from `RootNavigator` as `HEALTH_SYNC_REASON`) |
| Sync engine | `app/src/sync/SyncEngine.ts` (`runOncePush`, `runOncePull` used by background task) |
| Large legacy sync / sleep pipeline | `app/src/lib/sync.ts` |
| Background fetch task | `app/src/lib/backgroundSync.ts` — `BACKGROUND_HEALTH_SYNC_TASK`, invalidates React Query keys on success |

## Notifications

| Area | Files |
|------|-------|
| Scheduler / intents | `app/src/lib/notifications/NotificationScheduler.ts`, `NotificationIntentStore` |
| Hooks | `app/src/hooks/useNotifications.ts` (referenced from `App.tsx`) |
| Health triggers | `app/src/lib/health/notificationTriggers.ts` |
| Calendar nudges | `app/src/lib/wellness/wellnessCalendarContextNudges.ts` |
| Expo plugin | `app/plugins/withExpoNotificationsChronometer.js` |

## Insights / recommendations

| Layer | File |
|-------|------|
| Rules | `app/src/data/insights.json` |
| Engine | `app/src/lib/insights/InsightEngine.ts` |
| Context assembly | `app/src/lib/insights/contextBuilder.ts` |
| Sleep slice | `app/src/lib/insights/sleepInsightContext.ts` |
| Training slice | `app/src/lib/insights/trainingInsightContext.ts` |
| Calendar slice | `app/src/lib/insights/calendarInsightContext.ts` |
| UI | `app/src/components/InsightCard.tsx` |

## Health integrations

| Platform | Implementation |
|----------|----------------|
| Android HC | `app/src/lib/health/healthConnectService.ts`, plugins under `app/plugins/withHealthConnect*.js` |
| Apple Health | `app/src/lib/health/providers/appleHealthKit.ts`, `integrations.ts` METRICS bundle |
| Samsung | `app/src/lib/health/samsungHealthService.ts` (referenced from integration store — **partial read this pass**) |
| Integration registry UI | `app/src/screens/IntegrationsScreen.tsx`, `integrationStore.ts` |

## Training / exercise

- **API:** `app/src/lib/api.ts` — `TrainingSessionRow`, `listTrainingSessions`, etc.
- **UI:** `TrainingScreen.tsx`, `TrainingSetupScreen.tsx`, `TrainingSessionView`, `TrainingHistoryView` (Phase 7 references), notifications for sets/rest.

## Caching / local persistence

- **AsyncStorage:** onboarding, wellness nudges, notification keys (multiple modules).
- **Secure storage:** `expo-secure-store` plugin — onboarding flags (**Inference:** `getHasOnboarded` / `markOnboardingComplete`).

## Duplication / fragmentation (known)

1. **Health documentation vs manifest** — `HEALTH_API_COVERAGE.md` vs `withHealthConnectPermissions.js` + `HEALTH_CONNECT_DEFAULT_METRICS` (**conflict** — see `reclaim_policy_audit.md`).
2. **Multiple doc hubs** — `app/Documentation/*` (phase audits) vs new `docs/memory/derived/*` — intentional; derived docs **point** to phase files.
3. **`app/docs/` vs `docs/`** — repo has both; **canonical SoT README** is `docs/README_SOURCE_OF_TRUTH.md`.
4. **Sync logic surface area** — `lib/sync.ts` is very large; `sync/SyncEngine.ts` is narrower — **Inference:** historical layering; not refactored in this task.

## Dead / legacy (evidence-based)

- **Google Fit** — no symbols in `app/src` / `app/*.ts` grep; `HEALTH_API_COVERAGE.md` states removal; legacy rows may still have `source: googlefit` in DB (**doc claim**).
- **Diagnostics screen** — dev-only registration in `AppNavigator.tsx`.

## Native project layout

- **Repo root `.gitignore`** (evidence: `c:\Reclaim\.gitignore`) lists `app/android/` and `app/ios/` as ignored — **default** clone may not contain native projects; local dev may generate them via prebuild. EAS builds use cloud agents / clean checkouts per Expo docs (**Inference**).

## Memory system (procedural)

- **Baseline:** `docs/memory/derived/reclaim_canonical_memory_status.md` (**PROVISIONAL CANONICAL MEMORY v0.9**).
- **Pending chat/policy imports:** `reclaim_export_backfill_queue.md`, `reclaim_provisional_origin_note.md`.

*Historical architecture **plans** (strangler JSON, wearables) live in raw Codex + `reclaim_discussion_recon.md`; this file maps the **current** tree unless a future export changes that narrative.*
