# Reclaim training routine / generator audit (AS-IS)

**Mode:** READ-ONLY source audit + A3 harness  
**Repo:** `C:\Reclaim` (`app/` product root)  
**Branch:** `fix/training-confident-ux` @ `cf12b4d`  
**Date:** 2026-09-19  
**Harness:** `app/src/lib/training/__tests__/routineVolumeMeasurement.test.ts` → `docs/training/ROUTINE_VOLUME_BASELINE.md`

## Harness numbers (VERIFIED, vitest this session)

| Measure | Result |
|---|---|
| Scenarios (goals × 2–6 days × full gym/home DB × once/twice) | 100 |
| Weeks 1–4 fingerprint identical (empty history) | **100/100** |
| History seed ids | **18** |
| Share of weekly sets whose ids are in the seed | **35.7%** |
| UI weekly-sets line omits `Core` token | **23/100** |
| Isolation/accessory tier in a required compound slot | **50/100** |
| Estimated duration > 60 min budget | **28/100** |
| `chooseExercise(horizontal_press)` muscle vs strength ranking identical | **true** (`scoreExercise` ignores goals) |
| Empty-history bench @ 8 reps | beginner &lt; intermediate &lt; advanced; 1RM 100 kg follows Epley |
| Unbucketed catalogue muscle tags | 16 including `core`, `quads`, `rear_deltoids`, `serratus_anterior` |

Nuance vs clone claim 8: Core is not *always* dropped — 77/100 lines include a Core token when `abs`/`obliques`/`transverse_abdominis` are primary. The mapping still drops the catalogue’s dominant `core` tag. **CONFIRM** the mapping bug; **do not** claim every week-line omits Core.

**Scope:** Engine, planner, selection/loading/progression, preview, Wearables projection, TrainingScreen / Setup call sites, catalogue + rules, performance seed, adapt/swap.  
**Not done:** Product source edits (except the measurement harness), runtime device smoke of generated sessions.

Evidence strength legend:

- **VERIFIED** — file opened / catalog analyzed in this audit
- **ASSERTED** — inferred from call graph / absence after search (coverage stated)

---

## Executive summary

The generator is a **template + intent-slot picker** with blended goal prescription (reps/sets/rest), intent/equipment-keyed default loads, and optional double-progression when last-set history exists for that exercise id. It is **not** a periodized 4-week loading model, **not** a weekly muscle-set volume allocator, and **not** a push:pull / quad:ham balancer. Setup never persists `experienceLevel`. History for progression is batched for **18 seed compound ids** only. `adaptSession` exists but is unused in product UI. Weeks 1–4 copy the same day structure; `buildSessionFromProgramDay` does not take week index.

---

## AS-IS architecture (observed)

```
TrainingSetupScreen
  → upsertTrainingProfile + buildFourWeekPlan + generateProgramDays
  → profile_snapshot (goals, equipment, injuries, baselines; no experienceLevel)

TrainingScreen / preview / WearablesProjectionService
  → buildSessionFromProgramDay(programDay, snapshot, options?)
       → buildSession(template, goals, constraints, userState, …)
            → chooseExercise / scoreExercise (+ primary-slot gate)
            → suggestLoading / deriveProgressionDecision
            → enrichRankedAlternatives (swap list)

startSessionMutation
  → createTrainingSession + createTrainingSessionItems (insert planned once)
```

**SHOULD-BE (critique, not authority):** A coherent routine layer would (1) persist experience and preferences into the snapshot used at generation, (2) periodize structure or loads across weeks, (3) allocate weekly sets per muscle with explicit balance constraints, (4) fetch performance for planned exercise ids (not a fixed 18), (5) keep all plan-build call sites on one input contract, (6) wire or delete `adaptSession`, (7) re-prescribe on swap.

---

## Clone claims — CONFIRM / REFUTE

### 1. Weeks 1–4 identical (planner copies week structure; weekIndex unused in `buildSessionFromProgramDay`)

**CONFIRM.**

- Planner builds one `weeklyDayPlans` map and shallow-copies it into weeks 1–4: `programPlanner.ts:71–87`.
- `generateProgramDays` varies **date / `week_index`** only; label/intents/template come from the same day plan: `programPlanner.ts:406–446`.
- `buildSessionFromProgramDay` signature has no week parameter; week does not affect selection or load: `engine/index.ts:1380–1427`.

