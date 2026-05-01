# Reclaim — orphaned & siloed systems

**Method:** Surfaces that **lack** strong bidirectional ties to `fetchInsightContext` / core loop or **misrepresent** integration.

---

## Appear isolated or placeholder-heavy

| System / surface | Why siloed | Evidence |
|------------------|------------|----------|
| **Garmin Connect** | No connector → **no** insight context | `integrations.ts` `connectGarmin` |
| **Huawei Health** | Same | `integrations.ts` `connectHuawei` |
| **Analytics tab** | Aggregates mood + meditation; **not** a driver of `InsightEngine` on open **Inference** | `AnalyticsScreen.tsx` |
| **Evidence notes / peer content** | Depth content; **outside** `InsightContext` | Nav + screens (architecture recon) |

---

## Weakly connected (misleading “integrated” feel)

| System | Issue |
|--------|--------|
| **Training weekly “Health Connect” calories** | Label implies HC path; `active_energy` not in default connect — **Play/vision audit** |
| **Steps-driven rules** | `insights.json` + `steps.lastDay`; **Android** may lack step data — rules **silent** or **never** fire |
| **Resting HR on Android** | `fetchHeartRateContextSummary` returns empty — **vitals** slice in insights **weak** |

---

## Conceptually present, thinly realized

| Area | Note |
|------|------|
| **Wearables “Glance” projection** | Planned in discussion recon; **no** `wearables/` in tree |
| **Full notification intent cutover** | `NotificationScheduler` + intents — **partial** vs Codex “complete story” |
| **Repository layer for all writes** | Architecture WANTED — **not** blocking interconnection but **fragmentation** risk |

---

## Parallel systems that compete for “truth”

| A | B | Risk |
|---|---|------|
| **InsightEngine top match** | **Recovery primary CTA** | User may get **two** “do this next” stories **Inference** |
| **Routine templates / overlay** | Recovery steps | **Three** planning metaphors on `Dashboard.tsx` |

---

## Recommendations (audit-only)

- **Tighten** which surface “owns” next action (insight vs recovery vs routine) — product decision.
- **Label** placeholders (Garmin/Huawei) so they **don’t** read as integrated health.
- **Guard** step-dependent rules when `steps` undefined.

---

*See `reclaim_feature_drift_and_clutter.md` for overlap.*
