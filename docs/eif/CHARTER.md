# Stage B charter — PRG-20260917T222550

## 2026-09-20 operator run amendment (R20260920D)

The operator authorises Stage 1 Supabase follow-ups before the existing wave 2 frontier, sequential single-writer execution, specified security migrations via CLI, and one final build review. N-0030 stays parked; N-0031 stays split. Device-only checks and blockers are queued without stopping independent work. Existing screenshots and code awaiting approval are not represented as newly verified.

| Node | Class | Risk | Depends | Acceptance |
|---|---|---|---|---|
| N-0044 | feature | R2 | N-0037 | Match deployed deletion priority inventory; preserve client RLS eligibility; verification CLI consumes the complete inventory; full gates pass. |
| N-0045 | feature | R2 | N-0044 | Live CLI schema snapshot, refresh script, deletion drift/order guard and fail-closed verification including auth user absence. |
| N-0046 | feature | R2 | N-0044 | Account deletion signs out and clears state; data reset cannot remove the account; accurate copy and failure-path tests. |
| N-0047 | human | R2 | N-0045, N-0046 | Throwaway AVD account with all domains; delete and prove zero snapshot rows plus absent auth user. |
| N-0048 | feature | R2 | N-0001 | Live view definitions/callers reviewed; invoker migration applied; rollback-only two-user isolation SQL passes. |
| N-0049 | feature | R2 | N-0001 | Inspect callers; remove unintended effective function EXECUTE grants without breaking signup or required RPC. |
| N-0050 | feature | R2 | N-0049 | Pin four flagged function search paths; preserve resolved dependencies and verify live metadata. |
| N-0051 | observation | R2 | N-0047–50 | Zero security advisor ERROR; consolidated review and new charter nodes for any findings. |
| N-0052 | feature | R1 | N-0001 | Bounded reproducible Windows full harness; retain all assertions and tests; no run-owned orphan processes. |
| N-0053 | feature | R1 | — | Wrapper-only public help/diagnostics/revision-safe gate events; preserve runtime rejection and durable pending records. Gate payload documentation currently blocks closure. |
| N-0054 | feature | R2 | N-0053 | Reconcile historical invalid gates with actual evidence; resolve aggregate frontier; no runtime edits or fabricated verification. |
| N-0055 | feature | R2 | N-0045 | Stage 1 review finding: strict server missing-relation classification and optional-table policy; fail before auth removal on schema/permission errors; validate then deploy. |
| N-0056 | feature | R1 | — | Recover reproducible AVD/Metro app rendering after the prescribed cold-restart retry still produced ANR; bounded checks and real screenshot evidence before rerunning journeys. Scheduled before N-0047 retry / wave journey gates. |

All Stage 1 nodes above are chartered through the wrapper. Detailed acceptance files live in `docs/eif/acceptance/`. Execute in table order; route around blocked nodes. Review once at the end as requested by the operator.

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

---

## Stage C addendum — 2026-09-20 (ledger rev ≥ 108)

GATE 1 answered on 2026-09-19: **Hearth** (then parked, D-0003); features = retention / return / interest / science / flow. The tables below complete the charter so that `docs/eif/CHARTER.md` and the ledger list the same nodes. Ledger is authoritative for status; use `python scripts/eif_node.py status`.

### Status of the original table

Complete: N-0001, N-0002, N-0003, N-0005, N-0006, N-0012, N-0013, N-0014, N-0015, N-0036, N-0037, N-0038. Rejected: N-0004. Deferred: N-0030 (D-0003). Split: N-0031 → N-0033/34/35. **AWAITING_APPROVAL:** N-0007, N-0016 (code landed; operator visual approve pending).

### Nodes added after GATE 1

| Node | Class | Risk | Depends | Acceptance (mechanical) |
|---|---|---|---|---|
| N-0033 | feature | R2 | N-0030 unpark | C-F Home “why this session” (Hearth retention); waits on C-D |
| N-0034 | feature | R2 | N-0021 | C-F exercise technique illustrations match the movement; not a silent patch on guided authority |
| N-0035 | feature | R2 | N-0011 | C-F sleep × mood × session association chips; “associated with”, never “causes” |
| N-0036 | feature | R2 | N-0015 | HC declared = requested = used, incl. location family — `healthConnectPermissionUse.test.ts` ✅ |
| N-0037 | feature | R2 | N-0014 | Service-role `delete-account` wipes every user-keyed table incl. `training_events`, `run_*`; client fallback never attempts RLS-blocked tables ✅ code; **deploy pending** (HUMAN_CHECKS) |
| N-0038 | feature | R1 | N-0001 | Design Lab entry/route `__DEV__`-only, lazy — `designLabDevOnly.test.ts` ✅ |

### Training-modes track (R0–R4)

| Node | Class | Risk | Depends | Acceptance (mechanical) |
|---|---|---|---|---|
| N-0039 | feature | R2 | N-0036 | **R0 session-calorie source-of-truth.** Rank hypotheses (a) never requested, (b) watch → HC sync late, (c) never read for the session window, (d) read once before sync and never re-read. Fix: post-session HC re-read with provenance (`source`, `read_at`, window). Per-set only if HC granularity allows; never invent per-set precision. |
| N-0040 | feature | R2 | N-0021 | **R1 training modes Strength / Running / Hybrid.** Mode persisted; unset ⇒ Strength with zero behaviour change for existing users. Strength never shows running UI or asks for location. Running skips lifting setup. Hybrid schedules runs on non-leg days; no hard run inside a lifting session. Mode switch affects future days only. `buildFourWeekPlan` is the only producer of plan days (dual-path audit extends to running). |
| N-0041 | feature | R1 | N-0013 | **R2 `docs/training/RUNNING_DESIGN.md`** with citations: gentle time-based run/walk progression, 5k / 10k / X km goals, talk-test or HR-zone intensity, concurrent-training interference rules, deload. Every science claim in code cites this file or `ROUTINE_AUDIT.md`. |
| N-0042 | feature | R2 | N-0040, N-0041, N-0006, N-0037 | **R3 running build.** Extend the existing native FGS with the `location` type (one FGS, never two); phone GPS; audio / haptic / watch-mirrored cues via `setIntent` + reconcile only; fine-location prompt only at the first run; `FOREGROUND_SERVICE_LOCATION` declared; HC `ExerciseSession` + route write; routes in Supabase with RLS, covered by `delete-account`, privacy zone around home; UI renders first (AWAITING_APPROVAL); AVD GPX-playback vitest/harness; Play declaration, FGS demo video and Data Safety in HUMAN_CHECKS.md. |
| N-0043 | observation | R1 | N-0042 | **R4 Wear OS companion — proposal only.** Charter scope, effort, Play implications. Marked proposed; do not build. |

### Execute order after this addendum

| Wave | Nodes |
|---|---|
| 2 correctness (continue) | N-0017 → N-0018 → N-0019 → N-0032 → N-0026 → N-0027 → N-0028 → N-0029 |
| 3 routine | N-0020 → N-0021 → N-0022 → N-0011 → N-0023 → N-0024 |
| 3b training modes | N-0039 (any time after N-0036) → N-0041 (parallel) → N-0040 (after N-0021) → N-0042 → N-0043 |
| 4 insets | N-0008 (parallel with 3) |
| 5 human/runtime | N-0010 → N-0025 |
| 6 features | N-0034, N-0035; N-0033 after C-D unpark |
| parked | N-0030 (D-0003) |

Approval and human-check queues (`AWAITING_APPROVAL.md`, `HUMAN_CHECKS.md`) never block the next node.
