# Training intelligence: independent algorithm and domain assessment

Audit opened 2026-10-12; report completed 2026-10-13. Source baseline: `a9163835e7e649c101320853d85fd8df1e5b883e`, branch `fix/training-confident-ux`. Phase 1 recommendations only. No product code, constants, ledger, framework, live data or started sessions were changed.

This is one separately delegated agent's assessment using the actual `algorithm-logic-specialist` (AE-009) and `domain-analyst` (PB-004) skills and their `references/contract.md` files. It is not two independent people, a clinical consultation, or external independent review. Required project manifest/current/work-item/context were read. Scientific papers were retrieved separately from repository claims. The evidence does not establish any particular user's injury, training response or clinical suitability.

## Executive finding

The system has useful deterministic components, but does not currently provide a coherent, validated training prescription across its advertised input space. The newest correction introduces a second session-prescription implementation selected by English day names. That implementation can produce entirely empty weeks, ignores saved exercise exclusions, bypasses adaptations, and has different rules from the extensively tested generic engine. The source has one calendar writer and one product entry function; this does not imply one prescription policy.

Loading and progression are also internally inconsistent. A historical baseline can indefinitely cap a correctly calculated increase. Improving repetitions can count as stagnation. A partial session can qualify for increased loading. In-session adaptation describes a weight reduction but its caller drops the multiplier. These are concrete software/model defects, not disputes about the optimal number of sets.

The scientific rationale is an unstable mixture of population evidence, product policy and historical account-specific corrections. The cited research does not establish universal equal muscle quotas, fixed load defaults, one-owner muscle physiology, or a calendar-only 20-to-30-minute run progression. Some intentional policies may be reasonable after review; they must be represented and approved as policies, with applicability and uncertainty, rather than inferred automatically from citations.

## Evidence and reproducibility

- [probe.cjs](probe.cjs) loads the actual TypeScript modules with the installed TypeScript transpiler. It does not substitute the algorithm or access a database. Run from the repository root: `node .eif/audit/training-intelligence-20261012/training/probe.cjs`.
- [probe-results.json](probe-results.json) records full plans for gym, dumbbell and floor-only profiles, hybrid schedules, baseline/history interactions, dislike handling, experience and label changes. The probe is a measurement script, not a typecheck or durable acceptance suite. `head` records the assigned baseline; the script does not itself verify git HEAD.
- [targeted-tests.txt](targeted-tests.txt): four existing suites, **30/30 passing**: balanced hypertrophy, program-quality golden, double progression and running-design document. Initial sandbox execution failed before tests with esbuild `spawn EPERM`; the approved retry completed. Passing tests coexist with the reproduced failures below.
- Source searches followed planner → product wrapper → engine → balanced/generic implementation → loading/history and session/swap consumers. No AVD rendering or live persistence journey was performed by this specialist. The parent investigation owns those coverage statements.

## Findings and causal mechanisms

### T01 — A presentation label switches the prescription engine

**Confirmed; high impact.** `engine/index.ts:1799` invokes `buildBalancedProgramSession`, then returns immediately at line 1819. `balancedHypertrophy.ts:145` maps exact English labels, with extra intent checks for selected labels, to hard-coded slot arrays at line 118. The ordinary engine is only reached when this returns null. A trailing space added to `Upper (Chest/Back)` changes the exercises in the probe.

Expected: display naming must not select a different scientific policy. Stable plan-template identifiers, a policy version and one validated constraint/prescription flow should determine behavior. A label may describe the result.

Responsible layers: **implementation and architecture/specification**, with **verification** escape. The newest account-focused correction became a general production route. Golden tests use labels such as `FB`, `Legs` and `Arms`, or call `buildSession` directly. Those exercise the older implementation. `balancedHypertrophy.test.ts` covers a rich-equipment, advanced account and two narrow assertions, not all supported profiles. A wrapper-count or calendar-writer audit cannot detect a second policy behind the wrapper.

### T02 — Hard-coded candidates yield empty and incomplete plans

