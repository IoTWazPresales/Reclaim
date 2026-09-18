# Phase 2 — command baseline and source facts

**Recorded:** 2026-09-18  
**Branch:** `fix/training-confident-ux`  
**Host:** `C:\Reclaim` (Expo app under `app/`)  
**Working directory for npm:** `C:\Reclaim\app`  
**Evidence class:** mixed — (a) executable observation; (b) source read.

This file is the Phase 2 commit artifact. Later discovery must treat command output as measured, not as memory.

---

## 1. Four commands (asked, run, pasted)

### `npm run typecheck` — VERIFIED

Exit code **0**. `tsc --noEmit` printed no diagnostics.

```text
> reclaim-app@0.1.0 typecheck
> tsc --noEmit
```

(npm also printed a registry notice that 11.6.2 → 11.19.1 is available. That is npm CLI telemetry, not a type error.)

### `npm test` — VERIFIED

First invocation (`npm test` → `vitest run`, default reporter, `fileParallelism: false` in `app/vitest.config.ts`) sat for **~7.5 minutes** with only:

```text
> reclaim-app@0.1.0 test
> vitest run

 RUN  v4.0.8 C:/Reclaim/app

[baseline-browser-mapping] The data in this module is over two months old.  To ensure accurate Baseline data, please update: `npm i baseline-browser-mapping@latest -D`
```

No per-file lines appeared. That process was killed. This is **not** a suite failure; the default reporter plus serial files plus PowerShell wrapping did not flush progress.

Second invocation (`npm test -- --reporter=verbose` → `vitest run --reporter=verbose`) **completed**. Real footer:

```text
 Test Files  121 passed (121)
      Tests  764 passed (764)
   Start at  23:16:19
   Duration  138.60s (transform 3.40s, setup 5.34s, collect 44.77s, tests 17.21s, environment 21ms, prepare 9.13s)
```

Exit code **0**. The verbose listing is ~1.6k lines of per-test ticks; the suite result is the footer above. No failing files.

### `npm run audit:training-dual-paths` — VERIFIED

`app/package.json` maps this to `bash ../scripts/audit-training-dual-paths.sh`.

**Windows System32 bash** (`C:\Windows\System32\bash.exe`, invoked as bare `bash ../scripts/...`) **failed immediately** because the script is CRLF:

```text
../scripts/audit-training-dual-paths.sh: line 4: set: pipefail
: invalid option name
```

Exit code **2**. That is a host/script-encoding failure, not an audit finding.

**Git bash** (`C:\Program Files\Git\bin\bash.exe` running `npm run audit:training-dual-paths` from `app/`) **passed**:

```text
> reclaim-app@0.1.0 audit:training-dual-paths
> bash ../scripts/audit-training-dual-paths.sh

=== Guided training dual-path audit ===
Root: /c/Reclaim

PASS: NEXT_SET handler has no data.nextAfterSessionItemId
PASS: NEXT_SET handler does not build nextAfter from payload
PASS: TrainingSessionView has no notifyRestStartIfNeeded
PASS: TrainingSessionView has no scheduleRestFinishNotification
PASS: TrainingScreen has no computeFirstSetInfo
PASS: TrainingSessionView does not use buildGuidedRestNotificationContextAfterCompletedSet
PASS: useNotifications replay invalidates training session queries (or no direct replay)
PASS: TrainingScreen replay invalidates training session queries (or no direct replay)
PASS: canonical module exists: app/src/lib/training/applySetCompletion.ts
PASS: canonical module exists: app/src/lib/training/trainingNotificationWorkPlan.ts
PASS: canonical module exists: app/src/lib/training/scheduleGuidedTrainingAfterSetPersist.ts
PASS: canonical module exists: app/src/lib/training/finalizeTrainingSession.ts
PASS: canonical module exists: app/src/lib/training/sessionWorkAuthority.ts
PASS: trainingSessionProgression.ts present
PASS: scheduleGuidedTrainingSessionStart present
PASS: buildGuidedRestNotificationContextAfterCompletedSet removed
PASS: finalizeTrainingSessionAndCleanup present
PASS: replayTrainingOfflineQueueAndRefreshUI present
PASS: scheduleGuidedTrainingNextSetFromDb present

=== Summary: 19 passed, 0 failed ===
Audit PASSED — no known dual-path violations.
```