### 2. History fetched only for 18 seed ids

**CONFIRM.**

- Fixed list length 18 in `trainingProgramPerformanceSeedIds.ts:2–21`.
- `loadTrainingPerformanceSeed` / `loadLastSessionPerformanceSeed` pass only that list: `trainingProgramPerformanceSeed.ts:24–52`.

### 3. `experienceLevel` never persisted (setup UI / profile / snapshot)

**CONFIRM.**

- Setup steps are goals → schedule → equipment → constraints → baselines → complete; no experience control: `TrainingSetupScreen.tsx:45`, `:156+`.
- `upsertTrainingProfile` / `TrainingProfileRow` have no experience field: `api.ts:2762–2782`, setup save `:383–397`.
- Program `profile_snapshot` omits `experienceLevel`: `TrainingSetupScreen.tsx:434–443`.
- Engine defaults missing snapshot field to `'intermediate'`: `engine/index.ts:1410`.

### 4. Defaults keyed by slot/intent, not exercise

**CONFIRM** (with small BY_ID exceptions).

- Cold-start defaults in `suggestLoading` are `ExperienceLevel × loadingIntentKey × equipment class`: `engine/index.ts:801–884`.
- `loadingIntentKey` inferred from intents (or thruster/carry overrides): `exerciseLoadingProfile.ts:226–247`, `:86–196`.
- Exercise-specific progression uses history / optional `estimated1RM[exercise.id]` when present: `engine/index.ts:776–794`.

### 5. Isolations mis-tagged into compound slots

**CONFIRM** (catalogue + partial mitigations).

- Examples (catalog): `dumbbell_flyes` / `cable_chest_flyes` → `horizontal_press`; `front_raises` → `vertical_press`; `rear_delt_flyes` → `horizontal_pull`; `leg_extensions` / `calf_raises` → `knee_dominant`; `nordic_curls` → `hip_hinge`; `shrugs` → `vertical_pull` (catalog sample + scripted scan of `exercises.v1.json`).
- Mitigations exist for some ids via primary-slot tiers / fit scores (`exerciseSessionRole.ts:38–54`, `exerciseSelectionRank.ts:11–57`) but tagging remains wrong at source; gate can still relax to accessory tiers: `engine/index.ts:972–1009`.

### 6. No weekly volume model (only optional isolation bump from session counts)

**CONFIRM.**

- `rules.v1.json` `volumeCaps` are **not referenced** by the engine (search of `engine/index.ts`).
- Only volume-ish mechanism: `lowFrequencyIsolationBump` when primary muscle appears in ≤1 planned session/week: `rules.v1.json:158–162`, `engine/index.ts:603–615`, `:1031–1035`.
- `weeklyVolumeSummary.ts` is **display + bump input**, not an allocator: `:31–72`.

### 7. Shoulder isolation allowed on pull days

**CONFIRM.**

- Pull template `optionalIntents` includes `shoulder_isolation`: `rules.v1.json:91–94`.
- Only one catalog exercise carries that intent (`lateral_raises`); other shoulder isolations are mistagged as press/pull (claim 5).

### 8. UI weekly-sets line drops core

**CONFIRM** (effective drop via mapping mismatch).

- Formatter includes bucket `Core` in `BUCKET_ORDER`: `weeklyVolumeSummary.ts:28`, `:68–71`.
- Maps only `abs` / `obliques` / `transverse_abdominis` → Core: `:23–26`.
- Catalogue core work overwhelmingly uses primary muscle `core` (and sometimes `rectus_abdominis`), which fall through to raw keys **not** in `BUCKET_ORDER`, so they never appear in the joined line: catalog usage counts from `exercises.v1.json` (`core`: 33).

### 9. `scoreExercise` ignores goals (`goalWeights` unused in body)

**CONFIRM.**

- Parameter accepted: `engine/index.ts:295–302`.
- Body never reads `goalWeights` (intent/equipment/injury/difficulty/preferences/compound/selectionHints only): `:307–430`.
- Goals **do** affect reps/sets/rest via `getRepRange` / `getSetsPerExercise` / `getRestSeconds` after selection: `:572–741`, `:1029–1037`.

---

## Plan-build call-site input parity

