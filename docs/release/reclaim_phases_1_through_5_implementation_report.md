# Reclaim — Phases 1–5 implementation report (approved)

**Status:** Stakeholder **approved** Phase 5 (and Phases 1–4) as of the conversation that requested this document.  
**Purpose:** Single handoff for ChatGPT or internal reporting: what was implemented across **PHASE 1–PHASE 5** of the prelaunch execution track (truth/trust, Home coherence, Android permissions, Tier 1 reviewer cleanup, SHOULD/freshness coherence).  
**Scope boundary:** This report describes the **prelaunch phased implementation** narrative. The repo branch may also contain **other** engineering-remediation edits; reconcile with `git diff` / `git status` for exact attribution.

---

## Executive summary

| Phase | Theme | Outcome |
|-------|--------|---------|
| **1** | Truth / trust / claims (M2, M4, M7, related docs) | Health API doc aligned to manifest + default metrics; training history honest about calories + ghost-session filter; recovery/adaptation copy qualified |
| **2** | Home coherence / launch narrative (M6, onboarding alignment) | Dashboard composition and copy emphasize **Daily signal** first; recovery framed as support; onboarding wording aligned |
| **3** | Android compliance / fairness (M10, minimal S6) | **`ACTIVITY_RECOGNITION` removed** from Expo config and main Android manifest; docs updated; step/RHR insights rely on real context (no fabricated zeros) |
| **4** | Reviewer-visible Tier 1 (M9) | Placeholders/dev tools verified removed or gated; intervention **display names**; training session footer **Done** vs **Minimize**; history filter confirmed |
| **5** | Low-blast coherence / freshness (S1/S2/S5/S9 subset) | Onboarding sleep connect calls **`refreshInsights('onboarding-sleep-connect')`**; **`reclaim_cache_invalidation_map.md`**; **`forceRescheduleNotifications`** documented in authority rules; Garmin/Huawei **honest copy** |

---

## PHASE 1 — Truth / trust / claim alignment

### Intended scope (from plan)

- **M2:** `app/Documentation/HEALTH_API_COVERAGE.md` matches `withHealthConnectPermissions.js` + `HEALTH_CONNECT_DEFAULT_METRICS` in `healthConnectService.ts`; warning not to paste blindly into Play Console.
- **M4 + T1-06:** `TrainingHistoryView.tsx` — neutral active-calorie wording (no misleading Health Connect implication where not granted); filter ghost sessions (**0 exercises + 0 sets**; ended sessions **> 480 min** wall time).
- **M7:** Copy only — capabilities, recovery card, dashboard recovery — no strong “automatic journey” or unsupported adaptation claims.

### Files touched (primary)

- `app/Documentation/HEALTH_API_COVERAGE.md`
- `app/src/components/training/TrainingHistoryView.tsx`
- `app/src/screens/onboarding/CapabilitiesScreen.tsx`
- `app/src/components/dashboard/DashboardRecovery.tsx`

### What to tell ChatGPT (one paragraph)

Phase 1 aligned **documentation with actual Android Health Connect manifest and default runtime metrics**, fixed **training history** so active calories are not framed as Health Connect–sourced when that is not the default bundle, added a **ghost-session filter** for absurd duration and empty completions, and **tightened recovery/training onboarding copy** so it does not promise automation that the codebase does not evidence.

---

## PHASE 2 — Home coherence / launch narrative

### Intended scope

- **M6:** Single primary “daily read” story on Home: **Daily signal** (insights) first; recovery as supporting context.
- Onboarding screens aligned with that promise (**Welcome**, **Capabilities**).

### Files touched (primary)

- `app/src/screens/Dashboard.tsx` — compose order (insight → primary action → tiles → today → recovery); post-onboarding copy.
- `app/src/components/dashboard/DashboardInsight.tsx` — “Daily signal” headers / empty states.
- `app/src/components/InsightCard.tsx` — dashboard uses “Daily signal” title/a11y; other screens may remain “System insight” as implemented.
- `app/src/screens/onboarding/WelcomeScreen.tsx`
- `app/src/screens/onboarding/CapabilitiesScreen.tsx`

