# Reclaim — architecture changes cutline

**Purpose:** Classify **potential** work implied by formalization — **not** a sprint plan. **No** code changes in this document.

**Axes:** **MUST** / **SHOULD** / **CAN DEFER** — each with **why**, **risk if unresolved**, **code vs rule/ownership**.

---

## MUST address before launch / ship candidate

**Note:** “MUST” here is **architecture / coherence** — **not** Play policy (see separate audits). **Product** may still ship with **documented** debt if **risk** is accepted.

| Item | Why | Risk if unresolved | Code vs clarification |
|------|-----|---------------------|------------------------|
| **Lock `InsightContext` as insights-only** | Prevents **team** building a “global brain” by accident | Wrong abstractions, wasted work | **Clarification** (docs + reviews) — **done** in `reclaim_architecture_formalization_decisions.md` |
| **Lock post-sync insight contract** | **`SyncCoordinator`** does **not** refresh insights | **Stale** interpretation after sync from **Integrations** / **Sleep** | **Clarification** first; **optional** shared helper = **code** |
| **Product: primary Home story** (insight vs recovery) | Two rankers in code (`reclaim_primary_next_action_decision.md`) | **Trust** / **confusion** | **Primarily product + UI**; **may** need **small** layout/copy **code** |
| **Align recovery journey **story** with progression evidence** | **`setRecoveryStage` / `markStageCompleted`** uncalled outside **`recovery.ts`** | **Broken** expectation of “journey” | **Product** + **verify** code; **wire** APIs = **code** |
| **Document notification sink** | Many **`reconcileNotifications`** callers | **Fear** of “chaos” — **mitigate** with **idempotent** contract | **Clarification**; **profiling** = **optional code** |

---

## SHOULD change before launch (if time)

| Item | Why | Risk | Code vs clarification |
|------|-----|------|------------------------|
| **Shared helper or hook**: after **`requestHealthSync`**, **`invalidateQueries` + `refreshInsight`** for **repeat** entry points | **Dashboard** does it **right**; **other** screens may **not** | **Stale** insights | **Code** (small) |
| **Invalidation map** — **Dashboard** vs **`backgroundSync`** keys | Partial **overlap** / **duplicate** | **Stale** or **double** fetches | **Doc** first; **dedupe** = **code** |
| **Label `forceRescheduleNotifications` on Mood** (`MoodScreen.tsx`) vs **reconcile-only** | Two **policy** paths | **Maintenance** confusion | **Clarification**; **unify** = **code** |
| **Verify `reconcileNotifications` idempotency / cost** under **boot** + **sync** | Many call sites | **Battery** / **jank** | **Measurement** + **maybe** throttle **code** |

---

## CAN defer until post-launch

| Item | Why deferrable | Risk of deferring | Code vs clarification |
|------|----------------|---------------------|------------------------|
| **Extract `Dashboard` orchestration** into modules | Behavior **works**; **extract** = **hygiene** | **Harder** changes later | **Code** |
| **Unified `AppWellbeingSnapshot`** | **Not** in codebase; **large** | **Continued** dual rankers | **Code** + **product** |
| **Merge insight + recovery rankers** | **Explicitly** out of scope unless product **mandates** | **Ongoing** two-CTA tension | **Code** + **product** |
| **Merge RQ cache with `fetchInsightContext` fetches** | **Parallel** today | **Duplicate** network | **Code** |
| **Repository strangler / `sync.ts` split** | **Engineering** roadmap | **Maintainability** | **Code** |
| **Wire `setRecoveryStage` / `markStageCompleted`** | **No** current callers | **Journey** stays **manual** or **implicit** | **Code** |

---

## Summary

| Bucket | Dominant type |
|--------|----------------|
| **MUST** | **Clarifications** + **product** decisions; **small** **code** only where **stale** insights or **CTA** incoherence **blocks** launch narrative |
| **SHOULD** | **Small** **code** (helpers, invalidation alignment) + **measurement** |
| **DEFER** | **Large** refactors, **unified** ranker, **snapshot** |

---

*See `reclaim_launch_critical_architecture_decisions.md` (prior list), `reclaim_architecture_formalization_decisions.md`.*
