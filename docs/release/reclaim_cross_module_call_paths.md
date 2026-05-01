# Reclaim — cross-module call paths (code-derived)

| Path | Entry point | Downstream modules | Outcome | Evidence level |
|------|-------------|---------------------|---------|----------------|
| **Startup → health sync** | `RootNavigator.tsx` `useEffect` when `session && onboardStatus === 'yes'` | `requestHealthSync({ reason: STARTUP_GATE })` → `SyncCoordinator` → `syncHealthData` → `reconcileNotifications` | Data imported; notifications reconciled | **Direct** |
| **Startup → insights** | `InsightsProvider` `useEffect` on `session` | `refresh('session-ready')` → `fetchInsightContext` → `InsightEngine` | Ranked insights | **Direct** |
| **Sync → reconcile (no insight refresh in coordinator)** | `SyncCoordinator` after `syncHealthData` | `reconcileNotifications` only | **No** `refreshInsight` in coordinator | **Direct** — insight refresh must happen elsewhere (e.g. Dashboard after sync) |
| **Dashboard manual sync** | `Dashboard.tsx` `runHealthSync` | `requestHealthSync` → … → `refreshInsight('health-sync')` + invalidations | Fresh queries + insights | **Direct** |
| **Background sync → cache + reconcile** | `backgroundSync.ts` task | `runOncePush`/`Pull` → `SyncEngine` path; on success `reconcileNotifications` + `queryClient.invalidateQueries` (sleep/meds keys) | Partial overlap with Dashboard invalidation | **Direct** |
| **Health trigger → mindfulness** | `notificationTriggers.ts` `onSample` | `setIntent` → `reconcileNotifications` | Scheduled notif with deep link | **Direct** |
| **Calendar nudges** | `wellnessCalendarContextNudges.ts` | `reconcileNotifications` | Nudges | **Direct** |
| **Mood log / dashboard** | `Dashboard.tsx` mood modal success | `invalidateQueries` + `refreshInsight('dashboard-mood-log')` | Updated insight list | **Direct** |
| **Mood screen** | `MoodScreen.tsx` | `refreshInsight` (several reasons); `forceRescheduleNotifications` | Insights + notif plan | **Direct** |
| **Sleep import / connect** | `SleepScreen.tsx` | `requestHealthSync` + `refreshInsight` + `reconcileNotifications` imports | Multi-step | **Direct** |
| **Integrations connect/import** | `IntegrationsScreen.tsx` | `requestHealthSync` + `refreshInsights` | Sync + insights | **Direct** |
| **Training save / session** | `TrainingSessionView.tsx`, `TrainingScreen.tsx` | `reconcileNotifications` | Training notifs updated | **Direct** |
| **useNotifications tap** | `useNotifications.ts` `processNotificationResponse` | Nav helpers, `guidedTrainingNotificationActions`, med dose, idempotency | Routes / side effects | **Direct** (file) |
| **Finishing onboarding** | `FinishScreen.tsx` | `refreshInsights('finish_retry')` | Insights | **Direct** |
| **Meds screen** | `MedsScreen.tsx` | `refreshInsight` | Insights | **Direct** |
| **Training completion → recovery** | — | **No** direct `recovery.ts` write from training grep | **None** in this pass | **Direct** (absence) |
| **Sleep import → recovery stage** | — | **No** `setRecoveryStage` call from sync/sleep | **None** | **Direct** (grep) |

---

## Open questions (manual trace suggested)

- Whether **`syncHealthData`** completion triggers **any** automatic `refreshInsight` outside Dashboard — **Inference:** likely **not** globally; **`InsightsProvider`** only on session/enable.
- Full **`useNotifications`** initialization path — **long** file; **partial** read this pass.

---

*See `reclaim_code_first_architecture_discovery.md`.*
