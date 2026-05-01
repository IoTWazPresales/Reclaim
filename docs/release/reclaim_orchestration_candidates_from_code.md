# Reclaim — orchestration candidates from code (assessment only)

**Rule:** Evaluate what **exists**; **no** redesign recommendation.

---

## 1. `SyncCoordinator` + `syncHealthData`

| | |
|---|--|
| **Already does** | Coalescing, cooldowns, window caps, telemetry, `reconcileNotifications` after success |
| **Authority** | **Primary** for **health sync request** lifecycle |
| **Does not cover** | Insight refresh, React Query invalidation, recovery |
| **Formalize risk** | **Low** — boundary is clear in code |

---

## 2. `InsightsProvider` + sole `fetchInsightContext` caller

| | |
|---|--|
| **Already does** | Single pipeline for **all** insight context; engine ranking; `refresh(reason)` API |
| **Authority** | **Primary** for **insight** domain |
| **Does not cover** | Recovery, notifications content (except insights **feed** daily signal **from** Dashboard) |
| **Formalize risk** | **Low** for **documenting** as insight API; **high** if expanded to “global brain” |

---

## 3. `reconcileNotifications` as sink

| | |
|---|--|
| **Already does** | Idempotent **re**-plan of scheduled notifications from prefs + intents |
| **Authority** | **Primary** for **native** notification schedule materialization |
| **Does not cover** | **What** insight text is (Dashboard schedules daily signal **separately**) |
| **Formalize risk** | **Low** |

---

## 4. `Dashboard.tsx` as foreground script

| | |
|---|--|
| **Already does** | `requestHealthSync`, broad `invalidateQueries`, `refreshInsight`, recovery queries, routine state, `scheduleDailySignalNotification`, weekly/mood schedulers |
| **Authority** | **Primary** for **home** experience; **not** imported elsewhere |
| **Does not cover** | Other tabs’ consistency |
| **Formalize risk** | **Medium** — extracting helpers reduces duplication with **backgroundSync** invalidation **Inference** |

---

## 5. `backgroundSync` task

| | |
|---|--|
| **Already does** | SyncEngine push/pull + reconcile + **subset** of invalidations |
| **Authority** | **Primary** for **background** path |
| **Does not cover** | Insight refresh |
| **Formalize risk** | **Medium** — overlap with Dashboard invalidation keys |

---

## 6. `useNotifications` (AppShell)

| | |
|---|--|
| **Already does** | Channels, handlers, training `TaskManager`, `reconcileNotifications` in many branches |
| **Authority** | **Primary** for **notification response** and **registration** |
| **Does not cover** | Business rules for insights |
| **Formalize risk** | **Medium** — file size / branching |

---

## 7. Recovery APIs (`setRecoveryStage` / `markStageCompleted`)

| | |
|---|--|
| **Already does** | **Exported** mutations in `recovery.ts` |
| **Authority** | **Unclear** — **no** non-definition call sites found (grep) |
| **Does not cover** | — |
| **Formalize risk** | **N/A** until callers exist — **dead API surface** **Inference** |

---

*See `reclaim_architecture_discovery_vs_prior_audits.md`.*
