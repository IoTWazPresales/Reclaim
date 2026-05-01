# Reclaim — architecture formalization decisions (launch)

**Inputs:** Code-first discovery (`reclaim_code_first_architecture_discovery.md`, `reclaim_runtime_authority_map.md`, `reclaim_cross_module_call_paths.md`, `reclaim_orchestration_candidates_from_code.md`, `reclaim_architecture_discovery_vs_prior_audits.md`) plus prior audits (`reclaim_architecture_authority_audit.md`, `reclaim_launch_critical_architecture_decisions.md`, `reclaim_system_coherence_audit.md`, `reclaim_launch_critical_integrations.md`, `reclaim_vision_alignment_audit.md`).

**Scope:** **Formalize** what the codebase already does — **not** a redesign. **No** application code in this document.

---

## Executive summary

Reclaim’s runtime is already structured around **five code-backed authorities**:

1. **`InsightsProvider` + `fetchInsightContext` + `InsightEngine`** — **only** pipeline for **scientific insight** context and ranked matches (`app/src/providers/InsightsProvider.tsx`, `app/src/lib/insights/contextBuilder.ts`, `app/src/lib/insights/InsightEngine.ts`, `app/src/data/insights.json`).
2. **`SyncCoordinator` + `syncHealthData`** — **health sync** lifecycle; post-success **`reconcileNotifications`** only (**no** `refreshInsight` in `SyncCoordinator.ts` — **direct evidence** from discovery).
3. **`NotificationScheduler.reconcileNotifications` + `NotificationIntentStore`** — **materialization** of scheduled notifications (sink + intents).
4. **`useNotifications`** (`app/src/hooks/useNotifications.ts`) — app-level **registration**, channels, **notification response** / **TaskManager** training task; invoked from **`AppShell`** in `app/App.tsx`.
5. **`Dashboard.tsx`** — **foreground home** sequencing: **`requestHealthSync`**, **`invalidateQueries`**, **`refreshInsight`**, recovery queries, **`scheduleDailySignalNotification`** / weekly / mood trend (**Dashboard-only** imports — discovery).

**Formalization for launch** means **locking authority contracts** (who owns what), **naming** the **call-site** rule for **post-sync insight refresh**, **product-owning** the **primary next action** (insight vs recovery vs routine), and **classifying** notification paths as **canonical** vs **surface-owned** vs **policy-variant** — **without** introducing a new global orchestrator unless a future milestone requires it.

---

## Formal authority decisions

### 1. `InsightContext` / `InsightsProvider`

| Decision | Statement |
|----------|-----------|
| **Formal role** | **`InsightContext`** is the **inputs + assembled facts** for **`InsightEngine`** rules only. It is **not** a global app state document. |
| **Exclusive builder** | **`fetchInsightContext`** (`app/src/lib/insights/contextBuilder.ts`) is **only** invoked from **`InsightsProvider.refresh()`** — **no** other callers (discovery grep). |
| **`InsightsProvider` owns** | Loading **`insights.json`**, **`engineRef`**, **`refresh(reason)`**, debounced **`session-ready`** refresh, exposing matches to **`useScientificInsights`** / consumers. |
| **`InsightsProvider` does not own** | Recovery AsyncStorage, **`reconcileNotifications`** (except **indirect** if some child calls it — **not** part of provider contract today), routing, **React Query** cache policy. |
| **Naming rule** | Treat **`InsightContext`** as **“insights domain context”** in docs and reviews — **not** “shared app context,” to avoid **scope creep** into a global brain. |

**Inference:** `fetchInsightContext` uses **`@/lib/api`** in parallel with **React Query**-backed screens; **no** requirement to merge caches for launch if behavior is acceptable.

---

### 2. Post-sync insight refresh

| Decision | Statement |
|----------|-----------|
| **Fact** | **`SyncCoordinator`** and **`backgroundSync.ts`** do **not** call **`refreshInsight`** — discovery. |
| **Formal contract** | **Insight refresh after health sync** is **call-site owned**: any code path that runs **`requestHealthSync`** and **must** update insights **must** also invoke **`refreshInsight`** (or equivalent **`InsightsProvider.refresh`**) **when that path cares about insight freshness**. |
| **Known good pattern** | **`Dashboard.tsx`** `runHealthSync` → **`refreshInsight('health-sync')`** + invalidations — **reference** implementation for **home**. |
| **Other entry points** | **`IntegrationsScreen.tsx`**, **`SleepScreen.tsx`**, **`SleepStepScreen.tsx`**, **`RootNavigator.tsx`** (startup) — each **already** or **should** align with the contract per product (**see** `reclaim_launch_critical_architecture_decisions.md`). |

| Type | |
|------|--|
| **Ownership clarification** | **Yes** — “sync coordinator does **not** refresh insights” is **documented** as **intentional boundary** unless product decides otherwise. |
| **Possible code change** | **Optional small helper** or **shared post-sync hook** — **not** mandatory for formalization; **classify** under `reclaim_architecture_changes_cutline.md`. |

---

### 3. Dashboard — allowed vs extracted

**Detailed split:** `reclaim_dashboard_orchestration_decision.md`.

**Summary:**