| Call site | Snapshot source | `weeklyMuscleSessionCounts` | `adaptiveTrainingEnabled` | Perf seed merge | Notes |
|-----------|-----------------|------------------------------|---------------------------|-----------------|-------|
| `TrainingScreen` week pass (`weekSessionVolume`) | `profile_snapshot` + seed | **No** (computes counts) | Yes | Yes | `TrainingScreen.tsx:439–462` |
| `TrainingScreen` `buildPlanForProgramDay` / start preview | same | **Yes** | Yes | Yes | `:465–478` |
| `TrainingScreen` `nextSession` | same | Yes | Yes | Yes | `:937–944`; deps omit `adaptiveTrainingEnabled` (`:954`) |
| `preview/dryRunTrainingGeneration` | mock snapshot | **No** | **No** | **No** | `preview/index.ts:132–147`; no `experienceLevel` |
| `WearablesProjectionService.projectTrainingNextAction` | raw `profile_snapshot` | **No** | **No** | **No** | `WearablesProjectionService.ts:60–67` |

**Verdict:** Call sites do **not** pass identical inputs. TrainingScreen two-pass (volume without bump → bump on start/next) is intentional but means week-line plans can differ slightly from started-session plans. Preview and Wearables omit weekly bump + adaptive bias + (Wearables) seed merge → duration/load can disagree with in-app next session.

Also: setup writes `muscle_frequency` / `includeSkillWork` into **profile.constraints.preferences**, but **omits preferences from `profile_snapshot`** (`TrainingSetupScreen.tsx:388–394` vs `:434–443`). Frequency still affects planner at create time via the `as any` profile passed to `buildFourWeekPlan` (`:409–420`); skill-work preference is lost for later session builds.

Hard-coded `timeBudgetMinutes: 60` in `buildSessionFromProgramDay` (`engine/index.ts:1399`) — not user schedule duration.

---

## History arrival vs started / guided sessions

**Trace:**

1. `lastPerfSeedQ` loads seed maps asynchronously (`TrainingScreen.tsx:227–231`).
2. Seed merge happens only in memory via `withProfileLastPerformance` (`:125–134`) into **new** `buildSessionFromProgramDay` calls (week volume, nextSession, day-press preview).
3. Persist path: `startSessionMutation` maps `plan.exercises` → `createTrainingSessionItems` **insert once** (`:555–567`, `api.ts:2224–2268`). No product caller rebuilds/deletes session items from a later generator pass (search: only TrainingScreen calls `createTrainingSessionItems`).
4. In-session swap updates the existing item’s `exercise_id` / planned blob; **copies prior set targets/weights** onto the new exercise (`TrainingSessionView.tsx:989–1052`) — does not re-run `suggestLoading`.
5. `pendingPlan` is set on day press and is **not** rebound when seed arrives (no effect syncing pending plan to `lastPerfSeedQ`).

**Verdict:**

- **REFUTE** that history arrival mutates an already **started** or **guided** session’s persisted items.
- **CONFIRM** that late seed arrival can change **pre-start** UI (next-session card, weekly sets line, a freshly opened preview) because those memos depend on `lastPerfSeedQ.data`.
- Guided transport / notifications operate on persisted items, not on live regenerations.

---

## Structured findings

### RA-001 — Four-week block is structural clone, not progression mesocycle

| Field | Value |
|-------|--------|
| **Class** | NO-MODEL |
| **Topic** | progression across four weeks |
| **FACT** | Same weekday always gets identical label/intents/template for weeks 1–4; session build ignores week index. `programPlanner.ts:71–87`, `engine/index.ts:1380–1427`. |
| **Evidence** | VERIFIED |
| **User impact** | Week 4 feels like week 1 aside from whatever double-progression history provides per exercise. No planned deload week / volume wave. |
| **Suggested later fix** | Pass `week_index` into build; apply week multipliers or template variants (e.g. intensity/volume/deload). |

### RA-002 — Performance history limited to 18 compounds

| Field | Value |
|-------|--------|
| **Class** | WRONG-MODEL |
| **Topic** | 1RM-based loading; progression across four weeks |
| **FACT** | Seed ids fixed at 18 compounds (`trainingProgramPerformanceSeedIds.ts:2–21`); fetch only those (`trainingProgramPerformanceSeed.ts:45–48`). Accessories/isolations cold-start from intent defaults. |
| **Evidence** | VERIFIED |
| **User impact** | Progression “sticks” mainly on seed lifts; swapped or accessory work resets to generic defaults. |
| **Suggested later fix** | Fetch last/recent performance for exercise ids present in the upcoming week’s plans (or all logged exercises). |