**Confirmed; high impact.** The five-day floor-only probe yields exercise counts **0, 0, 0, 0, 0**; no infeasibility result is returned. For dumbbells, bench and floor, the pull day contains only `dumbbell_curl`, `rear_delt_flyes` and `shrugs`. Candidate lists exclude available alternatives such as dumbbell rows. `balancedHypertrophy.ts:98` onward declares small fixed lists; lines 245–252 trim slots before filtering equipment and then silently skip slots without candidates.

Expected: a supported profile should yield a feasible programme or an explicit explanation of missing capability. Losing a major movement must trigger programme-level reassessment. It should not silently become a valid named day. If floor-only training is outside the accepted product scope, the UI must reject/explain that scope before producing the plan; this was not established from these source fixtures alone.

Responsible layers: **implementation/specification/verification**. The earlier engine's broader catalogue and fallback behavior are bypassed; no actual planner-to-session coverage assertion catches the missing work. A lower bound on total exercise count is insufficient: the acceptance oracle needs coverage of intended outcomes and explicit infeasibility.

### T03 — Exclusions and replacement eligibility do not survive the new route

**Confirmed source and fixture; high impact.** A profile whose `constraints.preferences.hatesExercises` contains `barbell_bench_press` still selects it. Balanced selection only receives equipment, baselines, injuries and forbidden movements (`balancedHypertrophy.ts:190`); it does not receive dislikes or machine/free-weight preference. It does preserve the injury and forbidden-movement filters for its initial selection; claiming those initial filters are absent would be wrong.

Replacement IDs, however, are every other slot candidate, without reapplying equipment, injury or forbidden-movement filters (`balancedHypertrophy.ts:293`). `ReplaceExerciseDialog.tsx:29` maps those IDs to names without eligibility checks. This is confirmed as an unfiltered offer path; no actual user replacement journey was executed here.

Expected: one eligibility function shared by selection and substitution, explicit hard versus soft preferences, and rejection explanations. A recorded historical lift is evidence of prior performance, not proof that a presently unticked rack exists. The rack waiver at lines 169–178 is an intentional current policy needing review, not silently removable authority.

Responsible layers: **implementation**, **specification** for the rack inference, **verification**. Narrow tests assert preservation of the account's entered lift and explicitly approve the rack waiver; cross-product preference and replacement tests are missing from that suite.

### T04 — Baseline ceilings prevent longitudinal load progression

**Confirmed fixture; high impact.** With bench estimated 1RM 100 kg and recent successful 3×9 at 80 kg, RPE 7, `deriveProgressionDecision` returns 82.5 kg, while `suggestLoading` returns 80 kg. `engine/index.ts:873–904` caps every history-derived decision at the original exercise's Epley working ceiling. The plan snapshot supplies that original baseline; no evolving estimate is passed at this boundary. This is more than conservative initial loading: successful subsequent performance cannot exceed the initial estimate through this path.

Expected: separate initial estimation from longitudinal evidence. A baseline should have date, source, confidence and units; a next-session decision must either use later qualifying evidence or explicitly explain why a reviewed safety limit overrides it. The decision reason and final numeric prescription must refer to the same result.

Responsible layers: **specification plus implementation plus verification**. The October prescription intent explicitly calls the Epley figure a ceiling, so changing this needs product/scientific approval. Unit tests for history progression and baseline capping can each pass while their composition suppresses progress. The exact escape is missing a multi-session scenario containing both a baseline and improving performance.

### T05 — Stagnation, successful completion and unknown load have conflated meanings

**Confirmed fixtures/source; high impact.** `progression.ts:246` counts every session below the top of the rep range as a hold if the weight is unchanged. An 80 kg improvement from 7 to 8 reps against range 5–9 counts as two holds. `decideDoubleProgression` then requests a deload at line 328. That is not evidence of stagnation; it can be ordinary double progression. A single completed set at the upper bound also qualifies for an increase because the function has no prescribed-set denominator or session-completion context (lines 231–238). The API seed reader selects non-null performed items but does not require ended sessions (`api.ts:2642` onward).

`workingWeight` takes the maximum load from all sets, so mixed-load sets are treated as one working-load achievement. `weight === 0` means bodyweight at line 289, but balanced plans also use zero to mean an external load that has not been prescribed (`balancedHypertrophy.ts:262`). If such zeros are logged, the progression model can interpret an unknown machine or free-weight load as bodyweight. The exposure of this last case depends on UI logging and was not replayed on device.

