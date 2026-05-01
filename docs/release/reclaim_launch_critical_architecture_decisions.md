# Reclaim — launch-critical architecture decisions

**Framing:** Decisions about **who owns what** and **what order** things happen — **not** full redesign. **Code vs product** noted.

---

## MUST DECIDE BEFORE LAUNCH

| Decision | Why it matters | Risk if unresolved | Code vs clarity |
|----------|----------------|-------------------|-----------------|
| **Primary “next action” owner** (insight vs recovery vs routine) | User confusion, **two CTAs** | **Trust** and **coherence** | **Primarily product clarity** — may need **UI** code |
| **Contract: after `requestHealthSync`, who refreshes insights?** | Today **Dashboard** calls `refreshInsight` — **other** entry points? **Open** | Stale insights after sync from **Integrations** | **Clarify** + **optional** small hook |
| **Single notification reconcile policy** | `reconcile` called from many sites — **acceptable** if **idempotent** | Duplicate work / battery **Inference** | **Verify** idempotency; **document** |
| **Recovery stage advancement rules** | **Authority** in `recovery.ts` — must align with **product** | **Wrong** stage progression | **Product** + **code** alignment |

---

## SHOULD DECIDE BEFORE LAUNCH

| Decision | Why | Risk |
|----------|-----|------|
| **Whether to document `InsightContext` as insights-only** | Prevents **scope creep** into “global brain” | **Medium** — team confusion |
| **Invalidation map** — which keys after sync | **Consistency** across screens | **Stale** data |
| **Intent store vs direct schedule** | Dual path in `NotificationIntentStore` comment | **Maintenance** |

---

## CAN DEFER UNTIL POST-LAUNCH

| Decision | Why deferrable |
|----------|----------------|
| **Unified `AppWellbeingSnapshot`** | **Nice** for formal orchestration — **not** required if product **clarifies** CTAs |
| **Extracting `Dashboard` orchestration** | **Refactor** — **no** launch block if behavior works |
| **Merging recovery + insight rankers** | **Large** — **only** if product demands **one** brain |
| **Repository-layer strangler** | Inventory WANTED — **engineering** |

---

## Smallest architecture move (from audit)

**Product clarity:** **Name** which surface owns **primary** guidance (insight card vs recovery card). **Engineering:** **Document** `SyncCoordinator` → `reconcileNotifications` and **Dashboard** `refreshInsight` as **intended** foreground sequence — **no** new service unless **repeat** patterns emerge elsewhere.

---

*See `reclaim_architecture_authority_audit.md`.*