### What to tell ChatGPT

Home’s **layout and copy** were adjusted so the **Daily signal** is the primary interpreted read and **recovery** is **support**, with **onboarding text** consistent with what Home shows.

---

## PHASE 3 — Android fairness / permissions / compliance-sensitive

### Intended scope

- **M10:** Remove **`ACTIVITY_RECOGNITION`** unless product ties it to a shipped feature (decision: remove — Health Connect–only path).
- **S6 (minimal):** Do not imply steps/RHR insights when context is missing; engine already treats missing fields as non-matching; docs note behavior.

### Files touched (primary)

- `app/app.config.ts` — `android.permissions` without `ACTIVITY_RECOGNITION`
- `app/android/app/src/main/AndroidManifest.xml` — removed duplicate `ACTIVITY_RECOGNITION` line (keep merged manifest aligned)
- `app/Documentation/HEALTH_API_COVERAGE.md` — note on permission + step rules
- `app/Documentation/HEALTH_FIXES_SUMMARY.md` — historical vs current (Google Fit / `ACTIVITY_RECOGNITION`)
- `app/Documentation/HEALTH_INTEGRATION_DIAGNOSIS.md` — banner that April 2026 build is HC-based

### Rebuild note

Any **`app.config` / manifest permission** change requires a **new native binary** (EAS/local) before store manifest reflects the removal.

### What to tell ChatGPT

**Activity Recognition** was **removed** from Expo config and the app manifest because the shipping path uses **Health Connect reads** that do not require it; internal docs were updated so reviewers and engineers are not pointed at obsolete Google Fit + permission stories.

---

## PHASE 4 — Reviewer-visible Tier 1 cleanup (M9)

### Checklist vs `PHASE_7_UI_AUDIT_BACKLOG.md` Tier 1

| ID | Topic | Resolution (as implemented) |
|----|--------|-----------------------------|
| T1-01 | Sleep roadmap card | **Removed / absent** in current `SleepScreen` (verify by grep) |
| T1-02 | Spotify placeholder | **Removed / absent** in `MeditationScreen` |
| T1-03 | Dev voice comment as UI | **Gone** (voice UI uses normal accessibility labels) |
| T1-04 | Test Sentry | **`__DEV__`** gate in `AboutScreen` |
| T1-05 | Test reminder on Meds | **Not present** in current `MedsScreen` (verify) |
| T1-06 | Ghost training sessions | **`TrainingHistoryView`** filter (duration + empty summary) |
| T1-07 | Raw intervention IDs | **`formatInterventionLabel`** in `lib/mindfulness.ts` + history row |
| T1-08 | Training session footer | **Minimize** + primary **Finish session** + demoted cancel; ended state button **Done** (not “Close”) |

### Files touched (primary)

- `app/src/lib/mindfulness.ts` — `formatInterventionLabel`, aliases (`breath_478`, `urge_surfing`)
- `app/src/screens/MindfulnessScreen.tsx` — recent sessions title uses formatter
- `app/src/components/training/TrainingSessionView.tsx` — footer labels
- `app/src/screens/AboutScreen.tsx` (T1-04)

---

## PHASE 5 — Low-blast coherence / freshness (SHOULD subset)

### Intended scope

- **S1:** After onboarding sleep connect + sync, refresh insights so Home/Sleep are not stale vs Integrations/Sleep main flows.
- **S2:** Document React Query invalidation vs explicit `refreshInsight` (background task does not refresh insights).
- **S5:** Garmin / Huawei — user-honest subtitles and alerts (**not available in this release** / direct to HC or Apple Health).
- **S9:** Document **`forceRescheduleNotifications`** vs debounced **`reconcileNotifications`**.

