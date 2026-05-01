# Reclaim — authority rules v1

**Status:** Formalization for **launch**; aligns with code-first discovery. **v1** = revise when progression APIs are wired or a global snapshot is introduced.

**Legend:** **Owns** = source of truth / contract. **Consumes** = reads. **Publishes** = writes, triggers, or schedules.

---

| System | Owns | Does not own | Consumes from | Publishes to / triggers | Launch importance |
|--------|------|--------------|---------------|-------------------------|-------------------|
| **`InsightsProvider`** (`app/src/providers/InsightsProvider.tsx`) | Insight matches, **`refresh(reason)`**, engine lifecycle, debounced session refresh | Global nav, recovery storage, notification plan contents | Session (**`AuthProvider`**), **`fetchInsightContext`** output | React context consumers, **`InsightCard`** / **`useInsightForScreen`** paths | **Critical** |
| **`fetchInsightContext` / `contextBuilder.ts`** | Shape of **`InsightContext`** + source payload for rules | Recovery, intents, RQ policy | **`@/lib/api`** (and related lib fetches — per file) | Returns to **`InsightsProvider` only** (caller exclusivity) | **Critical** |
| **`InsightEngine`** + **`insights.json`** | Rule evaluation, **`priority`**, suppression, ranked matches | Server persistence, notifications | **`InsightContext`** | Match list to provider | **Critical** |
| **`pickInsightForScreen` / `useInsightForScreen`** | Per-screen **single** insight choice from ranked list | Global “next action” across domains | **`InsightsProvider`** matches | UI hooks on Dashboard, Sleep, Mood, Meds | **High** |
| **`SyncCoordinator`** (`app/src/sync/SyncCoordinator.ts`) | **`requestHealthSync`** coalescing, cooldowns, **`syncHealthData`** invocation | **`refreshInsight`**, RQ invalidation | Integration / prefs (**inference** via `syncHealthData`) | **`reconcileNotifications`** post-success | **Critical** |
| **`syncHealthData`** (`app/src/lib/sync.ts`) | Health import/export implementation details | Insight ranking | Coordinator callers | DB / device writes per integration | **Critical** |
| **`backgroundSync.ts`** | BG **`TaskManager`** task, **`SyncEngine`** push/pull, subset **`invalidateQueries`**, **`reconcileNotifications`** | Insight refresh | Settings / engine | RQ invalidation keys (sleep/meds — per file) | **High** |
| **`SyncEngine.ts`** | Thin **`requestHealthSync`** for BG reasons | Business rules | — | Coordinator | **High** |
| **`NotificationScheduler` / `reconcileNotifications`** | Scheduled notification **materialization**, channels contract (**with** `ensureReclaimChannels`) | Insight text generation | Prefs, **`NotificationIntentStore`**, settings | OS notification schedule | **Critical** |
| **`NotificationIntentStore`** | Intent keys → payloads for reconcile | Rule priorities | Writers: triggers, schedulers, **`useNotifications`** | Read by **`NotificationScheduler`** | **High** |
| **`useNotifications`** (`app/src/hooks/useNotifications.ts`) | Permission, listeners, **response** routing, training **`TaskManager`** task, many **reconcile** branches | **`InsightEngine`** | Notifications API, **`guidedTrainingNotificationActions`** (**inference**) | Nav, reconcile, side effects | **Critical** |
| **`AppShell`** (`app/App.tsx`) | **`useNotifications()`** invocation, routine intent **`AsyncStorage`** (`@reclaim/routine_intent`), BG sync enable per settings | Insights | Settings, notifications | Global side effects at boot | **Critical** |
| **`notificationTriggers.ts`** | HR/sample → **intent** + reconcile path | **`InsightContext`** assembly | Health samples | **`setIntent`**, **`reconcileNotifications`** | **Medium** (Android-primary **inference**) |
| **`trainingNotificationScheduler.ts`** / **guided training actions** | Training-specific schedules / tap handling | Insights | Training state | **`reconcileNotifications`**, RQ (**per file**) | **High** |
| **`dailySignalNotification.ts`** (+ weekly/mood trend modules) | Scheduling **content** from **top insight** / prefs (**per module**) | Full app orchestration | **`InsightsProvider`** or dashboard-derived data (**per call site**) | OS schedule; **called from `Dashboard.tsx` only** (discovery) | **High** |
| **`recovery.ts`** | AsyncStorage **`recovery:progress:v1`**, **`getRecoveryProgress`**, **`resetRecoveryProgress`** | **`InsightEngine`** | — | Consumers: **`Dashboard`**, **`Settings`** | **High** |
| **`setRecoveryStage` / `markStageCompleted`** | *If unwired:* **no** runtime authority | — | — | **None** outside module (discovery) | **Clarify** before claiming journey automation |
| **`recoveryCardMeta.ts`** | Recovery steps, blockers, **primary CTA** derivation for card | Insight rule messages | Props from **`Dashboard`** / queries | UI copy only | **High** |
| **`Dashboard.tsx`** | Home **foreground** orchestration: **`requestHealthSync`**, **`invalidateQueries`**, **`refreshInsight`**, recovery query, **daily/weekly/mood** schedulers | Other tabs’ policies | RQ, **`useScientificInsights`**, **`getRecoveryProgress`**, **`useInsightForScreen`** | Insights refresh, cache invalidation, notification schedules (home) | **Critical** |
| **`RootNavigator.tsx`** | Auth / onboarding / app gate, **`requestHealthSync(STARTUP_GATE)`** | Insight rules | Session, onboard flags | Coordinator | **Critical** |
| **`queryClient`** (`app/src/lib/queryClient.ts`) | RQ cache instance | Semantics of “what matters” | Fetchers | Invalidation from many screens | **Critical** |
| **`AuthProvider`** | Session | Insights rules | Supabase | Child tree | **Critical** |
| **`IntegrationsScreen` / `integrationStore`** | Connection UX and prefs (**per module**) | Insight engine | User actions | **`requestHealthSync`**, **`refreshInsight`** (per screen) | **Critical** |
| **`lib/routines`** (and Dashboard overlay) | Routine templates / suggestions (**per module**) | Insight priority | Remote/local (**inference**) | Dashboard UI | **Medium** |

