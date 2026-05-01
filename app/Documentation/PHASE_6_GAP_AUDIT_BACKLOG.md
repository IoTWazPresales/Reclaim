# Phase 6 — Gap audit and backlog (April 2026)

This document captures what the **reclaim phased pass** delivered, what is **intentionally unfinished**, and **recommended next work**. For **permission ↔ UI coverage** and **not-yet-integrated APIs**, see [`HEALTH_API_COVERAGE.md`](./HEALTH_API_COVERAGE.md).

## Summary of shipped phases (reference)

| Phase | Theme | Main outcome |
|-------|--------|----------------|
| 1 | Training progression | Session UI reflects logged sets using DB + runtime + optimistic state so progress does not look stuck after “Done”. |
| 2 | Meds relevance | Dashboard insight fallbacks and foundation recovery respect whether meds are configured. |
| 3 | Post-onboarding guide | Scoped dismiss storage; single “Start on Home” card; removed erroneous per-mount `AsyncStorage` write. |
| 4 | Heart-rate foundation | Exported `HealthConnectDailyVitals`; pure `summarizeRestingHeartRateTrend`; `fetchHeartRateContextSummary`. |
| 5 | Mindfulness gating | Persisted reactive-trigger toggle; HR spike gating; softer notification copy. |

## P1 — Correctness, trust, and platform parity

1. **iOS resting-HR context** — **Done:** `fetchHeartRateContextSummary` reads Apple HealthKit resting HR (when Apple Health is **connected** in Integrations) via `appleHealthKitFetchRestingHrDailyRows` → same `summarizeRestingHeartRateTrend` path as Android. Shared bucketing in `restingHrDailyRows.ts` (tested).
2. **Single source of truth for “high HR”** — **Done (product copy + code comments):** Mindfulness screen explains Android Fit vs Health Connect; `notificationTriggers` header documents iOS gap. **Not done:** iOS native subscription wired into `startHealthTriggers` (see coverage doc).
3. **`InsightCard` test stability** — Passing under Vitest; re-open if CI differs.

## P2 — Product and UX follow-through

4. **Wire HR summary into insights** — **Done:** `fetchInsightContext` loads `fetchHeartRateContextSummary` in parallel; `InsightContext.vitals` exposes `restingHrTrendLabel` and `restingHrSufficiency`; rule `resting-hr-trend-up-mood-soft` in `insights.json`.
5. **Dashboard home follow-ups** — **Partially done:** Sleep empty-state distinguishes **no provider connected** vs **provider connected, no row in Reclaim** (`getAllIntegrationStatuses`); primary action meta dedupes training vs tile; mood tile modal logs `uiSurface: home_tile_modal`. See [`DASHBOARD_STRUCTURE_FOLLOWUPS.md`](./DASHBOARD_STRUCTURE_FOLLOWUPS.md) for remaining polish.
6. **InsightCard polish** — Confirm Home cards vs design contract after typography changes.

## P3 — Repo hygiene and tooling

7. **`app/android/`** — **Done:** `app/android/` and `app/ios/` added to **repo root** `.gitignore` for local Expo prebuild noise; remove from `.gitignore` when committing a deliberate native baseline.
8. **ESLint** — `InsightEngine` dev logging uses `logger.debug` (no stray `console` disable).
9. **Broader audit docs** — Add pointers when closing items; `HEALTH_API_COVERAGE.md` reduces duplication for health scopes.

## Updates since initial audit (living)

- Training “End & save” HC calorie merge; insights sleep/training vitals rules; **this file** refreshed for Phase 6 closure items above.

## Suggested sequencing (remaining)

1. iOS **reactive** HR triggers (HealthKit live stream) aligned with `hrSpikeShouldTriggerMindfulness` (`liveSamplesMisalignedWithRestingContext: false` when same pipeline).
2. Optional: dedicated resting-HR / recovery **tile** (non-clinical) if product wants stronger Play justification.
3. Dashboard follow-ups from `DASHBOARD_STRUCTURE_FOLLOWUPS.md` (Skia, haptics, third tile row).
4. Google Fit removal / HC-only triggers per `PHASE_0_HC_ANDROID_DECISIONS.md` (later phase; **do not** strip permissions until policy strategy is explicit).

---

*Update this file when closing items or reprioritizing.*