Expected: qualifying completed working sets, explicit skipped/partial status, comparable exercise/implement/unit context, actual rep progress and effort trend, and a load-state union (`unknown`, `external`, `bodyweight`, `assisted`). Proposed stagnation thresholds require approval; the audit does not invent replacements.

Responsible layers: **specification/domain model, implementation, verification**. Tests validate “two holds” with an already accepted definition, not whether improved repetitions are holds. A set-array API loses the information required for a correct completion decision.

### T06 — Runtime adaptation and recovery promise are incompletely connected

**Confirmed source; high impact for explanation correctness.** `runtime/autoregulation.ts` returns `adjustment.weightMultiplier`, `adjustedWeight` and sometimes `skipRemainingSets`. `TrainingSessionView.tsx:768–783` consumes only `weightDelta ?? 0` and `targetRepsDelta`. A high-RPE weight reduction therefore becomes a zero weight delta while the message says the weight is reduced. A request to skip remaining sets is discarded at this adapter. Some rep adjustments can still work; “all autoregulation is absent” would be inaccurate.

Separately, `fatigueProxy` is never populated in the product paths found by `rg` across `app/src`; its assignments occur in tests. `adaptSession` is called only by tests/devHarness. The generic optional bias therefore has no product fatigue signal at `buildSessionFromProgramDay`, and balanced sessions bypass it entirely. A distinct RPE runtime adaptation exists, as above. No evidence was found here that sleep, Health Connect metrics or broader recovery state determine the generated programme. This is a bounded call-graph finding, not proof that every recovery feature in the application is absent.

Expected: either a coherent explicit adaptation contract with data provenance and consumer tests, or honest product wording limiting the feature to what actually operates. Keep immutable prescribed history, record user-confirmed adjustments separately, and ensure phone, notification and watch guidance use the same effective target authority.

Responsible layers: **implementation/integration/verification**, and **specification** if “adaptive” implies recovery personalization beyond captured evidence. Isolated autoregulation output tests do not test the consumer's discarded fields. Verify adapter, persistence and next-target parity, not merely rule messages.

### T07 — Muscle accounting has three incompatible interpretations

**Confirmed; medium/high impact.** The newest specification and `balancedHypertrophy` describe one owner per exercise. The catalogue still gives multiple primary muscles (bench: pectorals, anterior deltoids, triceps; row: lats, rhomboids, middle traps, rear deltoids). `formatWeeklyMuscleSetLine` adds every primary tag into regional buckets (`weeklyVolumeSummary.ts:34` onward), so one row set can count multiple times as “Back.” `fractionalSetsByMuscle` separately credits primary tags 1 and secondary tags 0.5, even double-counting a tag present in both lists (`weeklyVolumeModel.ts:89`). This helper does not make balanced session generation a weekly muscle-dose allocator.

Expected: distinguish exercise ownership for scheduling, anatomical involvement, direct work and an explicitly named estimated indirect stimulus model. Display regional summaries without duplicate anatomical-tag inflation. Do not equate a convenient owner with an assertion that a compound movement supplies zero stimulus elsewhere. A fractional accounting model is an approximation, not an individual physiological measurement.

Responsible layers: **domain/specification, implementation, verification**. Existing taxonomy tests establish recognized strings, not semantic consistency among generation, accounting and UI. The old `smallMuscleVolume.ts` still implements experience-dependent 10/16 targets and goal thresholds on the generic route while the balanced route uses 3 supporting sets and goal-blended major sets. Same user goals therefore have different meanings depending on the route.

### T08 — Running progression is calendar-only; some hybrid plans have no run

**Confirmed source and fixture; high product impact.** `runGuidance.ts:6` returns 20 minutes for weeks 1–2 and 30 for weeks 3–4. `engine/index.ts:1773–1795` passes only week index, not activity baseline, completion, comfort or prior tolerance. `RUNNING_DESIGN.md` RD-001 says growth should follow completed comfortable sessions, while RD-006 supplies an unconditional calendar jump. Distance goals are persisted but intentionally serve as labels, not training inputs. A 5 km and 10 km goal can therefore receive the same programme by design.

