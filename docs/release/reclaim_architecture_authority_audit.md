# Reclaim — architecture & orchestration authority audit

**Question:** Is there enough **shared structure** to support a coherent integrated product **without** major reinvention — and **where does authority live**?

**Constraint:** Do **not** assume `InsightEngine` should become the whole brain; roles are **separate** (state, interpretation, prioritization, orchestration, surfaces, notifications, sync).

---

## Executive summary

Reclaim **already has** a **partial implicit orchestration model**:

1. **Data ingestion + sync orchestration** — `SyncCoordinator.requestHealthSync` (`sync/SyncCoordinator.ts`) coalesces calls, caps windows, runs `syncHealthData`, then **`reconcileNotifications()`** — **explicit** post-sync lifecycle hook.
2. **Interpretation + prioritization (rules)** — `fetchInsightContext` → `InsightEngine` (`insights.json` priorities, `InsightsProvider`) — **primary** for **scientific insight** ranking.
3. **Surface orchestration (home)** — `Dashboard.tsx` **centralizes** many `invalidateQueries` keys, `requestHealthSync`, `refreshInsight`, routine state — **de facto** orchestrator for **foreground** refresh, **not** a reusable module.
4. **Notification materialization** — `NotificationScheduler.reconcileNotifications` + `NotificationIntentStore` — **authority** for **what gets scheduled**; **multiple** entry points call `reconcile` (`useNotifications.ts`, `SyncCoordinator`, `backgroundSync.ts`, `notificationTriggers.ts`).
5. **Recovery authority** — `lib/recovery.ts` (AsyncStorage) + `recoveryCardMeta.ts` — **separate** from insights; **no** shared coordinator.

**Verdict:** **Implicit orchestration is partially present** — strong at **sync→notifications** and **insights pipeline**; **weak** at **unifying** recovery vs insights vs routines under one **prioritization** authority. **No** single “brain” module; **Dashboard** acts as **implicit** glue.

---

## Major system roles (current)

| Role | Primary location(s) | Notes |
|------|---------------------|--------|
| **Shared context assembly** | `contextBuilder.ts` `fetchInsightContext` | Single `InsightContext` |
| **Interpretation / explanation** | `InsightEngine.ts` + `insights.json` | Rule messages + `why` |
| **Prioritization (insights)** | `InsightEngine` + rule `priority` in JSON | **Not** global “what to do” |
| **Recovery-stage interpretation** | `recoveryCardMeta.ts`, `lib/recovery.ts` | Stage steps, blockers |
| **Routine / planning** | `lib/routines`, `Dashboard.tsx` overlay | **Inference:** local + remote |
| **Training runtime** | `TrainingSessionView`, `trainingNotificationScheduler`, etc. | Domain-specific |
| **Sync orchestration** | `SyncCoordinator.ts` | Cooldown, coalescing, `syncHealthData` |
| **Notification orchestration** | `NotificationScheduler.ts` `reconcileNotifications`, intents | Reads prefs, settings, intents |
| **Query cache / invalidation** | React Query `queryClient`; **Dashboard** invalidates many keys | **Fragmented** by screen |
| **App composition** | `App.tsx`: QueryClient, Auth, Insights, Feedback, `useNotifications` | **No** orchestration provider |

---

## Where shared state lives

| State | Location | Authority |
|-------|----------|-----------|
| **InsightContext + source** | Built in `fetchInsightContext`; held in `InsightsProvider` | **Primary** for insights |
| **Recovery progress** | AsyncStorage `lib/recovery.ts` | **Primary** for journey |
| **Notification intents** | `NotificationIntentStore` | **Primary** for intent-backed schedules |
| **Integration connection** | `integrationStore` | Health source |
| **User settings** | `getUserSettings` / DB | **Inference** |
| **Server truth** | Supabase via `api.ts` | **Primary** for persisted domain rows |

---

## Where interpretation lives

**Insights:** `InsightEngine` + `insights.json`.  
**Recovery card copy:** `recoveryCardMeta.ts` (blocker line, step status).  
**Training:** Session labels, programs — scattered. **Inference**

---

## Where prioritization lives

- **Insights:** `InsightEngine` ranks matches (priority + suppression).  
- **Recovery “next step”:** `getRecoveryPrimaryCta` in `recoveryCardMeta.ts`.  
- **Dashboard visual order:** **component order** in `Dashboard.tsx` — **not** one ranker.  
**Overlap:** Two “what matters” **rankers** (insight + recovery).

---

## Where orchestration lives

- **Sync lifecycle:** `SyncCoordinator` → `syncHealthData` → `reconcileNotifications`.  
- **Background:** `backgroundSync.ts` → sync + `reconcileNotifications`.  
- **Foreground home:** `Dashboard.tsx` **sequences** sync, invalidation, `refreshInsight`.  
- **App boot:** `useNotifications` in `App.tsx` — permission, channels, reconcile **Inference** from grep.

---

## Overlap / ambiguity

Detail: `reclaim_orchestration_overlap_matrix.md` and `reclaim_authority_graph.md`.

---

## Verdict

| Question | Answer |
|----------|--------|
| Implicit model formalizable? | **Yes, for** sync + insight refresh + notification reconcile; **partial** for cross-domain “next action.” |
| Major reinvention required? | **No** for **adding** a thin coordination layer; **yes** if goal is **one** canonical prioritizer across all domains. |
| Authority insufficient? | **Insufficient** for **single** “global priority” — **by design** today (multiple subsystems). |

---

*See `reclaim_existing_orchestrator_candidates.md`, `reclaim_launch_critical_architecture_decisions.md`.*
