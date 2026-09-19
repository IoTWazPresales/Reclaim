# Stage B charter — PRG-20260917T222550

**Date:** 2026-09-19  
**Gate:** GATE 1 — **stop**. Stage C starts only after operator replies (UI direction; which features).  
**Ledger rev:** 56  
**Branch:** `fix/training-confident-ux`

## Order disagreement

The prompt’s execute order (SoT/data-loss → correctness → routine → insets → UI direction → features) is **accepted with two changes**:

1. **Play HC request-set (N-0015) and account delete (N-0014) sit in wave 1 with SoT bugs**, not after the routine layer. They are market/Play blockers. Routine work must not delay them.
2. **Insets (N-0008) may run in parallel with C-R F1–F6.** They barely share files. Do not serialize AA-01 behind taxonomy.

N-0011 is **F4 only** (depends on F1–F3). C-D (N-0030) and C-F (N-0031) are **blocked** on operator decisions.

## Execute waves (after GATE 1 reply)

| Wave | Nodes | Why |
|---|---|---|
| 1 data-loss / Play | N-0014, N-0015, N-0005 | Incomplete delete, HC keep-set, onboarding dump |
| 2 correctness | N-0007, N-0016, N-0017, N-0018, N-0019, N-0032, N-0026, N-0027, N-0028, N-0029 | Loading, timer audit, notifs, mood, RLS, meds badge, cold start, U5, copy, hygiene |
| 3 routine | N-0020 → N-0021 → N-0022 → N-0011 → N-0023 → N-0024 | F1–F6; new plans only |
| 4 insets | N-0008 | Remaining 140 fudge; parallel with 3 |
| 5 human/runtime | N-0010 then N-0025 | HEAD client, then rest/Doze/FGS |
| 6 after reply | N-0030, then split N-0031 | Chosen UI; chosen features |

N-0016 **stops** if the timer fix would touch `sessionWorkAuthority` / `applySetCompletion` internals.

## Charter table

| Node | Class | Risk | Depends | Acceptance (mechanical) |
|---|---|---|---|---|
| N-0005 | feature | R2 | — | Onboarding remote timeout shows retry, not Welcome dump; vitest or RootNavigator test |
| N-0007 | feature | R2 | — | No spinner loop when `activeSessionId` set and session query empty; vitest |
| N-0008 | feature | R1 | — | Remaining 140-inset screens + meds history sheet + auth Continue + TrainingSessionView double-inset; adb both nav modes |
| N-0009 | observation | R1 | — | Surface enum in `docs/design/UI_AUDIT.md`; visual scores after A2 shots |
| N-0010 | human | R1 | — | dumpsys 1.0.5 / versionCode 15 / debuggable + Metro |
| N-0011 | feature | R2 | N-0020, N-0021, N-0022 | F4: fractional sets/muscle/week bands + session cap 10 |
| N-0014 | feature | R2 | N-0001 | `deleteAllPersonalData` includes `mood_checkins` + training sessions/items |
| N-0015 | feature | R2 | N-0001 | `HEALTH_CONNECT_DEFAULT_METRICS` includes Steps + ActiveCalories declared in plugin |
| N-0016 | discovery | R2 | N-0001 | Stale-timer SoT map; no session-authority edit or escalation note |
| N-0017 | feature | R2 | N-0006 | App-open mid-guided does not force-reconcile loop |
| N-0018 | feature | R1 | N-0001 | Mood Save ignores second press in-flight |
| N-0019 | discovery | R2 | N-0001 | Repo SQL has `sleep_sessions` policies or explicit live-DB UNKNOWN blocker |
| N-0020 | feature | R2 | N-0013 | Canonical taxonomy; vitest fails unknown tags; weeklyVolumeSummary buckets from it |
| N-0021 | feature | R2 | N-0020 | `buildProgramDaySession` only path; started/guided planned sets frozen |
| N-0022 | feature | R2 | N-0021 | experienceLevel persisted, unset=beginner; Epley per-exercise ceilings |
| N-0023 | feature | R2 | N-0011 | Week 1–4 sets/load/RIR; deload excluded from double-progression |
| N-0024 | feature | R1 | N-0011 | Harness bands hard-assert; CI runs `npm test` |
| N-0025 | human | R2 | N-0010 | adb rest/close + `deviceidle force-idle` |
| N-0026 | feature | R1 | N-0001 | Notification permission not on first render; adb TTF log |
| N-0027 | feature | R1 | N-0001 | U5 Sentry schemed event names |
| N-0028 | feature | R1 | N-0001 | Mechanistic copy: no “causes” |
| N-0029 | refactor | R1 | N-0001 | Dual-path CRLF-proof; agents.md vc15 / 357 rows |
| N-0030 | redesign | R2 | N-0009 | **Blocked** GATE1-UI-DIRECTION |
| N-0031 | feature | R2 | N-0011 | **Blocked** GATE1-FEATURES |
| N-0032 | feature | R1 | N-0001 | Curated-profile copy only on reviewed catalogue rows |

Existing complete: N-0001, N-0002, N-0003, N-0006, N-0012, N-0013. Rejected: N-0004.

## Operator questions (one line each)

1. UI direction for C-D: **Forge**, **Hearth** (recommended), or **Signal**?
2. Which features from the MARKET_AUDIT shortlist (beyond the C-* must-includes) should become C-F nodes?