### RA-003 — Experience level not in setup / profile / snapshot

| Field | Value |
|-------|--------|
| **Class** | NO-MODEL |
| **Topic** | beginner safety |
| **FACT** | No setup UI or DB profile field; engine defaults to intermediate (`TrainingSetupScreen.tsx:45`, `api.ts:2762–2782`, `engine/index.ts:1410`). Rules define beginner maxExercises/preferMachines (`rules.v1.json:163–168`) but `preferMachines` / `complexityPenalty` unused by engine. |
| **Evidence** | VERIFIED |
| **User impact** | Beginners get intermediate exercise count and scoring; machine preference rule dead. |
| **Suggested later fix** | Add experience to setup → profile + snapshot; honor `experienceLevels.*` (or delete dead rule keys). |

### RA-004 — Cold-start loads by intent × equipment, not exercise

| Field | Value |
|-------|--------|
| **Class** | WRONG-MODEL |
| **Topic** | 1RM-based loading |
| **FACT** | Default table keyed by intent (`engine/index.ts:801–884`); 1RM path only if `estimated1RM[exercise.id]` (`:788–794`). Baselines from setup map to a few exercise ids then Epley. |
| **Evidence** | VERIFIED |
| **User impact** | Different exercises sharing an intent share one default kg; thruster special-cased (`:850–862`). |
| **Suggested later fix** | Per-exercise priors or broader baseline capture; keep intent defaults as fallback only. |

### RA-005 — Isolation / accessory intents polluted with compound tags

| Field | Value |
|-------|--------|
| **Class** | DATA |
| **Topic** | pattern coverage (squat, hinge, h/v push, h/v pull, carry, core); near-duplicates |
| **FACT** | Flyes/raises/extensions/curls/calves/shrugs tagged as compound intents in `exercises.v1.json` (see clone claim 5). Primary-slot overrides cover a subset (`exerciseSessionRole.ts:38–54`). |
| **Evidence** | VERIFIED |
| **User impact** | Isolations can occupy “main” slots when gates relax; pattern coverage looks fuller than coaching quality. |
| **Suggested later fix** | Retag catalogue intents; keep compound intents for true multi-joint lifts only. |

### RA-006 — No weekly set-volume allocator; caps unused

| Field | Value |
|-------|--------|
| **Class** | NO-MODEL |
| **Topic** | volume per muscle |
| **FACT** | Only optional +1 isolation set via session-count bump (`engine/index.ts:603–654`, `rules.v1.json:158–162`). `volumeCaps` in rules unused. |
| **Evidence** | VERIFIED |
| **User impact** | Cannot target e.g. 10–20 sets/muscle/week; volume emerges from template × maxExercises × goal sets. |
| **Suggested later fix** | Implement weekly set budget per muscle; enforce caps; drive optional slots from deficit. |

### RA-007 — Pull days may schedule shoulder isolation

| Field | Value |
|-------|--------|
| **Class** | WRONG-MODEL |
| **Topic** | pattern coverage; push:pull and quad:ham balance |
| **FACT** | `pull.optionalIntents` includes `shoulder_isolation` (`rules.v1.json:91–94`). |
| **Evidence** | VERIFIED |
| **User impact** | Lateral raises can appear on pull day; further shoulder work via mistagged press/pull isolations. |
| **Suggested later fix** | Remove shoulder isolation from pull optionals; place on push/upper only. |

### RA-008 — Weekly sets UI drops Core bucket

| Field | Value |
|-------|--------|
| **Class** | BUG |
| **Topic** | volume per muscle |
| **FACT** | `formatWeeklyMuscleSetLine` only emits `BUCKET_ORDER` keys; catalogue `core` / `rectus_abdominis` not mapped to Core (`weeklyVolumeSummary.ts:4–26`, `:68–71`). |
| **Evidence** | VERIFIED |
| **User impact** | Users never see Core in the weekly sets summary despite core exercises in plans. |
| **Suggested later fix** | Map `core` + `rectus_abdominis` → Core; optionally include unmapped leftovers. |

