# Reclaim — existing orchestrator candidates (evaluation)

**Rule:** Evaluate **whether** current structures can be **formalized** without assuming they are the right long-term **brain**. **No** redesign here.

---

## 1. `InsightContext` / `contextBuilder.ts`

| | Assessment |
|---|-------------|
| **Why it might work** | Already the **single assembly point** for cross-domain **facts** feeding rules. |
| **Role today** | **State assembly** for **insights only** — not recovery, not routines. |
| **Does not solve** | **Prioritization** across recovery vs insights; **notification** timing; **navigation** |
| **Formalize risk** | **Low** — extend contract carefully; **high** if renamed “global brain” without scope |

---

## 2. `InsightsProvider`

| | Assessment |
|---|-------------|
| **Why it might work** | Global React context; refresh API; engine ownership. |
| **Role today** | **Insight domain** lifecycle + refresh debounce. |
| **Does not solve** | Recovery, training runtime, **global** action priority |
| **Formalize risk** | **Medium** — scope creep if it absorbs non-insight concerns |

---

## 3. `SyncCoordinator` + `syncHealthData`

| | Assessment |
|---|-------------|
| **Why it might work** | **Clear** orchestration: **single** entry for health sync, **coalescing**, **telemetry**, **post-sync** `reconcileNotifications`. |
| **Role today** | **Health data sync** + **notification** reconcile hook — **closest** to **explicit** orchestrator for **that pipeline**. |
| **Does not solve** | Insight refresh (caller’s job); recovery stage; UI priority |
| **Formalize risk** | **Low** for **documenting** as “health sync authority”; **high** if expanded beyond sync |

---

## 4. `NotificationScheduler` + `reconcileNotifications`

| | Assessment |
|---|-------------|
| **Why it might work** | **Central** materialization of **scheduled** notifications from prefs + intents. |
| **Role today** | **Notification dispatch** authority; **intent** dual path. |
| **Does not solve** | **What** insight to show (content comes from **elsewhere**); **recovery** |
| **Formalize risk** | **Low** — already **primary** for notifications |

---

## 5. Recovery (`lib/recovery.ts` + `recoveryCardMeta.ts`)

| | Assessment |
|---|-------------|
| **Why it might work** | Owns **journey** state and **step** derivation. |
| **Role today** | **Recovery** domain only — **parallel** to insights. |
| **Does not solve** | **Scientific** rules; cross-domain training **rules** (those live in **insights**) |
| **Formalize risk** | **Medium** — good **within** domain; **bad** as **global** orchestrator |

---

## 6. `Dashboard.tsx` (as implicit orchestrator)

| | Assessment |
|---|-------------|
| **Why it might work** | **Actually sequences** sync, invalidation, insight refresh, mood flows. |
| **Role today** | **Foreground** home **only** — **not** imported elsewhere. |
| **Does not solve** | **Reusable** app-wide policy; **other** tabs |
| **Formalize risk** | **High** if logic **stays** only in screen — **extract** patterns **if** formalizing; **low** to **document** “home owns refresh sequence” |

---

## 7. React Query `queryClient`

| | Assessment |
|---|-------------|
| **Why it might work** | **Shared cache** is **de facto** state bus. |
| **Role today** | **Invalidation** scattered — **no** single policy. |
| **Does not solve** | **Semantic** priority — cache only |
| **Formalize risk** | **Medium** — central invalidation helpers could help **without** new architecture |

---

## Verdict on “formalize vs rebuild”

| Candidate | Formalize (low-risk) | Rebuild |
|-----------|----------------------|---------|
| **SyncCoordinator** | **Yes** — clarify **contract** + post-sync side effects | **No** |
| **reconcileNotifications** | **Yes** — already **sink** | **No** |
| **InsightContext** | **Yes** — **document** as **insight** state assembly | **Extend** only with clear boundaries |
| **Dashboard** | **Extract** helpers **if** repeating patterns — **not** mandatory | **Avoid** rebuilding home as **orchestrator service** until product defines **global** priority |

---

*See `reclaim_launch_critical_architecture_decisions.md`.*