### `npm run med-catalog-qa` — VERIFIED

Exit code **0**. Live stdout (truncated category list is **not** truncated below; this is the full report):

```text
> reclaim-app@0.1.0 med-catalog-qa
> vitest run src/lib/__tests__/medCatalogQa.cli.test.ts --pool=threads

 RUN  v4.0.8 C:/Reclaim/app

[baseline-browser-mapping] The data in this module is over two months old.  To ensure accurate Baseline data, please update: `npm i baseline-browser-mapping@latest -D`
stdout | src/lib/__tests__/medCatalogQa.cli.test.ts > medCatalogQa CLI output > prints QA report to stdout

MedicationKnowledge catalog QA summary
Total merged rows: 357

Rows by category (display grouping slug):
  antipsychotic: 23
  antibiotic: 17
  anticonvulsant: 16
  sleep_aid: 14
  tricyclic: 10
  nsaid: 10
  reflux_acid: 10
  diabetes_medication: 10
  benzodiazepine: 9
  stimulant: 9
  respiratory: 9
  ssri: 8
  antidepressant: 8
  opioid_analgesic: 8
  arb: 8
  beta_blocker: 7
  statin: 7
  vitamin_supplement: 7
  mood_stabilizer: 6
  cold_symptom_relief: 6
  antiemetic: 6
  ace_inhibitor: 6
  corticosteroid_systemic: 6
  snri: 5
  allergy_antihistamine: 5
  laxative: 5
  calcium_channel_blocker: 5
  glp1_agonist: 5
  immunomodulator: 5
  hormone_therapy: 5
  immunosuppressant: 5
  adhd_non_stimulant: 4
  muscle_relaxant: 4
  anticoagulant: 4
  hormonal_contraceptive: 4
  substance_use: 4
  anxiolytic: 3
  maoi: 3
  alpha_blocker: 3
  neurology_adjunct: 3
  migraine_triptan: 3
  antiviral: 3
  antiplatelet: 3
  cardiovascular: 3
  bone_health: 3
  dermatologic: 3
  hormonal_therapy: 3
  movement_adjunct: 2
  pain_analgesic: 2
  thiazide_diuretic: 2
  loop_diuretic: 2
  thyroid_hormone: 2
  antithyroid: 2
  lipid_lowering: 2
  sglt2_inhibitor: 2
  dementia_therapy: 2
  ophthalmic: 2
  antifungal: 2
  pde5_inhibitor: 2
  sleep_medication: 2
  movement_disorder: 2
  migraine: 2
  supplement: 1
  mineralocorticoid_antagonist: 1
  cardiac_glycoside: 1
  dpp4_inhibitor: 1
  urology: 1
  gout_therapy: 1
  osteoporosis_therapy: 1
  bladder_therapy: 1
  electrolyte_supplement: 1
  topical_corticosteroid: 1
  weight_management: 1
  dmard: 1
  urologic: 1
  gout: 1

Top medicationClass labels:
  Atypical antipsychotic: 13
  (none): 11
  Anticonvulsant: 10
  Tricyclic antidepressant: 9
  Typical antipsychotic: 9
  Benzodiazepine: 8
  NSAID: 8
  Beta blocker: 7
  Proton pump inhibitor: 6
  ARB: 6
  Statin: 6
  ADHD stimulant: 5
  ACE inhibitor: 5
  Non-benzodiazepine sleep medication: 4
  Anticonvulsant / mood stabilizer: 4
  Wake-promoting agent: 4
  Opioid analgesic: 4
  Second-generation antihistamine: 4
  GLP-1 receptor agonist: 4
  SSRI: 3
  SNRI: 3
  Orexin antagonist sleep medication: 3
  MAOI: 3
  Alpha-1 blocker: 3
  Dopamine agonist: 3

Confidence bands:
  < 0.6: 0
  0.6–0.8: 333
  ≥ 0.8: 24

State-impact tags:
  fatigue_context: 266
  sleep_interpretation: 116
  mood_context: 110
  heart_rate_interpretation: 45
  pain_perception: 37
  illness_context: 29
  appetite_context: 24
  training_readiness: 20
  anxiety_interpretation: 16
  recovery_interpretation: 14
  hydration_context: 12

Optional field gaps (informational):
  missing plainEnglishMechanism: 349
  missing commonUses: 346
  missing onsetWindow: 356
  missing durationWindow: 356

Governance validation issues: 0


 ✓ src/lib/__tests__/medCatalogQa.cli.test.ts (1 test) 15ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
   Start at  23:16:19
   Duration  4.55s (transform 231ms, setup 87ms, collect 236ms, tests 15ms, environment 0ms, prepare 93ms)
```