### RA-009 — Exercise scoring ignores goal weights

| Field | Value |
|-------|--------|
| **Class** | WRONG-MODEL |
| **Topic** | blended goals |
| **FACT** | `scoreExercise(..., goalWeights, ...)` never uses `goalWeights` (`engine/index.ts:295–430`). `determinePriority` also takes unused `goalWeights` (`:228–254`). |
| **Evidence** | VERIFIED |
| **User impact** | Goal blend changes prescription math, not which exercises win a slot (except via separate priorityIntents). |
| **Suggested later fix** | Bias selection by goal (e.g. strength → barbell compounds; conditioning → carry/conditioning intents). |

### RA-010 — Goals blend reps/sets/rest but not RIR targets

| Field | Value |
|-------|--------|
| **Class** | NO-MODEL |
| **Topic** | rep and RIR targets |
| **FACT** | Planned sets store `targetReps`, `suggestedWeight`, `restSeconds` only (`engine/index.ts:1052–1057`). Progression uses RPE caps (`progression.ts:219–227`, `:262–340`). No RIR field in plan. |
| **Evidence** | VERIFIED |
| **User impact** | No prescribed proximity-to-failure; RPE optional at log time. |
| **Suggested later fix** | Add target RIR/RPE by priority × goal into `PlannedSet`. |

### RA-011 — Rest is priority × goal only

| Field | Value |
|-------|--------|
| **Class** | WRONG-MODEL |
| **Topic** | rest |
| **FACT** | `getRestSeconds` blends `rules.goals[*].restSeconds[priority]` (`engine/index.ts:716–740`, `rules.v1.json:15–78`). No exercise- or load-specific rest. |
| **Evidence** | VERIFIED |
| **User impact** | Heavy hinge and light curl can share rest if same priority bucket. |
| **Suggested later fix** | Rest by loading profile / absolute load / intent family. |

### RA-012 — Warm-ups not part of session plan

| Field | Value |
|-------|--------|
| **Class** | NO-MODEL |
| **Topic** | warm-ups |
| **FACT** | Engine adds fixed 5 min warmup to duration estimate (`rules.v1.json:149–151`, `engine/index.ts:1243–1250`). UI can show optional % warm-up weights on ExerciseCard; not persisted as planned sets. |
| **Evidence** | VERIFIED |
| **User impact** | No programmed warm-up sets in plan/DB; guided flow may skip them. |
| **Suggested later fix** | Generate warm-up sets for primary compounds into planned payload. |

### RA-013 — Coach order exists; no fatigue-aware reorder mid-block

| Field | Value |
|-------|--------|
| **Class** | WRONG-MODEL |
| **Topic** | exercise order |
| **FACT** | `sortPlannedExercisesCoachOrder` by phase + movement family + tier (`exerciseSessionRole.ts:90–170`). Template arg unused (`_template`). |
| **Evidence** | VERIFIED |
| **User impact** | Order is deterministic family order, not individualized. |
| **Suggested later fix** | Optional template-specific order; respect user overrides. |

### RA-014 — Near-duplicates managed only by score / alreadySelected / tags

| Field | Value |
|-------|--------|
| **Class** | NO-MODEL |
| **Topic** | near-duplicates |
| **FACT** | Duplicate id penalty `-50` (`engine/index.ts:389–393`); swap pool expands by shared tags/muscles (`:479–491`). No synonym / pattern-family uniqueness beyond that. |
| **Evidence** | VERIFIED |
| **User impact** | Similar patterns (e.g. multiple vertical pulls) can co-occur across required+optional. |
| **Suggested later fix** | Pattern-family mutex per session; stronger substitution grouping. |

### RA-015 — No push:pull or quad:ham ratio model

| Field | Value |
|-------|--------|
| **Class** | NO-MODEL |
| **Topic** | push:pull and quad:ham balance |
| **FACT** | Intra-session only: skip optional candidates whose primary muscle already appears ≥2× (`engine/index.ts:1152–1160`). Splits imply rough balance but no measured ratio. |
| **Evidence** | VERIFIED |
| **User impact** | Asymmetric volume possible under equipment/injury constraints. |
| **Suggested later fix** | Weekly push vs pull and knee vs hinge set ratio checks with corrective optional picks. |

