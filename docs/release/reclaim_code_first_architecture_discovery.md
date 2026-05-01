# Reclaim — code-first architecture & orchestration discovery

**Method:** Grep + file reads of `app/` **only** for Phase 1. **No** prior audit doc used as source of truth for structure. Phase 2 compares to prior docs.

---

## Executive summary

The codebase has **clear anchors**:

1. **`fetchInsightContext`** (`app/src/lib/insights/contextBuilder.ts`) — **only** invoked from **`InsightsProvider.refresh()`** (`app/src/providers/InsightsProvider.tsx`). **No** other module calls `fetchInsightContext` directly (**direct evidence**: grep across `app/`).

2. **`InsightEngine`** — instantiated inside `InsightsProvider` (`engineRef`); rules from `app/src/data/insights.json`.

3. **`reconcileNotifications`** (`app/src/lib/notifications/NotificationScheduler.ts` export ~902) — **many** call sites: `SyncCoordinator`, `backgroundSync`, `useNotifications`, training surfaces, settings, health triggers, wellness nudges, refill reminders, guided training actions, etc. (**direct evidence**: grep).

4. **`requestHealthSync`** — `SyncCoordinator.ts` → `syncHealthData` (`app/src/lib/sync.ts`); entry points include `RootNavigator` (startup gate), `Dashboard`, `IntegrationsScreen`, `SleepScreen`, `SleepStepScreen`, `SyncEngine` (background/reconcile pull).

5. **Recovery persistence** — `app/src/lib/recovery.ts` AsyncStorage `recovery:progress:v1`. **`getRecoveryProgress`** consumed by `Dashboard`, `Settings`. **`setRecoveryStage`**, **`markStageCompleted`** are **exported** but have **zero** call sites outside `recovery.ts` (**direct evidence**: grep) — **stage advancement via these APIs appears unused**; **`resetRecoveryProgress`** is used from `SettingsScreen` + modal.

6. **App composition** — `App.tsx` `AppRoot`: `QueryClientProvider` → `AppShell` (when env OK). `AppShell`: **`useNotifications()`** (hook at top of `AppShell`), `useAppUpdates`, background sync init, routine intent listener (`AsyncStorage` `@reclaim/routine_intent`), then `PaperProvider` → `AuthProvider` → **`InsightsProvider`** → `FeedbackProvider` → `RootNavigator`. **Direct evidence:** `app/App.tsx` `AppShell` (~381–467). **Correction:** `useNotifications` is **not** a descendant of `InsightsProvider`; it runs in the parent `AppShell` component **before** the tree that renders `InsightsProvider`.

7. **Per-screen insight selection** — `useInsightForScreen` (`app/src/lib/insights/useInsightForScreen.ts`) wraps `pickInsightForScreen`; used on **`Dashboard`**, **`SleepScreen`**, **`MoodScreen`**, **`MedsScreen`** (grep).

8. **Dashboard-only scheduling** — `scheduleDailySignalNotification`, `scheduleWeeklyNarrativeNotification`, `scheduleMoodTrendAlerts` imported and called from **`Dashboard.tsx`** only (grep).

---

## Major runtime actors / systems

| Actor | Path | Role (code-evidenced) |
|-------|------|------------------------|
| **QueryClient** | `app/src/lib/queryClient.ts` | Global cache; invalidated from Dashboard, background sync, many screens |
| **AuthProvider** | `app/src/providers/AuthProvider.tsx` | Session; gates `InsightsProvider` refresh |
| **InsightsProvider** | `app/src/providers/InsightsProvider.tsx` | Sole owner of `fetchInsightContext` + engine; `refresh(reason)`; debounced `session-ready` effect |
| **useNotifications** | `app/src/hooks/useNotifications.ts` | Channels, listeners, `reconcileNotifications`, training task `TaskManager.defineTask(TRAINING_NOTIFICATION_ACTION_TASK)` |
| **SyncCoordinator** | `app/src/sync/SyncCoordinator.ts` | Coalescing, `syncHealthData`, post-success `reconcileNotifications` |
| **NotificationScheduler** | `app/src/lib/notifications/NotificationScheduler.ts` | `reconcileNotifications`, `ensureReclaimChannels`, plan building |
| **NotificationIntentStore** | `app/src/lib/notifications/NotificationIntentStore.ts` | `setIntent` / `getIntents` — consumed by scheduler + triggers |
| **backgroundSync** | `app/src/lib/backgroundSync.ts` | `BACKGROUND_HEALTH_SYNC_TASK`; `runOncePush`/`Pull` via SyncEngine; then `reconcileNotifications` + **query invalidation** |
| **SyncEngine** | `app/src/sync/SyncEngine.ts` | Calls `requestHealthSync` for `background_fetch`, `reconcile_pull` |
| **notificationTriggers** | `app/src/lib/health/notificationTriggers.ts` | HR + calendar nudges → `setIntent` + `reconcileNotifications` |
| **recoveryCardMeta** | `app/src/lib/dashboard/recoveryCardMeta.ts` | Derives recovery steps/CTA from props (no `InsightEngine`) |
| **Dashboard** | `app/src/screens/Dashboard.tsx` | Large orchestration: `requestHealthSync`, `invalidateQueries`, `refreshInsight`, recovery queries, routine state, daily/weekly/mood schedulers |