`agents.md` still describes a 215-row frozen catalogue. The live QA report is **357 merged rows**, governance issues **0**. VERIFIED by this run. That is doc/code drift, not a QA failure.

---

## 2. Context that was given and must not be re-derived

Each claim is tagged. VERIFIED means this session read the file or ran the command. ASSERTED means inherited from Phase 0 or inferred.

| Claim | Tag | Pointer |
|-------|-----|---------|
| Zustand is in `app/package.json` (`"zustand": "^4.5.2"`) and has **zero** imports under `app/src` | **VERIFIED** | `app/package.json` line 74; ripgrep `from 'zustand'` / `require('zustand')` in `app/src` returned no matches |
| `agents.md` says local floor **1.0.5 / versionCode 12** | **VERIFIED** | `AGENTS.md` “Current focus” paragraph |
| Tree floor is **1.0.5 / versionCode 15** | **VERIFIED** | `app/app.config.ts` `version: '1.0.5'`, `android.versionCode: 15` |
| AVD APK is **1.0.4 / vc8**, not debuggable; live diagnosis of HEAD is source-only | **ASSERTED** (Phase 0 measured 2026-09-17; this session did not re-adb) | `docs/eif-bootstrap/PHASE_0.md` dumpsys paste |
| Remote onboarding check races a **6s** timeout and sets `onboardStatus='no'` | **VERIFIED** | `app/src/routing/RootNavigator.tsx` `setTimeout(..., 6000)` then `setOnboardStatus('no')` on timeout/error |
| `suggestLoading` is history double-progression, then 1RM, then hardcoded defaults | **VERIFIED** | `app/src/lib/training/engine/index.ts` `suggestLoading` starting line 776: `deriveProgressionDecision` → `estimated1RM` Epley → `defaults` table |
| `edgeToEdgeEnabled` does not appear in `app/` ts/js/json | **VERIFIED** | ripgrep over `app/**/*.{ts,js,json}` (excluding lockfile noise of `react-native-is-edge-to-edge` as a transitive package name) |

### Onboarding fail-safe: is `'no'` the right default?

**AS-IS (VERIFIED):** if local SecureStore is not `'1'` and the remote `profiles.has_onboarded` read errors or times out at 6s, the user is sent to Onboarding (`onboardStatus === 'no'`). The code comments say this is intentional: do not `markOnboardingComplete` on a failed read.

**SHOULD-BE (recommendation, not implemented):** yes, for a returning user whose **local** flag is already true this path is never hit (local short-circuit). The painful case is: local flag missing (reinstall / SecureStore wipe) + slow/failed network → they re-walk onboarding. That is the correct fail-safe **if** onboarding is idempotent and cannot silently mark complete. Marking them `'yes'` on timeout would skip onboarding for a genuinely new user. Keep `'no'`. Optional product follow-up (not this pass): a distinct `'unknown'` UI (“checking account… retry”) instead of dumping them onto Welcome after 6s.

