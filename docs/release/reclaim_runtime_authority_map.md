# Reclaim — runtime authority map (code-derived)

| Module / system | Exact file path | Key symbols | Role type | Authority level | Direct evidence | Notes |
|-----------------|-----------------|-------------|-----------|-----------------|-----------------|-------|
| **Insight context assembly** | `app/src/lib/insights/contextBuilder.ts` | `fetchInsightContext` | **state** | **Primary** (insight inputs) | Only called from `InsightsProvider` (grep) | Single builder |
| **Insights runtime** | `app/src/providers/InsightsProvider.tsx` | `InsightsProvider`, `useScientificInsights`, `refresh`, `engineRef` | **interpretation** + **prioritization** (rules) + **orchestration** (refresh lifecycle) | **Primary** (insights domain) | File | Debounced `session-ready` refresh |
| **Rule engine** | `app/src/lib/insights/InsightEngine.ts` | `createInsightEngine`, match pipeline | **interpretation** | **Primary** (rules) | File | |
| **Screen insight pick** | `app/src/lib/insights/pickInsightForScreen.ts` | `pickInsightForScreen` | **prioritization** (per-surface) | **Secondary** | Used by `useInsightForScreen` | |
| **Screen insight hook** | `app/src/lib/insights/useInsightForScreen.ts` | `useInsightForScreen` | **surface** | **Secondary** | Dashboard, Sleep, Mood, Meds | |
| **Health sync orchestration** | `app/src/sync/SyncCoordinator.ts` | `requestHealthSync`, `HEALTH_SYNC_REASON` | **orchestration** + **sync** | **Primary** (health sync pipeline) | Calls `syncHealthData` + `reconcileNotifications` | |
| **Health sync implementation** | `app/src/lib/sync.ts` | `syncHealthData` | **sync** | **Primary** (implementation) | Exported | Large |
| **Notification reconcile** | `app/src/lib/notifications/NotificationScheduler.ts` | `reconcileNotifications`, `ensureReclaimChannels` | **notification** + **orchestration** (schedule materialization) | **Primary** (sink) | Many callers | |
| **Notification intents** | `app/src/lib/notifications/NotificationIntentStore.ts` | `setIntent`, `getIntents` | **persistence** + **state** (intents) | **Primary** (intent store) | Imported by scheduler + triggers + useNotifications | |
| **App notification hook** | `app/src/hooks/useNotifications.ts` | `useNotifications`, `processNotificationResponse`, `TRAINING_NOTIFICATION_ACTION_TASK` | **notification** + **orchestration** (tap handling) | **Primary** (app-level) | `AppShell` invokes | **TaskManager** defines training task |
| **Background health task** | `app/src/lib/backgroundSync.ts` | `BACKGROUND_HEALTH_SYNC_TASK`, `runBackgroundHealthSyncTask` | **orchestration** + **sync** | **Primary** (BG) | `TaskManager.defineTask` | Also invalidates + reconcile |
| **Sync engine** | `app/src/sync/SyncEngine.ts` | `runOncePush`, `runOncePull` | **sync** | **Secondary** | Calls `requestHealthSync` | |
| **Health triggers** | `app/src/lib/health/notificationTriggers.ts` | `startHealthTriggers`, `attachHeartRateSpikeHandler` | **notification** + **surface** (deep links) | **Secondary** | Mindfulness | |
| **HR triggers hook** | `app/src/hooks/useHealthTriggers.ts` | `useHealthTriggers` | **orchestration** (subscription lifecycle) | **Secondary** | Wraps start/stop | |
| **Recovery persistence** | `app/src/lib/recovery.ts` | `getRecoveryProgress`, `resetRecoveryProgress`, `setRecoveryStage`, `markStageCompleted` | **persistence** | **Primary** (recovery blob) | AsyncStorage | **Advance APIs uncalled** outside file (grep) |
| **Recovery card derivation** | `app/src/lib/dashboard/recoveryCardMeta.ts` | `computeRecoveryActionSteps`, `getRecoveryPrimaryCta`, … | **interpretation** (recovery UX) | **Primary** (card copy/steps) | Imported by Dashboard | |
| **Dashboard** | `app/src/screens/Dashboard.tsx` | `runHealthSync`, `refreshInsight`, invalidations, `scheduleDailySignalNotification`, … | **surface** + **orchestration** (foreground) | **Primary** (home only) | File | Not reusable module |
| **Root startup sync** | `app/src/routing/RootNavigator.tsx` | `requestHealthSync` + `HEALTH_SYNC_REASON.STARTUP_GATE` | **orchestration** | **Secondary** | `useEffect` after onboard | |
| **Query client** | `app/src/lib/queryClient.ts` | `queryClient` | **state** (cache) | **Primary** | Imported widely | |
| **Auth** | `app/src/providers/AuthProvider.tsx` | (session) | **state** | **Primary** | Wraps app | |
| **Training notification scheduler** | `app/src/lib/notifications/trainingNotificationScheduler.ts` | (exports) | **notification** | **Secondary** | Calls `reconcileNotifications` | |
| **Guided training actions** | `app/src/lib/notifications/guidedTrainingNotificationActions.ts` | `handleGuidedTrainingNotificationAction` | **notification** + **sync** side effects | **Secondary** | reconcile + invalidate | |
| **Refill reminders** | `app/src/lib/refillReminders.ts` | | **notification** | **Secondary** | reconcile | |
| **Wellness calendar nudges** | `app/src/lib/wellness/wellnessCalendarContextNudges.ts` | | **notification** | **Secondary** | reconcile | |
| **Daily signal** | `app/src/lib/notifications/dailySignalNotification.ts` | `scheduleDailySignalNotification` | **notification** | **Secondary** | Called from Dashboard only | |

**Authority level:** **Primary** = owns contract in domain; **Secondary** = contributes; **Consumer** = read-only; **Unclear** = needs product spec.

---

*Derived from grep/read of `app/` April 2026.*