---

## Coordination points (actual)

| Coordination | Mechanism | Evidence |
|--------------|-----------|----------|
| **Post health sync → notifications** | `SyncCoordinator` calls `reconcileNotifications` after `syncHealthData` | `SyncCoordinator.ts` ~316 |
| **Post background sync → notifications + cache** | `backgroundSync.ts` after successful engine run | `backgroundSync.ts` ~33–45 |
| **Session available → insights** | `InsightsProvider` `useEffect` → `refresh('session-ready')` with debounce | `InsightsProvider.tsx` ~228–255 |
| **Foreground home → sync + invalidate + insight** | `Dashboard.tsx` `runHealthSync` + `invalidateQueries` + `refreshInsight` | grep `refreshInsight` / `requestHealthSync` in file |
| **Training / notif actions** | `useNotifications` + `guidedTrainingNotificationActions.ts` → reconcile | grep |
| **Startup sync** | `RootNavigator` `requestHealthSync({ reason: STARTUP_GATE })` when `session && onboardStatus === 'yes'` | `RootNavigator.tsx` ~206–216 |

---

## Shared-state builders (actual)

| Builder | Output | Consumers |
|---------|--------|-----------|
| **`fetchInsightContext`** | `InsightContext` + `InsightContextSourceData` | **Only** `InsightsProvider` |
| **React Query** | Cached API rows | Screens + `contextBuilder` (direct API calls on refresh, not cache-only) **Note:** `fetchInsightContext` uses **`listMoodCheckins`**, **`listSleepSessions`**, etc. from `@/lib/api` — **parallel** to RQ cache **Inference** |
| **Recovery** | `getRecoveryProgress` reads AsyncStorage | `Dashboard`, `Settings` |

---

## Prioritization / decision points (actual)

| Location | What gets prioritized |
|----------|------------------------|
| **`InsightEngine`** | Rule `priority` + suppression — produces **ranked** `InsightMatch[]` |
| **`pickInsightForScreen` / `useInsightForScreen`** | Chooses **one** insight per screen scope from ranked list |
| **`getRecoveryPrimaryCta`** (`recoveryCardMeta.ts`) | Picks recovery CTA from **incomplete** step |
| **Dashboard component tree** | Visual order of cards — **not** one function |

---

## Notification orchestration paths (actual)

- **Central sink:** `reconcileNotifications` (many producers).
- **Training-specific:** `trainingNotificationScheduler.ts` calls `reconcileNotifications` after operations.
- **Health trigger:** `notificationTriggers.ts` → `setIntent` → `reconcileNotifications`.
- **Mood prefs:** `MoodScreen.tsx` calls **`forceRescheduleNotifications`** (not only reconcile) — line ~773 **Inference** (exact line from grep).

---

## Sync / refresh / invalidation paths (actual)

- **`requestHealthSync`** — see entry points above.
- **`invalidateQueries`** — **24** matches in `Dashboard.tsx` (count); **backgroundSync** duplicates **sleep/meds** invalidation after task; **TrainingScreen**, **SleepScreen**, **IntegrationsScreen**, etc. each have own invalidations.

---

## Persistence owners (actual)

| Key / store | Owner module |
|-------------|--------------|
| `recovery:progress:v1` | `lib/recovery.ts` |
| `@reclaim/notifications/intents` | `NotificationIntentStore.ts` |
| `@reclaim/notifications/planFingerprint` etc. | `NotificationScheduler.ts` (constants) |
| Integration state | `integrationStore` (**Inference** — not re-read this pass) |
| Routine intent | `App.tsx` `AppShell` writes `AsyncStorage` `@reclaim/routine_intent` on notification response |

---

## Verdict: implicit orchestration model?

**Yes, partially and concretely:**

- **SyncCoordinator + reconcileNotifications** is a **repeatable** post-sync hook.
- **InsightsProvider** is a **single** refresh + context pipeline (**tight**).
- **Dashboard** is the **largest** foreground “script” (sync + invalidate + insight + notif schedulers).
- **Gaps:** recovery **stage mutation APIs unused** in UI; **duplicate** invalidation logic between **Dashboard** and **backgroundSync**; **no** single module owns “global next action.”

---

*Phase 2: `reclaim_architecture_discovery_vs_prior_audits.md`.*