### Absurd weights

**VERIFIED** by reading `suggestLoading`: if there is no history and no `estimated1RM[exercise.id]`, the function returns the hardcoded beginner/intermediate defaults (e.g. free-weight knee_dominant 30). Absurd preview weights are that default table, not a missing model. Phase 0 already established there is no model call in `app/src`.

---

## 3. Goal-setter / dual writer — source AS-IS (tests land in later items)

### `buildFourWeekPlan` weekday count — VERIFIED by source

`app/src/lib/training/programPlanner.ts`:

- `uiWeekdays = selectedWeekdays.map(js => js === 0 ? 7 : js).sort(...)`
- `daysPerWeek = uiWeekdays.length`
- `split = determineSplit(daysPerWeek, primaryGoal, secondaryGoal, validFrequency)`
- loop `for (let i = 0; i < uiWeekdays.length; i++)` assigns `weeklyDayPlans[weekday] = split[i % split.length]`

Day count is **`uiWeekdays.length`**, not a function of goal weights. Goal only changes **which** `ProgramDayPlan` is copied onto those weekdays.

### `secondaryGoal` is passed and never read — VERIFIED by source

`determineSplit(daysPerWeek, primaryGoal, secondaryGoal, muscleFrequency)` declares `secondaryGoal: TrainingGoal` and never references it in the body. Branching uses `primaryGoal` (via `isMuscleOrStrengthFocused`) and `effectiveFrequency` only.

Executable proof is the item-2 vitest (not in this commit).

### `determineWeeklySplit` 3-day shapes — VERIFIED by source (not yet executed as a table)

`app/src/lib/training/scheduler.ts` lines 29–46, `daysPerWeek === 3`:

| Dominant goal (highest weight > 0) | Returned shape |
|------------------------------------|----------------|
| `build_strength` | `[{ template: 'full_body', days: [1, 3, 5] }]` |
| `lose_fat` or `get_fitter` | `[{ template: 'upper', days: [1, 5] }, { template: 'lower', days: [3] }]` |
| else (`build_muscle`, empty goals → injected `build_muscle` 0.5) | PPL Mon/Wed/Fri: push `[1]`, pull `[3]`, legs `[5]` |

`days` here are **Monday-based offsets** (1=Mon), not the user’s selected weekdays.

### Two split writers — AS-IS, nothing removed

**Writer A (program days — training SSOT for sessions):** `TrainingSetupScreen` save → `buildFourWeekPlan` → `createProgramInstance` → `generateProgramDays` → `createProgramDays`. `TrainingScreen` later calls `buildSessionFromProgramDay` against those rows. Preview uses the same planner.

**Writer B (routine suggestions — dashboard calendar):** `TrainingSetupScreen` `onSuccess` fire-and-forget `generateWeeklyTrainingPlan(profile)` → `determineWeeklySplit(profile.days_per_week, profile.goals)` → `upsertRoutineSuggestionRemote` on `currentWeekStart = Monday` + `dayOffset - 1`. It does **not** receive `selectedWeekdays`.

`getScheduledTemplateForToday` in `scheduler.ts` has **no callers** outside that file (ripgrep). Dashboard **does** merge remote routine suggestions and special-cases `training_*` template ids.

Which path should die is item 3. This commit does not delete either writer.

---

## 4. What this session did **not** run

| Surface | Status |
|---------|--------|
| Re-adb / live APK of HEAD | Not run. Phase 0 still stands. |
| `expo run:android` / debug client | Not run. |
| Item 2–6 product edits | Not in this commit. |

---

## 5. Next in this pass

Item 2: commit the goal-setter vitests that lock the weekday invariant and the 3-day scheduler shape table.  
Item 3: SoT proposal (which writer dies) — still no deletion until accepted.