| Category | Decision |
|----------|----------|
| **Keep** | Home **foreground** sequence (sync + invalidate + insight refresh for **this** surface), **recovery** card wiring, **routine** overlay consumption, **`useInsightForScreen`**, **daily/weekly/mood** schedulers **as long as** they remain **home-owned** product choice. |
| **Do not pretend** | Dashboard is **not** a reusable **app-wide** orchestrator module — it is **`app/src/screens/Dashboard.tsx`** only. |
| **Extract (post-launch optional)** | Duplicated **invalidation** keys vs **`backgroundSync.ts`** — **engineering hygiene**, not **launch** identity. |

---

### 4. Recovery — primary authority vs guided surface

| Decision | Statement |
|----------|-----------|
| **Primary for** | **Persistence** of recovery blob (`recovery:progress:v1`) and **API surface** in **`app/src/lib/recovery.ts`** — **`getRecoveryProgress`**, **`resetRecoveryProgress`** (used from **`SettingsScreen.tsx`** — discovery). |
| **Primary for UX derivation** | **`app/src/lib/dashboard/recoveryCardMeta.ts`** — steps, blockers, **`getRecoveryPrimaryCta`**. |
| **Not established in code (discovery)** | **`setRecoveryStage`** / **`markStageCompleted`** have **no** call sites outside **`recovery.ts`** — **automated progression via these functions is not evidenced** in the traced app. |
| **Formal stance for launch** | Recovery is **primary state authority for stored progress + reset** and **primary for recovery-card copy/steps**, but **secondary as an automated “journey engine”** until product/engineering **confirm** how stage advances (wire APIs, alternate path, or manual-only). |

**Inference:** Vision docs assume a **journey**; code formalization must **not** over-claim **progression** beyond evidence.

---

### 5. Insight priority vs recovery CTA

| Decision | Statement |
|----------|-----------|
| **Insight priority** | **`InsightEngine`** + **`pickInsightForScreen`** / **`useInsightForScreen`** — **ranked** rule matches **per insights domain**. |
| **Recovery “next step”** | **`getRecoveryPrimaryCta`** etc. in **`recoveryCardMeta.ts`** — **separate** computation. |
| **Formal relationship** | **Parallel rankers** in code — **no** single merge function. **Product** must define **primary user-facing next action** (see `reclaim_primary_next_action_decision.md`). **Engineering** must **not** silently merge rankers without an explicit product spec. |

---

### 6. Notification paths — canonical vs other

| Path | Classification |
|------|----------------|
| **`reconcileNotifications`** + **`NotificationScheduler`** + prefs + **`NotificationIntentStore`** | **Canonical** materialization path (sink). |
| **`notificationTriggers.ts`** → **`setIntent`** → **`reconcileNotifications`** | **Canonical** for **health-triggered** intents. |
| **`trainingNotificationScheduler.ts`**, **`guidedTrainingNotificationActions.ts`**, **`refillReminders.ts`**, **`wellnessCalendarContextNudges.ts`** | **Domain** producers feeding **same** reconcile sink — **canonical** family. |
| **`scheduleDailySignalNotification`** / **`scheduleWeeklyNarrativeNotification`** / **`scheduleMoodTrendAlerts`** (`dailySignalNotification` et al., **`Dashboard.tsx`**) | **Surface-owned** scheduling tied to **insights output** / home — **legitimate**; **not** the same code path as full plan reconcile. |
| **`MoodScreen`** **`forceRescheduleNotifications`** | **Policy-variant** — **second** reschedule path alongside reconcile (**discovery**); **document** as **intentional** or **tech debt** per team. |

**Inference:** Idempotency of **`reconcileNotifications`** — **acceptable** pattern; **verify** empirically under battery constraints (**launch-critical architecture** doc).

---

### 7. Smallest architecture clarification for launch coherence

| # | Clarification |
|---|----------------|
| 1 | **`InsightContext` = insights-only** — **locked** naming and scope. |
| 2 | **Post-sync insight refresh = call-site responsibility** — **locked**; optional helper **later**. |
| 3 | **Dashboard = home foreground orchestrator, not global** — **locked**. |
| 4 | **Recovery = storage + card authority; progression engine unverified** — **locked** until code proves otherwise. |
| 5 | **Primary next action = product decision** with **UI** expression — **locked** as **clarification**; **may** need **small** UI copy/order changes (**not** a new architecture). |
| 6 | **Notification reconcile = sink**; **Dashboard** owns **daily signal** scheduling — **locked** as split. |
| 7 | **`reclaim_system_coherence_audit.md`** “hybrid” verdict — **accepted** as **accurate**: strong **insights layer**, parallel **recovery/routines**. |

---

## What each major system owns / does not own

**Authoritative table:** `reclaim_authority_rules_v1.md`.

---

## Related documents

- `reclaim_authority_rules_v1.md` — per-system rules.
- `reclaim_dashboard_orchestration_decision.md` — Dashboard scope.
- `reclaim_primary_next_action_decision.md` — CTA ownership.
- `reclaim_architecture_changes_cutline.md` — MUST / SHOULD / DEFER.

---

*Architecture formalization pass — docs only — `docs/release/`.*
