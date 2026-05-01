# Phase 1 — Health Connect permission ↔ feature matrix

**Status:** Living document (additive rollout; no permission removals in this wave).  
**Updated:** 2026-04-01.

| HC permission (Android) | App / code use | User-visible surface (target) | Play / listing note |
|---------------------------|----------------|---------------------------------|---------------------|
| `READ_SLEEP` | Sleep sync, `SleepSession`, wake time | Sleep screen, dashboard | Core sleep feature |
| `READ_HEART_RATE` | Daily vitals, sleep enrichment | Sleep session HR lines | Sleep + recovery context |
| `READ_RESTING_HEART_RATE` | Daily vitals, HR trigger context | Indirect (mindfulness gating) | Describe resting context for optional nudges |
| `READ_HEART_RATE_VARIABILITY` | Daily vitals, sleep enrichment | Sleep copy / future charts | Recovery / sleep physiology (non-clinical) |
| `READ_ACTIVE_CALORIES_BURNED` | Daily sync + **per training session window** | Training history, session detail, summary after workout | Energy burn tied to logged workouts |
| `READ_TOTAL_CALORIES_BURNED` | Fallback in daily activity read | Optional; only if shown | Use only if UI references total |
| `READ_EXERCISE` | Not required for v1 session calories | — | Defer until exercise sessions shown |
| `READ_OXYGEN_SATURATION` | Sleep enrichment | Sleep screen (avg / low when present) | Overnight SpO₂ as wellness context |
| `READ_RESPIRATORY_RATE` | Sleep enrichment | Sleep screen (avg when present) | Overnight breathing rate context |
| `READ_BODY_TEMPERATURE` | Sleep enrichment | Sleep screen (skin temp) | Overnight temperature context |

**Google Fit (Android):** Still present in codebase for legacy flows; **removal** is a later phase — not part of this document’s execution.

**Next steps:** Keep matrix in sync when adding insight rules or removing types.

**Coverage audit:** See [`HEALTH_API_COVERAGE.md`](./HEALTH_API_COVERAGE.md) for declared vs integrated surfaces (including items **not** yet standalone UI).