Hybrid only flags runs on push/pull/upper templates (`programPlanner.ts:140` and `trainingMode.ts`). Two- and three-day muscle/strength splits use full-body days; both probes have **zero scheduled runs**. For higher frequencies, upper days gain additional run sessions without a combined weekly time/fatigue budget. The planner assigns sorted weekdays; it does not optimize elapsed recovery intervals between lower-body exposures.

Expected: a real hybrid outcome, an explicit dose/time trade-off, and run progression qualified by tolerability and completion if that is the accepted promise. The product may instead offer an honestly scoped timed activity companion; that is a valid alternative requiring scope approval. Do not substitute an uncited percentage progression table.

Responsible layers: **specification, implementation, verification**. The running document test only checks for citation IDs and wording. Those assertions cannot detect the RD-001/RD-006 contradiction or whether cited evidence supports the product translation. Mode tests do not establish that every supported hybrid frequency contains both modes.

### T09 — Repetition, effort, warm-up and time budget lack a coherent joint model

**Confirmed source; clinical consequences uncertain.** Balanced plans blend goal rep endpoints to a midpoint (`balancedHypertrophy.ts:73`) and use the same structure for beginner and advanced profiles; experience primarily affects cold-start kilograms. Population load defaults still vary by broad intent/equipment rather than individual performance (`engine/index.ts:921–968`). Body mass, detraining and individual exercise competence are not inputs to these defaults. For example, the same nominal free-weight default may have total-barbell versus per-dumbbell display semantics. No claim is made that every such default is harmful; individual suitability is unvalidated.

Generic progression evaluates the priority-specific range, but the balanced route prescribes isolation reps/rest for every non-primary priority (`balancedHypertrophy.ts:257–258`). A follow-up compound may be `accessory` for loading/progression while receiving the isolation target. That makes qualification depend on a different rep range than the one used to write its target.

Duration is 10 minutes plus 8 per compound slot and 3 per isolation (`balancedHypertrophy.ts:221`), independent of set count, reps and prescribed rest. The cap removes trailing slots before actual eligibility. It is not proof of a 60-minute session. Only the first compound gets warm-up rows; a later heavy squat after a press has none generated. Any new warm-up policy requires review; this is a missing contextual model, not permission to add constants.

Responsible layers: **specification/implementation/verification**. Tests compare table outputs or cap values rather than calculating feasible timed sessions and load units. Equal volume for every region and linear blending of goal sliders are product conventions; a citation to dose-response research does not validate those transformations.

### T10 — Exercise replacement preserves an incompatible prescription and misstates scope

**Confirmed source; high impact.** `TrainingSessionView.tsx:984–1004` changes exercise ID while copying old reps, kilograms and rest. A change from barbell to dumbbells can retain the barbell number under per-dumbbell semantics. The “program” branch at lines 1076–1083 still writes only the current session item; the comment acknowledges that programme days do not store specific exercises. This is the same mechanism previously documented as RA-020 in `ROUTINE_AUDIT.md`, showing that a known finding survived subsequent work.

Expected: eligibility and prescription recomputation for a proposed substitute, an explicit preview of load semantics, and a separately persisted future-plan preference when the person requests programme scope. Preserve completed sets and started-session history, rather than rebuilding them from a new generator output.

Responsible layers: **implementation plus integration/verification**. The exact organizational reason RA-020 remained unresolved requires the parent audit's ledger/decision reconstruction; the source confirms persistence of the defect, not who rejected or forgot it.

### T11 — History quality and coverage remain incomplete

**Confirmed source; medium/high impact.** The seed is now 31 IDs (`trainingProgramPerformanceSeedIds.ts`), not the historical 18. It still excludes selected balanced candidates such as `hack_squat`, `dumbbell_flyes`, `cable_chest_flyes`, `rear_delt_flyes`, `shrugs` and `chest_press_machine`. Those exercises can have logged history that is never delivered to new builds. Both performance seed loaders return empty maps on errors (`trainingProgramPerformanceSeed.ts:26` and 40), making “no history” indistinguishable from failed retrieval. The API reads log-table rows after selecting session items rather than using the canonical performed-set authority directly; reconciliation risk requires integration verification, not an assumption that logs always diverge.

