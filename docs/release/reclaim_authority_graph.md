# Reclaim — authority graph (major modules)

| Module / system | Apparent responsibility | Evidence | Role type | Authority level | Overlap / conflict notes | Launch importance |
|-----------------|---------------------------|----------|-----------|-----------------|-------------------------|-------------------|
| **`fetchInsightContext` / `contextBuilder.ts`** | Assemble `InsightContext` from APIs + HR + calendar | `fetchInsightContext` | **state** | **Primary** (insights) | Does **not** own recovery storage | **High** |
| **`InsightsProvider`** | Hold insight matches, refresh, engine ref, debounce | `InsightsProvider.tsx` | **interpretation** + **prioritization** (insight domain) | **Primary** | Overlaps **recovery** “what matters” | **High** |
| **`InsightEngine.ts`** | Evaluate rules, rank, suppress | Code | **interpretation** + **prioritization** | **Primary** (rules) | — | **High** |
| **`lib/recovery.ts`** | Persist recovery stage/week | AsyncStorage | **state** (journey) | **Primary** (recovery) | **Parallel** to insight priority | **High** |
| **`recoveryCardMeta.ts`** | Derive steps, blockers, CTA from metrics | `computeRecoveryActionSteps`, etc. | **interpretation** + **surface guidance** | **Primary** (recovery card) | Recomputes from **same** raw data as insights **Inference** | **High** |
| **`SyncCoordinator.ts`** | Coalesce health sync, call `syncHealthData`, then `reconcileNotifications` | `requestHealthSync` | **orchestration** + **sync** | **Primary** (health sync) | **Unclear** if all surfaces know sync finished | **High** |
| **`lib/sync.ts` `syncHealthData`** | Pull/push health per integration | Called from coordinator | **sync** | **Primary** (implementation) | **Consumer** of integration prefs | **High** |
| **`NotificationScheduler.ts`** | Build plan, `reconcileNotifications` | Large module | **notification** + partial **orchestration** | **Primary** (notifications) | Many callers; **intent** dual path | **High** |
| **`NotificationIntentStore`** | Persist intents for reconcile | `setIntent` / `getIntents` | **state** (notif intents) | **Secondary** | Phase comment “dual path” | **Medium** |
| **`useNotifications.ts`** | Register tasks, handlers, **many** `reconcileNotifications` | `useNotifications.ts` | **orchestration** (notif lifecycle) | **Primary** (app hook) | Overlaps with **SyncCoordinator** reconcile | **High** |
| **`NotificationTriggers` / `notificationTriggers.ts`** | HR + calendar → mindfulness intents | `setIntent` + reconcile | **notification** + **surface** (deep link) | **Secondary** | Does **not** feed `InsightContext` | **Medium** |
| **`backgroundSync.ts`** | TaskManager task → sync + reconcile | `reconcileNotifications` | **orchestration** | **Primary** (background) | **Parallel** to foreground coordinator | **High** |
| **`Dashboard.tsx`** | Invalidate queries, run sync, refresh insights, mood flows | **Many** `invalidateQueries` | **orchestration** (foreground) + **surface** | **Primary** (home screen) **but not reusable** | **Duplicates** orchestration patterns **Inference** | **High** |
| **`queryClient` / React Query** | Cache keys | `lib/queryClient.ts` | **state** (client) | **Primary** (caching) | **No** single invalidation policy | **High** |
| **`lib/routines`** | Routine templates, suggestions, remote | Various | **planning** | **Secondary** | **Parallel** to recovery | **Medium** |
| **`trainingNotificationScheduler`** | Training-specific schedules | `grep` / inventory | **notification** | **Secondary** | **Parallel** family to `NotificationScheduler` logical keys | **Medium** |
| **`RootNavigator` / auth** | Gate onboarding vs app | `RootNavigator.tsx` | **orchestration** (lifecycle) | **Primary** (nav) | — | **High** |
| **`IntegrationsScreen` / `integrations.ts`** | Connect flows | `integrations.ts` | **sync** trigger | **Primary** (connect) | Triggers sync reasons via coordinator **Inference** | **High** |

**Authority level key:** **Primary** = owns decisions in its domain; **Secondary** = contributes; **Consumer** = reads only; **Unclear** = needs product/engineering clarification.

---

*Companion: `reclaim_architecture_authority_audit.md`.*