---

## `forceRescheduleNotifications` (maintenance / S9)

**Defined in** `app/src/lib/notifications/NotificationScheduler.ts`: clears the stored notification plan fingerprint (`PLAN_FINGERPRINT_KEY`) and runs **`runReconcileImmediate()`** with **no debounce** — full rebuild of OS-scheduled notifications from current prefs and intents.

**Use when** the user explicitly changes notification-related settings and all scheduled notifications must be recomputed. **Do not** use for high-frequency or coalesced updates; prefer **`reconcileNotifications()`** (debounced) for routine churn.

**Call sites (examples):** `SettingsScreen.tsx` (toggles), `SleepScreen.tsx` (quiet hours / sleep notification prefs), `MoodScreen.tsx` after `updateNotificationPreferences` for mood reminders, `useNotifications.ts` when appropriate.

---

## Cross-cutting rules (v1)

1. **Insights** = **`InsightsProvider`** pipeline only; **`InsightContext`** is **not** the whole app state.
2. **Health sync** = **`SyncCoordinator`** through **`syncHealthData`**; **notifications** reconcile **there**; **insights** refresh **elsewhere** by explicit call.
3. **Notifications** = **`reconcileNotifications`** as **sink**; **intents** = **`NotificationIntentStore`**.
4. **Recovery** = storage in **`recovery.ts`**; **card** = **`recoveryCardMeta.ts`**; **progression APIs** = **unverified** until call sites exist.
5. **Home** = **`Dashboard.tsx`** coordinates **this** surface’s refresh story; **not** a library.

---

*Companion: `reclaim_architecture_formalization_decisions.md`.*
