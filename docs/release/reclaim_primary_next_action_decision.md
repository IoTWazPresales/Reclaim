# Reclaim — primary next action decision

**Problem:** Code has **two** ranked “what matters” mechanisms **without** a single merge: **`InsightEngine`** (`app/src/lib/insights/InsightEngine.ts` + `insights.json`) and **recovery card** (`app/src/lib/dashboard/recoveryCardMeta.ts` — e.g. **`getRecoveryPrimaryCta`**). **`Dashboard.tsx`** orders **visual** hierarchy by **component tree**, not one function (`reclaim_code_first_architecture_discovery.md`).

**This document** separates **product** decisions from **engineering** facts.

---

## Who owns the user-facing primary next action?

| Layer | Owner | Nature |
|-------|--------|--------|
| **Product / design** | **Primary owner** of **which** story is **primary** on Home: **scientific insight** vs **recovery journey** vs **routine** — **must** be explicit for launch coherence (`reclaim_launch_critical_architecture_decisions.md`, `reclaim_vision_alignment_audit.md` tension: “one clear daily insight” vs **dense** dashboard). |
| **Engineering** | **Implements** hierarchy (order, prominence, **single** hero vs **two** cards) **per** product spec — **not** a new orchestrator module **unless** product requires **one** ranked list. |

**Formalization (v1):** There is **no** **`AppWellbeingSnapshot`** or **global ranker** in code. **Do not** implement one **for launch** unless product **mandates** it (`reclaim_architecture_authority_audit.md` verdict).

---

## How insights, recovery, routines, and notifications relate

| Domain | Role in “next action” | Code fact |
|--------|------------------------|-----------|
| **Insights** | **Ranked** scientific matches; **`useInsightForScreen`** picks **one** per surface | **`InsightsProvider`** only |
| **Recovery** | **Steps + CTA** from **`recoveryCardMeta`** + **`getRecoveryProgress`** | **Parallel** to `InsightEngine` |
| **Routines** | **Overlay / schedule** on Home — **third** planning layer (`reclaim_system_coherence_audit.md` — **inference**) | **`Dashboard`** + **`lib/routines`** |
| **Notifications** | **Remind** / **nudge**; **daily signal** uses **top insight** content — **extends** insight story off-app (`reclaim_launch_critical_integrations.md`) | **`reconcileNotifications`** sink + **`dailySignalNotification`** from **`Dashboard`** |

**Relationship:** **Complementary** channels — **not** unified ranking **in v1 code**.

---

## Ambiguity to remove **before** launch

| # | Ambiguity | Removal |
|---|-----------|---------|
| 1 | **Two CTAs** on Home (insight vs recovery) **contradict** or **compete** without explanation | **Product:** **scope** copy **or** **order** so **one** is **primary**; **secondary** is **supporting** (see `reclaim_launch_critical_integrations.md` “minimum clarity”). |
| 2 | User expects **one** “daily insight” (onboarding) but sees **many** tiles | **Product:** **align** onboarding promise **or** **dashboard** hierarchy (`reclaim_vision_alignment_audit.md`). |
| 3 | **Recovery stage** “journey” in copy vs **no** evidenced **`setRecoveryStage`** callers | **Product + engineering:** align story with **actual** progression mechanism **or** document **manual**/**settings**-driven reset (`reclaim_architecture_discovery_vs_prior_audits.md`). |
| 4 | **Stale insights** after sync from **Integrations** / **Sleep** | **Engineering:** **call-site** **`refreshInsight`** where freshness is required **or** accept **stale** until next home visit — **explicit** choice (`reclaim_architecture_formalization_decisions.md` §2). |
| 5 | **Mood** **`forceRescheduleNotifications`** vs **reconcile-only** paths | **Team:** **intentional** dual policy **or** **debt** — **label** in `reclaim_architecture_changes_cutline.md`. |

---

## Formal statement (v1)

**The user-facing “primary next action” is **owned by product** and **expressed** in **Home UI** (`Dashboard.tsx`).** **Insights** and **recovery** remain **separate authorities** in code; **notifications** **amplify** insights (daily signal) **and** **domain** schedules (training, meds, triggers, etc.) **without** merging into a single engine **for v1**.

---

*See `reclaim_architecture_formalization_decisions.md` §5, `reclaim_authority_rules_v1.md`.*