### RA-016 — Unilateral / dumbbell semantics partial

| Field | Value |
|-------|--------|
| **Class** | WRONG-MODEL |
| **Topic** | unilateral and dumbbell semantics |
| **FACT** | Unilateral deprioritized on required leg slots, favored on optional (`exerciseSelectionRank.ts:112–126`). Dumbbell display `per_dumbbell` (`exerciseLoadingProfile.ts:208–210`) but default kg table does not halve for DB. |
| **Evidence** | VERIFIED |
| **User impact** | Suggested kg may read as total or per-hand inconsistently vs UI suffix. |
| **Suggested later fix** | Generate load in display-mode units end-to-end. |

### RA-017 — Carry / conditioning units ad hoc

| Field | Value |
|-------|--------|
| **Class** | WRONG-MODEL |
| **Topic** | carry and conditioning units |
| **FACT** | Carry → meters from mid-rep-range formula (`engine/index.ts:681–711`); plank → seconds; conditioning template requires only `conditioning` (`rules.v1.json:116–119`). Many exercises tagged `conditioning` in catalogue (26). |
| **Evidence** | VERIFIED |
| **User impact** | “Reps” UI semantics overloaded; conditioning days thin if equipment filters wipe candidates. |
| **Suggested later fix** | First-class prescription units in planned sets; richer conditioning templates. |

### RA-018 — Injury filters are hard excludes on contraindications / forbidden intents

| Field | Value |
|-------|--------|
| **Class** | WRONG-MODEL |
| **Topic** | injury filters |
| **FACT** | Score zero if any contraindication ∩ injuries or forbidden intent (`engine/index.ts:347–361`). Setup maps UI constraints → engine injuries / `no_overhead` → `vertical_press` forbidden. No graded substitutions. |
| **Evidence** | VERIFIED |
| **User impact** | Safe but brittle — whole intents disappear rather than safer variants. |
| **Suggested later fix** | Soft penalties + preferred substitution tags per injury. |

### RA-019 — `adaptSession` dead in product

| Field | Value |
|-------|--------|
| **Class** | NO-MODEL |
| **Topic** | adaptSession |
| **FACT** | Implements time_pressure / fatigue set cuts (`engine/index.ts:1274–1367`). Callers: tests + `devHarness` only (search). Mutates exercise arrays in place. |
| **Evidence** | VERIFIED |
| **User impact** | No in-workout autoregulation from the engine path. |
| **Suggested later fix** | Wire to session UI with immutable copies, or remove to reduce dead surface. |

### RA-020 — Swap list ranked; swap apply does not re-prescribe

| Field | Value |
|-------|--------|
| **Class** | BUG |
| **Topic** | swap behaviour |
| **FACT** | `enrichRankedAlternatives` re-scores up to 12 alts (`engine/index.ts:454–528`); UI uses ids (`ReplaceExerciseDialog.tsx:29–38`). Apply copies old `targetReps` / `suggestedWeight` (`TrainingSessionView.tsx:989–1004`). Program scope still only updates session item (`:1076–1081`). |
| **Evidence** | VERIFIED |
| **User impact** | Swap to a different implement keeps prior load/reps; “Update program” does not change future program days’ exercise picks (days store intents only). |
| **Suggested later fix** | On swap, re-run `suggestLoading` + rep range for new exercise; persist hate/prefer overrides for program scope. |

### RA-021 — Catalogue coverage uneven

| Field | Value |
|-------|--------|
| **Class** | DATA |
| **Topic** | catalogue coverage |
| **FACT** | 137 exercises. Intent counts (approx): trunk_stability 27, conditioning 26, knee_dominant 21, vertical_press 18, … **shoulder_isolation 1**. MusclesPrimary includes inconsistent tokens (`core` vs `abs`, `traps` vs `upper_traps`, `shoulders`, `legs`, `full_body`). |
| **Evidence** | VERIFIED |
| **User impact** | Sparse true shoulder-isolation slot; volume bucketing / analytics noisy. |
| **Suggested later fix** | Normalize muscle ontology; expand shoulder_isolation / dedicated calf intents. |

### RA-022 — Frequency preference only shapes split choice at program create