### Files touched (primary)

- `app/src/screens/onboarding/SleepStepScreen.tsx`
  - `useScientificInsights()` + `refreshInsights('onboarding-sleep-connect')` after successful connect + cache invalidations
- `docs/release/reclaim_cache_invalidation_map.md` — **new** S2 map (query keys + when insights refresh)
- `docs/release/reclaim_authority_rules_v1.md` — section **`forceRescheduleNotifications` (maintenance / S9)**
- `app/src/lib/health/integrations.ts` — Garmin/Huawei `subtitle` and `connect*()` user-facing messages

### What to tell ChatGPT

Phase 5 **closed the onboarding sleep gap** for insight freshness, **documented cache invalidation vs insight refresh**, **clarified notification reschedule authority**, and **removed misleading “partner API setup” framing** for Garmin/Huawei in favor of **not available in this release** plus Health Connect / Apple Health guidance in alerts.

---

## Verification performed (automated / recurring)

- **`npm run typecheck`** (`tsc --noEmit`) run successfully after substantive TS/TSX changes in this track (as reported in session).

### Not claimed as fully executed in this report

- Full **`vitest`** / **`eslint`** / **EAS production build** after every micro-change (run before release as needed).
- **Play Console** manual steps (M1/M3/M8) — out of repo.

---

## Deferred / not part of Phases 1–5

- **Phase 7 Tier 2+** items in `PHASE_7_UI_AUDIT_BACKLOG.md` (raw IDs, date formats, etc.) — separate sweep.
- **New global orchestrator** — explicitly not introduced.
- **Widening Health Connect manifest** — not done.

---

## Suggested git commit message (single squashed commit)

```
feat(reclaim): prelaunch phases 1–5 — trust, Home, Android permissions, Tier 1, freshness docs

- Align HEALTH_API_COVERAGE with HC plugin + default metrics; training history + ghost filter
- Dashboard/onboarding Daily signal coherence; recovery as support
- Remove ACTIVITY_RECOGNITION from app.config + manifest; update health docs
- Tier 1 reviewer cleanup: intervention labels, session footer, About __DEV__ Sentry
- Onboarding sleep connect refreshInsights; invalidation map; Garmin/Huawei copy; authority S9 note
```

---

## One-block paste for ChatGPT

```
APPROVED: Reclaim prelaunch Phases 1–5 implementation summary.

Phase 1: HEALTH_API_COVERAGE aligned to withHealthConnectPermissions + HEALTH_CONNECT_DEFAULT_METRICS; TrainingHistoryView neutral active-calorie copy + ghost-session filter (>480min ended, 0 ex/0 sets); Capabilities + DashboardRecovery copy qualified (no unsupported adaptation claims).

Phase 2: Dashboard reordered for Daily signal first, recovery/support secondary; DashboardInsight + InsightCard dashboard labeling; Welcome + Capabilities aligned to Home narrative.

Phase 3: Removed ACTIVITY_RECOGNITION from app.config.ts and main AndroidManifest; updated HEALTH_* docs; S6 handled via engine undefined context + docs (no HC scope expansion).

Phase 4 (M9 Tier 1): Tier 1 items verified fixed or absent; added formatInterventionLabel in lib/mindfulness.ts + MindfulnessScreen history; TrainingSessionView footer Minimize/Finish/Done; About Test Sentry __DEV__ only.

Phase 5 (SHOULD): SleepStepScreen calls refreshInsights('onboarding-sleep-connect') after HC connect+sync; new docs/release/reclaim_cache_invalidation_map.md; reclaim_authority_rules_v1.md documents forceRescheduleNotifications; integrations.ts Garmin/Huawei “Not available in this release” + user-facing alerts.

Checks: npm run typecheck passed along the way. Native rebuild needed after manifest permission change.

Full detail: docs/release/reclaim_phases_1_through_5_implementation_report.md
```

---

*End of report.*
