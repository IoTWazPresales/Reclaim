# Reclaim — Dashboard orchestration decision

**Evidence base:** `reclaim_code_first_architecture_discovery.md`, `reclaim_cross_module_call_paths.md`, `reclaim_orchestration_candidates_from_code.md`.

**Principle:** **`Dashboard.tsx`** (`app/src/screens/Dashboard.tsx`) is the **foreground home surface**. It is **not** an importable orchestration service. Formalization **names what it may keep** vs what **must not** be assumed globally.

---

## What Dashboard **should keep** owning (v1 — code-backed)

| Responsibility | Why (evidence) |
|----------------|----------------|
| **`runHealthSync`** (or equivalent) + **`refreshInsight('health-sync')`** + **related `invalidateQueries`** | Reference **home** path for “sync → fresh cache → fresh insights” (`reclaim_cross_module_call_paths.md`). |
| **`useInsightForScreen`** for **home** insight presentation | One of four **`useInsightForScreen`** call sites — discovery. |
| **Recovery card** data fetch + **`recoveryCardMeta`** inputs | **`getRecoveryProgress`** query + card composition — discovery. |
| **`scheduleDailySignalNotification`**, **`scheduleWeeklyNarrativeNotification`**, **`scheduleMoodTrendAlerts`** | **Only** file importing these — discovery; **product** choice that **home** drives these schedules. |
| **Mood modal / quick flows** that call **`refreshInsight`** + invalidation | Coherence loop on **home** (`reclaim_launch_critical_integrations.md`). |
| **Broad `invalidateQueries`** for **domains the home cares about** | Many keys — **acceptable** for **this** surface if **invalidation map** is documented elsewhere. |

---

## What Dashboard **should stop** being treated as owning (clarification, not necessarily code removal)

| Misconception | Formal truth |
|---------------|--------------|
| “Dashboard **is** the app orchestrator” | It **only** orchestrates **home**; **`IntegrationsScreen`**, **`SleepScreen`**, **`MoodScreen`**, **`RootNavigator`**, **`backgroundSync`** have **their own** sequences. |
| “After **any** sync, insights are fresh” | **False** unless **`refreshInsight`** ran on **that** path — **`SyncCoordinator`** does **not** refresh insights. |
| “Dashboard invalidates **everything** for the whole app” | It invalidates **many** keys **for home’s benefit**; **other tabs** may still need **focus** / **refresh** patterns — **inference** from RN typical behavior. |

---

## What **can remain** in Dashboard for v1 (temporary by design)

| Item | Reason |
|------|--------|
| **Large** inline orchestration (sync + invalidate + insight + schedulers) | **No** launch requirement to extract; **`reclaim_launch_critical_architecture_decisions.md`** already allows deferring extraction. |
| **Overlap** with **`backgroundSync.ts`** invalidation keys | **Document**; **dedupe** = **post-launch** hygiene unless **stale** bugs appear. |
| **Daily signal** scheduling on Home only | Matches **“top insight → push”** story (`reclaim_system_coherence_audit.md`); **moving** to another module = **optional** refactor. |

---

## What **should eventually** move elsewhere (post-launch — optional)

| Item | Target kind | Risk if never moved |
|------|-------------|---------------------|
| **Shared post-sync** helper: invalidate + optional **`refreshInsight`** | Small util or hook **called** from Dashboard + Integrations + Sleep | **Stale insights** after sync from non-home flows; **duplication** bugs. |
| **Invalidation map** (single table of keys after sync) | Doc or module | **Inconsistent** cache vs **insights** |
| **Daily/weekly/mood schedulers** | Could move to **notification domain** if product wants **non-home** triggers | **Coupling** home to **all** signal scheduling |

**None** of these are **mandatory** for **architecture formalization** — they are **engineering hygiene** once product locks **contracts**.

---

## Verdict

**Dashboard keeps** **home foreground orchestration** and **home-owned** notification schedulers. **Dashboard does not** own **global** post-sync insight policy or **other** tabs’ refresh contracts. **v1** is **coherent** if **call-site** rules for **`refreshInsight`** are **followed** across **`requestHealthSync`** entry points (see `reclaim_architecture_formalization_decisions.md` §2).

---

*See `reclaim_authority_rules_v1.md`, `reclaim_architecture_changes_cutline.md`.*