| Field | Value |
|-------|--------|
| **Class** | WRONG-MODEL |
| **Topic** | frequency |
| **FACT** | `muscle_frequency_preference` drives `determineSplit` (`programPlanner.ts:50–69`, `:105–122`). Not re-evaluated per week; snapshot omits preference for later builds. |
| **Evidence** | VERIFIED |
| **User impact** | Changing frequency requires new program; infeasible once/twice falls back to auto with console warn. |
| **Suggested later fix** | Persist preference on snapshot; allow mid-block resplit with clear UX. |

### RA-023 — Duration estimate vs real time budget

| Field | Value |
|-------|--------|
| **Class** | WRONG-MODEL |
| **Topic** | duration vs time budget |
| **FACT** | Duration = 5 + Σ(8/5/3 per priority) + 5 (`engine/index.ts:1243–1250`). `timeBudgetMinutes` hard-coded 60 (`:1399`). Used by `adaptSession` time_pressure only (unused in app). |
| **Evidence** | VERIFIED |
| **User impact** | Estimated minutes can disagree with user availability; no trim at build time. |
| **Suggested later fix** | Build against user time budget (drop optionals first); persist budget on snapshot. |

### RA-024 — Plan-build input parity gaps

| Field | Value |
|-------|--------|
| **Class** | BUG |
| **Topic** | plan-build call-site input parity |
| **FACT** | See parity table above. Preview/Wearables omit weekly counts + adaptive; Wearables omits seed; `nextSession` deps miss `adaptiveTrainingEnabled` (`TrainingScreen.tsx:954`). |
| **Evidence** | VERIFIED |
| **User impact** | Preview / watch card / started session can disagree on load, bump sets, duration. |
| **Suggested later fix** | Single `buildPlanFromProgramDayContext()` helper mandatory for all call sites. |

### RA-025 — History arrival does not mutate started/guided items

| Field | Value |
|-------|--------|
| **Class** | NO-MODEL (clarifying finding) |
| **Topic** | history arrival mutating started/guided sessions |
| **FACT** | Items inserted once at start (`TrainingScreen.tsx:555–567`, `api.ts:2255–2265`). Seed only feeds subsequent builds. No rebuild-of-items path found. |
| **Evidence** | VERIFIED |
| **User impact** | Safe for in-progress guided sessions; pre-start cards can still “jump” when seed resolves. |
| **Suggested later fix** | Freeze next-session preview until seed settled, or show loading state; never rewrite in-progress items from generator. |

### RA-026 — Pattern coverage depends on split, not an explicit checklist

| Field | Value |
|-------|--------|
| **Class** | WRONG-MODEL |
| **Topic** | pattern coverage (squat, hinge, h/v push, h/v pull, carry, core) |
| **FACT** | Coverage is whatever `determineSplit` puts in `intents` + template optionals (`programPlanner.ts:125–349`, `rules.v1.json:85–120`). e.g. default 3-day PPL has no carry/core required; 2-day FB includes carry on B only. |
| **Evidence** | VERIFIED |
| **User impact** | Users can miss hinge/carry/core for a whole week depending on frequency/goals. |
| **Suggested later fix** | Weekly coverage audit that injects missing patterns into optional slots. |

### RA-027 — Beginner safety incomplete beyond difficulty scoring

| Field | Value |
|-------|--------|
| **Class** | NO-MODEL |
| **Topic** | beginner safety |
| **FACT** | Difficulty match ±1 scoring (`engine/index.ts:363–377`); skill tier excluded unless `includeSkillWork` (`:325–331`) but preference often missing from snapshot (RA-003/parity). No absolute ban on advanced compounds for beginners. |
| **Evidence** | VERIFIED |
| **User impact** | Beginners can still land barbell compounds if equipment allows and score wins. |
| **Suggested later fix** | Hard beginner allow-list / machine bias when experience=beginner. |

### RA-028 — Blended goals work for prescription math only

| Field | Value |
|-------|--------|
| **Class** | WRONG-MODEL |
| **Topic** | blended goals |
| **FACT** | Weighted blend of rep/set/rest tables (`engine/index.ts:538–570`). Planner uses primary/secondary goal for split flavor (`programPlanner.ts:45–69`). Selection ignores blend (RA-009). |
| **Evidence** | VERIFIED |
| **User impact** | Multi-goal users get averaged reps, not goal-aware exercise mix. |
| **Suggested later fix** | Couple selection scoring to normalized goal vector. |