Expected: fetch history for candidate/selected IDs through a bounded batched path, preserve coverage and failure state, reconcile to canonical completed working sets and avoid presenting a cold-start estimate as history-informed when the history lookup failed.

Responsible layers: **implementation, architecture/integration, verification**. “At least 12 IDs and includes squat” in `programQualityGolden.test.ts` is not a history-coverage property. Expanding a fixed list once mitigates symptoms without encoding coverage of future candidates.

## Scientific challenge: what the evidence does and does not justify

These are findings about evidence translation, not proposed numerical rule changes.

1. **Progressive resistance training and sufficient dose have support; one exact universal prescription does not.** The 2026 ACSM overview concerns healthy adults and distinguishes outcome-specific variables. It does not consistently find added benefit from periodization across outcomes. Consequently identical week structures are not, by themselves, proof of bad programming; the substantive problem is missing valid longitudinal progression and response monitoring. This also limits extrapolation to Reclaim's injury/illness/recovery audience. [Currier et al., ACSM 2026](https://pubmed.ncbi.nlm.nih.gov/41843416/).
2. **A count of sets is not a biological ownership law.** A recent dose-response meta-regression explicitly compares direct, total and fractional accounting and found strongest model evidence for fractional accounting. That supports retaining direct/indirect distinctions, while its average modeling coefficient is not a measured personal conversion. It does not authorize silently replacing current policy with 0.5 everywhere. [Pelland et al.](https://pubmed.ncbi.nlm.nih.gov/41343037/).
3. **Sequencing advice was stretched into a different rule.** ACSM 2009 discusses preserving exercise intensity through ordering; that is not proof that exactly one compound per movement pattern is universally optimal. Similarly, the highest dose tested in one trial is not a demonstrated universal safety ceiling. Goal percentages, universal regional equality and fixed isolation targets need explicit policy rationale distinct from the cited studies. [ACSM 2009](https://pubmed.ncbi.nlm.nih.gov/19204579/).
4. **The talk test has empirical support as a practical intensity guide, with limits.** Foster's validation study supports a relationship with ventilatory threshold, but includes timing and classification error. It does not establish an individualized weekly volume progression, guarantee safety for clinical populations or imply that heart-rate samples determine zones. [Foster et al. 2008](https://pubmed.ncbi.nlm.nih.gov/18277826/).
5. **Hybrid interference rationale needs an updated, outcome-specific review.** The 2022 update found no significant compromise in maximal strength or whole-muscle hypertrophy, while explosive strength could be attenuated, particularly in the same session. This challenges using the older Wilson synthesis as a categorical reason to forbid every run on a leg day. It does not prove all schedules equivalent or authorize changing the current separation invariant. [Schumann et al.](https://pubmed.ncbi.nlm.nih.gov/34757594/).
6. **Running guideline quantities are not a validated ramp.** The repository itself records Garber's 20/30-minute figures as population activity guidance and explicitly says they are not a Reclaim session template, then reuses them as its week-3 step. The inference from two guideline quantities to a two-week progression is not established by the retrieved evidence. The PubMed abstract endpoint for PMID 21694556 failed to return usable abstract text during this audit; the precise Garber claim should therefore be independently rechecked before policy approval. This retrieval limitation does not affect the confirmed code/document contradiction.
7. **A group mean ratio is not an individual capacity test.** Gullett's paper is a small biomechanical comparison of front and back squats; its reported means do not validate predicting an individual's overhead-squat working weight. `anchorLoad.ts` applies that ratio to overhead squats too. This path is outside the common balanced selection, so it is a narrower generic-engine concern. [Original paper, author-hosted copy](https://www.researchgate.net/profile/Gregory-Gutierrez/publication/23466524_A_Biomechanical_Comparison_of_Back_and_Front_Squats_in_Healthy_Trained_Individuals/links/5b4f47c9a6fdcc8dae29de52/A-Biomechanical-Comparison-of-Back-and-Front-Squats-in-Healthy-Trained-Individuals.pdf).

Do not infer that randomness or constant variation is desirable. Repeating an exercise can support practice and comparability. The question is whether repetition serves a declared goal within a feasible dose/recovery plan. A freshness heuristic (`weekAvoid`) is not a substitute for that explanation.

## Desired domain model and architecture

**Recommended direction, subject to approval:** one deterministic, policy-versioned programme compiler, using reviewed templates as inputs and shared constraint/prescription modules, followed by an independent programme validator. Preserve `buildFourWeekPlan` as the sole calendar writer and `buildProgramDaySession` as the public session-building entry, but remove English-label dispatch and duplicate scientific policies behind it through an approved migration.

Canonical concepts should include:

- **Profile evidence:** capability/experience, actual equipment, available time, current tolerance, goals, preferences and restrictions, each with provenance and missingness. Clinical exclusions require appropriate domain review; they should not become automated diagnoses.
- **Exercise identity:** stable exercise plus implement, unilateral/bilateral form, external-load unit, bodyweight/assistance semantics, movement family, primary/secondary anatomical involvement and skill requirements. Scheduling ownership is separate from stimulus accounting.
- **Programme intent:** outcome priorities, approved dose envelope, exposure pattern, time/recovery constraints and feasibility result. A muscle-dose estimate is an explicit model, not a renamed list of primary tags.
- **Prescription:** immutable planned sets with effort/range/load-state semantics and rule IDs. An unknown load must never be encoded as bodyweight. Every final decision records the qualifying evidence and actual applied result.
- **Performance:** completed/partial/skipped status and comparable working-set outcomes, tied to the original prescription and canonical completed-set authority.
- **Adaptation proposal:** a separate, explainable decision for future builds or explicit in-session adjustment, preserving original prescribed history and using the canonical execution path.

Flow: validate profile and scope → choose a reviewed programme intent → allocate weekly exposures under schedule/time constraints → select eligible exercises → prescribe in exercise-specific units using qualified history → evaluate actual weekly coverage/dose/time/recovery feasibility → persist versioned result → project identical targets to preview/phone/watch → collect performance → qualify evidence for the next decision. If constraints cannot be satisfied, return a useful partial-plan explanation or request a material scope change; do not silently delete requirements.

Retain the immutable-started-session approach, canonical set completion, one calendar writer, equipment-aware display helpers, deterministic behavior and explainability intent. Improve catalogue semantics, history qualification, eligibility, dose/time calculation and adapter contracts. Replace label-dispatched lists and duplicated rule interpretations. Remove dead policy helpers only after callers and migrations are reviewed; their existence should not masquerade as delivered capability.

### Alternatives

| Option | Merits | Costs / limits | Assessment |
|---|---|---|---|
| Reviewed template families + one constrained compiler/validator | Understandable, reproducible; can encode domain judgment and explicit infeasibility; supports staged validation | Requires supported population/equipment scope and template coverage; less flexible than unrestricted search | Recommended initial target on correctness grounds |
| Global constrained optimization | Can balance goals, exposures, time and preferences over the full week | Objective weights can be arbitrary; solver feasibility is not scientific validity; explanation and domain validation remain necessary | Evaluate if template families demonstrably cannot cover accepted cases; not rejected merely for change cost |
| Learned or LLM-driven autonomous prescription | Flexible language and candidate generation | No curated outcome dataset or calibrated personal-response model established; introduces non-determinism and harder safety/traceability | Do not make it the prescribing authority on present evidence; optional explanation layer only after validation |
| Limited static companion | Honest, lower-autonomy timed sessions and user-selected loading | Does not satisfy a claim of individualized adaptive coaching | Valid product alternative if the operator deliberately narrows scope |

No universal new dose constants, injury substitutions, deload schedule or ratio limits are proposed here. A qualified exercise-domain reviewer should review the product-policy translation before it becomes executable.

## Proposed prevention controls and evidence

| Failure | Proposed control | Evidence to retain | Owner / location |
|---|---|---|---|
| T01/T02 branch and coverage gaps | Generate through real planner labels for every supported mode/frequency/equipment group; stable template IDs; rename-invariance and explicit-infeasibility properties | Versioned input fixtures, actual plans, independent coverage verdicts | Reclaim programme-quality suite and CI |
| T03 exclusion bypass | Shared hard-eligibility validator for initial and replacement choices | Rejected candidates and reason codes; adversarial restrictions matrix | Reclaim selector/substitution contracts |
| T04/T05 stalled/partial progression | Multi-session simulations with baseline + improvement, partial work, missed sessions, mixed units and detraining | Decision before/after, evidence qualification, final prescription equality | Reclaim progression acceptance suite |
| T06 discarded adaptation | Producer/consumer contract test and persisted next-target phone/watch parity | Rule output, applied change, DB snapshot, runtime target | Reclaim integration tests + Android evidence |
| T07 inconsistent stimulus accounting | One versioned accounting model with glossary; cross-layer consistency tests | Direct/indirect estimates and display reconciliation | Catalogue governance + programme validator |
| T08 unsupported running/hybrid | Outcome acceptance for every supported hybrid frequency and tolerability-driven progression if approved | Calendar with both modes, total time, completed/comfortable evidence | Mode acceptance + Android journey |
| T09 infeasible duration/load | Unit-aware loading and time-budget feasibility checks based on final prescription | Reps, sets, rest, transitions, load-state and rounding explanation | Shared prescription validator |
| T10 faulty swap | Validate/re-prescribe substitute and verify future programme scope independently | Before/after prescriptions, retained completed history, subsequent day outcome | UI/persistence integration suite |
| T11 missing/failed history | Coverage of generated candidate IDs and explicit degraded-history state | IDs requested/returned, canonical-source reconciliation and failure trace | Data contract + integration tests |
| Unsupported scientific translation | Claim → population → outcome → evidence → inference → policy decision registry with independent challenge | Reviewer disposition, alternatives, uncertainties, effective version | Reclaim governance; reusable EIF gate proposal |

EIF should require these kinds of outcome evidence when it delegates algorithm work, but this specialist has not audited the shared framework implementation. Attribution of a **framework defect**, rather than misuse of an available capability, must come from the parent/framework investigation. Evidence here supports an integration/briefing need: validate the real composed path and independently challenge the scientific-to-product inference, not just the existence of a citation or a named specialist.

## Suggested execution dependencies after approval

1. **Agree supported users and claims, plus scientific-policy review authority.** Resolve static companion versus individualized coaching; clarify recovery/clinical boundary. Acceptance: explicit supported/unsupported cases and decisions on evidence translation, without introducing code constants.
2. **Freeze executable failure fixtures and independent acceptance oracles.** Preserve these probes; add formal tests only in Phase 2. Acceptance: each confirmed failure reproduced through the actual public path and matched to a root cause; known-good lifecycle invariants retained.
3. **Unify identities, eligibility and prescription data contracts.** Load state/units, stable template identity, history status and rule versions come before broad generator correction. Risk: stored-data compatibility; any migration needs separate approval and must preserve user history.
4. **Correct selection, progression and adapter composition under approved rules.** Include substitutes and the baseline/history interaction, not only plan aesthetics. Acceptance: weekly matrices and multi-session histories meet reviewed criteria, with no silent infeasibility or contradictory explanations.
5. **Implement accepted running/hybrid and recovery scope.** Depend on policy decisions and appropriate inputs. Acceptance: both requested modes exist, progression evidence is required where promised, and schedule/time trade-offs are explicit.
6. **Verify persisted Android outcomes independently.** Compare approved plan, stored items, rendered programme, session execution, substitution and next-build adaptation; include degraded history and partially completed sessions. Acceptance must include materialized truth and actual device/emulator evidence, not source-only screenshots or golden labels.

Material operator decisions: approve the unified deterministic compiler/validator direction; approve a bounded population and product promise; authorize independent qualified domain review of scientific rules; decide the progression baseline policy and running progression scope; and separately authorize any shared EIF changes identified by the framework audit. Routine module names, test mechanics and local refactoring should not become operator decisions.

## Limits and non-claims

This report confirms code behavior and synthetic outputs, not measured training outcomes. It does not conclude every repeated exercise, fixed four-week structure, barbell exercise for a beginner or same-day strength/run pairing is inherently wrong. It does not prescribe clinical rehabilitation, supply new physiological constants, or assert that a numerical plan is safe for a particular person. It does not claim the synthetic floor-only case was an actual account. Material policy changes remain behind the requested review gate.
