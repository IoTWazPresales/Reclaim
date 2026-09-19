# GATE 1 report — PRG-20260917T222550

**Stopped.** Stage C does not start until the operator answers the two questions at the bottom.

**Branch:** `fix/training-confident-ux`  
**Ledger:** rev 57  
**A0:** `cf12b4d`  
**GATE 1:** `aabab35`

## Harness numbers (VERIFIED, vitest)

A1: typecheck 0; 123 files / **772** tests; dual-path **27/27** (Git bash); med-catalog **357** rows / 0 issues.

A3 routine harness (`routineVolumeMeasurement.test.ts`, 100 scenarios):

| Measure | Result |
|---|---|
| Weeks 1–4 fingerprint identical | **100/100** |
| History seed ids | **18** |
| Share of weekly sets in seed | **35.7%** |
| UI weekly-sets omits Core token | **23/100** (mapping bug; not always-drop) |
| Isolation in compound slot | **50/100** |
| Duration > 60 min | **28/100** |
| `scoreExercise` ranking identical across goals | **true** |
| Unbucketed catalogue tags | 16 including `core`, `quads`, `rear_deltoids` |

Clone claims 1–9 **CONFIRMED** (Core nuance above). Call sites do **not** pass identical inputs. History arrival does **not** mutate started/guided DB items; it can change pre-start UI.

## Top findings per surface

| Surface | Top finding |
|---|---|
| Privacy | `deleteAllPersonalData` omits mood + training (S0) |
| Health Connect | Manifest Steps/ActiveCal not in Connect request set (S0 Play) |
| Onboarding/auth | 6s remote timeout → Welcome for returning users (S1) |
| Training | Spinner when `activeSessionId` and query empty (S1) |
| Guided | Wall-clock stale timer + non-dismissable dialog (S1) |
| Notifications | Foreground force-reconcile mid-guided (S1); `scheduleNotificationAsync` second writer **REFUTED** |
| Mood | Save has no in-flight lock (S2) |
| Meds | Badge = any exact-name hit; no reviewed gate (S2) |
| Routine | No weekly volume model; weeks identical; 18-id history (NO-MODEL) |
| Sleep/RLS | Repo SQL: no `sleep_sessions` policies; live DB UNKNOWN |
| Performance | Splash still serializes Phase C; live 14–18s **UNABLE_TO_VERIFY** |
| 1kg/5kg steps | **REFUTED as bug** (equipment-aware) |
| Doze / OEM FGS | **UNABLE_TO_VERIFY** (needs HEAD client / OEM) |

## UI audit summary

Source inventory in `docs/design/UI_AUDIT.md`. PHASE_3 live insets on tab AppScreen; remaining drawer/stack screens still use 140 fudge. Visual MD3 scores, TalkBack on device, both nav modes: **UNABLE_TO_VERIFY** until A2 HEAD client. Screenshot target: `docs/design/screenshots/`.

## Three UI directions

Source: `__DEV__` Design Lab (`app/src/screens/dev/DesignLabScreen.tsx`). Adb captures: **UNABLE_TO_VERIFY** (`docs/design/directions/<forge|hearth|signal>/` empty until dumpsys 1.0.5/vc15).

| Direction | Serves | Shape | Risk |
|---|---|---|---|
| Forge | Next-set people | Sharp 4dp, ember, 32/800, 120ms | Looks like Fitbod/Hevy |
| **Hearth (rec)** | People rebuilding a life | 20dp, warm paper, 28/600, 280ms | Soft if training is the only job |
| Signal | n-of-1 trackers | Hairline, cyan, tabular 13, 0ms | Looks like Bearable/Welltory |

**Recommendation: Hearth** — only direction that puts guided training + mechanistic why + cross-domain readiness on Home without pretending we are a gym logger or a symptom spreadsheet.

## Ranked feature shortlist (after correctness)

1. Weekly volume + 4-week progression (C-R, already chartered)
2. Onboarding retry (N-0005)
3. Account delete completeness (N-0014)
4. HC request-set = manifest (N-0015)
5. Med curation-tier badge (N-0032)
6. Mood submit lock (N-0018)
7. “Why this session” on Home (Hearth IA — needs direction pick)
8. Guided rest/close polish (N-0025)
9. Sleep × mood × session correlation chips
10. iOS parity (not this cycle)

Do **not** add drug interactions / OCR.

## Market blockers

- Incomplete account deletion
- HC Connect request-set ≠ Play keep-and-justify declarations
- Onboarding timeout dumps returning users
- No science-grade weekly volume model
- Ghost RHR/HRV/TotalCalories must stay out of the binary
- Crash-free rate UNKNOWN; U5 incomplete; no i18n; no `app/ios/`

## A2 (VERIFIED after signature uninstall)

First install failed `INSTALL_FAILED_UPDATE_INCOMPATIBLE` against Play-signed 1.0.4/vc8. `adb uninstall` then second `expo run:android` succeeded.

| Field | dumpsys |
|---|---|
| versionName | **1.0.5** |
| versionCode | **15** |
| pkgFlags | **DEBUGGABLE** |
| Metro | `adb reverse` 8081; MainActivity `expo-development-client` |

Evidence: `docs/eif/baseline/A2.md`, `docs/eif/baseline/A2_DUMPSYS.txt`. Auth shots: `docs/design/screenshots/a2-auth-*-resting.png`. Remaining product screens + Design Lab: **UNABLE_TO_VERIFY** (no session). N-0010 left **proposed** (human accept).

## Charter

See `docs/eif/CHARTER.md`. Order disagreement: Play HC + account delete in wave 1 with SoT; insets may parallel routine.

## Operator questions (reply with these two only)

1. UI direction for C-D: **Forge**, **Hearth** (recommended), or **Signal**?
2. Which extra features (beyond the C-* must-includes already chartered) should become C-F nodes?