---

## Catalogue snapshot (AS-IS)

- **Count:** 137 exercises in `exercises.v1.json`.
- **Intents present:** carry, conditioning, elbow_extension, elbow_flexion, hip_hinge, horizontal_press, horizontal_pull, knee_dominant, shoulder_isolation, trunk_stability, vertical_press, vertical_pull.
- **musclesPrimary (unique):** adductors, anterior_deltoids, biceps, brachialis, calves, cardiovascular, core, erector_spinae, forearms, full_body, glutes, hamstrings, hip_abductors, hip_adductors, hip_flexors, lateral_deltoids, lats, legs, lower_pectorals, middle_traps, obliques, pectorals, quadriceps, rear_deltoids, rectus_abdominis, rhomboids, shoulders, transverse_abdominis, traps, triceps, upper_pectorals.
- **musclesSecondary (unique):** includes additional tokens (`quads`, `upper_back`, `serratus_anterior`, …) — ontology drift vs primary.
- **Sample row:** `barbell_bench_press` — intents `[horizontal_press]`, equipmentAll `[barbell, bench]`, primary `[pectorals, anterior_deltoids, triceps]` (`exercises.v1.json:2–16`).

## Rules snapshot (AS-IS)

- Goal tables for muscle / strength / fat / fitter: reps, sets, rest (`rules.v1.json:3–84`).
- Session templates required/optional intents (`:85–120`).
- Dead / unused by engine: `volumeCaps`, `exercisePriority`, `progressionRules` JSON block, `experienceLevels.preferMachines`, `complexityPenalty`, `conditioningWeight` (engine does not read these keys).

---

## SHOULD-BE vs AS-IS (ranked opportunities)

| Rank | Opportunity | Risk of inaction | Effort |
|------|-------------|------------------|--------|
| 1 | Unifyментировать/fix plan-build input parity helper (RA-024) | Preview/watch/session diverge | M |
| 2 | Persist experience + preferences on snapshot (RA-003) | Beginners underserved | S |
| 3 | Retag isolations; fix Core muscle map (RA-005, RA-008, RA-021) | Misleading plans/UI | M |
| 4 | History fetch for planned ids, not 18 seeds (RA-002) | Stalled progression | M |
| 5 | Weekly volume + balance model (RA-006, RA-015, RA-026) | Random weekly stimulus | L |
| 6 | Week-aware periodization (RA-001) | Flat 4-week feel | L |
| 7 | Re-prescribe on swap; wire or kill adaptSession (RA-019, RA-020) | Wrong loads after swap | M |

---

## Material files inspected

- `app/src/lib/training/engine/index.ts`
- `app/src/lib/training/programPlanner.ts`
- `app/src/lib/training/exerciseSelectionRank.ts`
- `app/src/lib/training/exerciseSessionRole.ts`
- `app/src/lib/training/exerciseLoadingProfile.ts`
- `app/src/lib/training/progression.ts`
- `app/src/lib/training/adaptiveLoadBias.ts`
- `app/src/lib/training/preview/index.ts`
- `app/src/wearables/WearablesProjectionService.ts`
- `app/src/screens/TrainingScreen.tsx`
- `app/src/screens/training/TrainingSetupScreen.tsx`
- `app/src/lib/training/catalog/exercises.v1.json`
- `app/src/lib/training/rules/rules.v1.json`
- `app/src/lib/training/weeklyVolumeSummary.ts`
- `app/src/lib/training/trainingProgramPerformanceSeed.ts`
- `app/src/lib/training/trainingProgramPerformanceSeedIds.ts`
- `app/src/lib/api.ts` (`createTrainingSessionItems`, `TrainingProfileRow`)
- `app/src/components/training/ReplaceExerciseDialog.tsx`
- `app/src/components/training/TrainingSessionView.tsx` (swap apply)
- `app/src/lib/training/types.ts` (`TrainingProfileSnapshot`)

**Commands:** catalog uniqueness script (node); ripgrep across `app/src` for build/adapt/experience/volume; `git branch` / `rev-parse`.

---

## Explicit non-claims

- Did not run the app on device or validate generated sessions visually.
- Did not treat docs/handover as evidence of runtime behavior.
- Recommendation ≠ implementation authority.
