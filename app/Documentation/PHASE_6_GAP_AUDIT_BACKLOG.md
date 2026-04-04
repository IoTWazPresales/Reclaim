# Phase 6 — Gap audit and backlog (April 2026)

This document captures what the **reclaim phased pass** (training → meds relevance → onboarding guide → heart-rate foundation → mindfulness gating) delivered, what is **intentionally unfinished**, and **recommended next work** in priority order. It is a living backlog; triage dates and owners belong in your tracker.

## Summary of shipped phases (reference)

| Phase | Theme | Main outcome |
|-------|--------|----------------|
| 1 | Training progression | Session UI reflects logged sets using DB + runtime + optimistic state so progress does not look stuck after “Done”. |
| 2 | Meds relevance | Dashboard insight fallbacks and foundation recovery respect whether meds are configured. |
| 3 | Post-onboarding guide | Scoped dismiss storage; single “Start on Home” card; removed erroneous per-mount `AsyncStorage` write. |
| 4 | Heart-rate foundation | Exported `HealthConnectDailyVitals`; pure `summarizeRestingHeartRateTrend`; `fetchHeartRateContextSummary` (Android HC, iOS empty until HealthKit path exists). |
| 5 | Mindfulness gating | Persisted reactive-trigger toggle; HR spike requires +15 BPM over threshold when resting context is not `adequate`; softer notification copy; removed dead `App.tsx` import. |

## P1 — Correctness, trust, and platform parity

1. **iOS resting-HR context for gating** — `fetchHeartRateContextSummary` returns an empty summary on iOS. Mindfulness HR gating therefore always uses the “sparse” rule (+15 BPM). Add a HealthKit aggregation path (mirror the 14-day lookback + same shape as `HealthConnectDailyVitals`) so iOS matches Android behavior where permissions allow.

2. **Single source of truth for “high HR”** — Reactive triggers subscribe via **Google Fit**; context comes from **Health Connect** on Android. When a user has one but not the other, gating may be noisy or overly conservative. Options: document the limitation in-product (Mindfulness screen copy), align subscriptions with the same backend as vitals, or degrade gracefully with explicit “limited context” messaging.

3. **`InsightCard` test stability** — `src/components/__tests__/InsightCard.test.tsx` has historically failed at collection time (mock / syntax / environment). Decide: fix mocks for Vitest + RN, or quarantine with a clear skip and a tracking issue.

## P2 — Product and UX follow-through

4. **Wire HR summary into insights (optional)** — Phase 4 is intentionally not hooked to `InsightsProvider` or dashboard copy. If product wants physiology-aware insight text, add a thin adapter that passes only **non-clinical** labels (`trendLabel`, `sufficiency`) into the context builder; avoid diagnostic or anxiety-forward language.

5. **Dashboard home follow-ups** — See `DASHBOARD_STRUCTURE_FOLLOWUPS.md`: sleep empty-state vs provider context, unused `DashboardSleep` / `DashboardExercise`, telemetry scopes for mood modal, recovery placement, duplicate training emphasis when tile + primary action both highlight training.

6. **InsightCard polish WIP** — Local visual/typography work may still live in a stash or side branch; merge deliberately after visual sign-off so Home stays consistent with the design contract.

## P3 — Repo hygiene and tooling

7. **`app/android/` untracked** — Either add to `.gitignore` (if generated locally) or commit a deliberate native baseline if the team standard is to version it; avoid accidental mega-diffs in unrelated PRs.

8. **ESLint / import hygiene** — If `no-duplicate-imports` (or similar) flags `DashboardRecovery.tsx` for split `react-native-paper` imports, consolidate into one import line. Run a targeted lint pass on touched dashboard files before the next wide cleanup.

9. **Broader audit docs** — Older reports (`DEEP_AUDIT_*.md`, `NOTIFICATION_SYSTEM_AUDIT_COMPREHENSIVE.md`, etc.) may overlap this backlog. When resolving an item, add a one-line pointer here (“see commit …”) or archive superseded sections to reduce confusion.

## Suggested sequencing (next sprint-sized slices)

1. Fix or quarantine `InsightCard` tests + quick ESLint fix on `DashboardRecovery` if it blocks CI.  
2. iOS HealthKit vitals slice matching `summarizeRestingHeartRateTrend` inputs.  
3. Copy + product note on Fit vs Health Connect for mindfulness triggers.  
4. Optional: insight context adapter using Phase 4 summary.  
5. Dashboard follow-ups from `DASHBOARD_STRUCTURE_FOLLOWUPS.md` as prioritized by design.

---

*Generated as Phase 6 of the reclaim phased delivery plan. Update this file when closing items or reprioritizing.*
