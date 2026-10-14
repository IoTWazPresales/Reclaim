# Product, architecture and journey critique

Date: 2026-10-12. Scope: independent Phase 1 investigation only. No source, ledger, programme, or live-data edits.

This is one independently delegated agent applying four specialist contracts, not four independent reviewers. Read: `.agents/skills/{product-manager,product-red-team,architecture-specialist,ux-research-journey-specialist}/SKILL.md` and each `references/contract.md`. Architecture scope: solution/module. Parent owns consolidation, scientific consultation, current Android observation and EIF framework investigation. This assessment does not invent participant research or claim an observed Android journey.

## Assessment

The product has useful deterministic functions and a strong intention to freeze started sessions, but it does not yet have a coherent programme decision authority. A calendar writer produces labels and intents; separate UI code coordinates weekly selection; an engine chooses between two prescription implementations based on display labels; previews and watch summaries independently regenerate with different inputs; execution and progression consume different representations of performance. Tests often protect isolated functions or reproduce the same simplified call pattern, so green tests do not establish the programme the person actually sees and follows.

There is a distinction between scientifically unsupported prescription, a valid policy with an integration bug, and an intentionally absent feature. Four identical weeks do not on their own prove poor science. What is absent is an accepted, testable longitudinal policy explaining when to maintain, progress, reduce, rebuild, or refer for human judgment. A four-week calendar plus local load progression should not be described as evidence of that policy.

The most concrete newly reproduced defect is intra-session autoregulation: a rule says to reduce 100 kg to 95 kg, while the UI/storage conversion discards the multiplier and the next-set read still returns 100 kg. That is an interface defect, not a debate about the ideal training percentage.

## Evidence boundaries

- Sources are the working tree observed in this audit. Existing unrelated modifications were not changed.
- `.eif/PROJECT_MANIFEST.md` has identity but blank product/outcome fields; `.eif/CONTEXT.md` has empty product/domain sections. Real historical context is elsewhere. These are integration evidence, not proof that any historical specialist lacked every other source.
- `docs/training/ROUTINE_AUDIT.md` combines an October 9 amendment, October 7 amendments and September 19 AS-IS sections. Older claims such as missing experience and 18 seed exercises are not current truth. `ROUTINE_VOLUME_BASELINE.md` says generated September 29, while current selection changed later.
- The only execution performed by this agent is the bounded source-function probe below. No Android or database journey was executed by this agent.
- Scientific efficacy and clinical suitability claims require the separate scientific investigation. Numeric policies below are reported as existing code, not endorsed.

## Findings and escape mechanisms

### PA-01 — Prescription architecture is selected by presentation text (high, confirmed source)

Observed: `engine/index.ts:1799–1822` first calls `buildBalancedProgramSession` and immediately returns when it succeeds. `balancedHypertrophy.ts:151–170` maps exact labels such as `Upper (Chest/Back)` and `Full Body (Hinge/Press)` to hard-coded slot sequences. Unrecognised labels fall through to the generic generator. The two paths differ in candidate selection, caps, preferences, experience treatment, volume handling and explanation metadata.

Expected: programme strategy and slot purpose must have explicit stable identity. A label rename or translation must not change exercise prescription. Shared safety/constraint validation must run for every strategy. Alternative strategies can coexist, but only behind a documented contract with common invariants.

Root cause: a targeted balanced-week implementation was introduced as an early return inside the existing wrapper. The wrapper centralises access without centralising behaviour. Weekly coordination remains in `TrainingScreen.tsx:471–513`, including sequence and avoidance state, outside either prescription implementation.

Layers: implementation + architecture specification + verification. The single-writer invariant for `buildFourWeekPlan` still holds for calendar days; this finding does not falsely allege a second calendar writer. It demonstrates that an import/call-site restriction is insufficient to establish one prescription policy.

Escape: generic tests call `buildSession` or use labels such as `FB`, `Legs`, `Arms` (`programQualityGolden.test.ts:93–196`), exercising the generic path while real named days take the new path. Existing balanced tests (`balancedHypertrophy.test.ts:7–94`) cover a narrow advanced five-day fixture. A generic-path pass does not validate the balanced route.

Control: strategy parity matrix over every planner-produced day, explicit strategy/version assertions, label-renaming metamorphic test, shared invariant gate after every candidate strategy. Evidence must include selected strategy and complete programme output, not merely wrapper usage.

### PA-02 — UI promises adaptation that the production decision path cannot supply (high, confirmed source)

Observed: Settings says suggested loads may ease when fatigue is elevated (`SettingsScreen.tsx:1180–1196`). `adaptiveLoadBias.ts:21–23` requires `userState.fatigueProxy`. Repository search finds production declaration/read but no production assignment. `engine/index.ts:1807–1818,1841–1850` constructs user state without fatigue; the balanced early return does not pass the adaptation option at all.

Expected: an offered setting must have a defined input source, freshness rule and effective behaviour, or explicitly state that data is unavailable. Recovery signals must not acquire physiological meaning merely because a field exists.

Root cause: implementing and unit-testing an opt-in pure function was treated as sufficient integration. Data sourcing and consumer propagation remain absent.

Layers: implementation/integration within product + specification + verification. No evidence here attributes this directly to shared EIF.

Escape: `adaptiveLoadBias.test.ts:24–32` injects synthetic fatigue into the function. It proves the function can react, not that a person can ever activate that reaction through the application.

Control: approved capability trace from input collection through normalization, decision, persisted proposal and UI. Test must toggle setting and vary a production-shaped signal through the actual builder entry; absence/staleness must yield an explicit unavailable state. Do not invent a fatigue formula during remediation without approval.

### PA-03 — Autoregulation result is discarded at the UI/persistence boundary (high, reproduced source contract)

Observed: `runtime/autoregulation.ts:141–182` emits a `weightMultiplier`, `adjustedWeight` and a reduction message. `TrainingSessionView.tsx:769–786` persists `adjustment.weightDelta ?? 0`, ignoring both fields. `sessionDerivedState.ts:23–48` adds only `weightDelta` to planned weight.

Reproduction: `node .eif/audit/training-intelligence-20261012/product/autoregulation-probe.cjs` ran successfully. `autoregulation-probe-result.json` records first set 100 kg, eight reps, RPE 9; rule recommends 95 kg and says reduction; UI projection writes zero delta; unchanged next-set derivation returns 100 kg. The probe executes unchanged rule/derivation source and copies the exact view field projection. It is not a mounted React, Android or DB test. The unused authority import in the derivation module is stubbed; no completion helper is called.

Expected: approved adjustment semantics survive every boundary; displayed explanation and effective numeric prescription agree. Frozen original planned sets should remain auditable, with any permitted adjustment represented separately under an explicit policy.

Root cause: two optional numeric representations (`weightMultiplier` and `weightDelta`) share a permissive type and have no translating contract.

Layers: implementation + verification. Escape: rule unit tests assert the producer fields, but not their consumption by the view and persisted reader. Optional fields and `?? 0` turn an incompatible contract into a success-shaped no-op.

Control: one typed adjustment representation, round-trip producer-to-storage-to-phone/notification/watch tests, message-to-value checks, rounding/load-semantics tests. Whether live automatic adjustment should remain enabled is a product decision; the current inconsistent contract must not be retained.

### PA-04 — Preview and programme inputs differ despite sharing a builder (high, confirmed source)

Observed: setup persists experience and baseline reps into programme data, but `OutcomePreviewPanel.tsx:9–42` accepts neither experience nor baseline reps, mode or skill preference. `preview/index.ts:84–90` assumes five reps, and `:132–150` builds a snapshot without experience. Setup builds real e1RM from chosen reps (`TrainingSetupScreen.tsx:383–395`) and stores experience (`:474`). It saves `includeSkillWork` to profile preferences (`:416–420`) but omits preferences from programme snapshot (`:466–480`).

Expected: preview should be an identified provisional result of the same normalized draft and decision context used on confirmation. Omitted inputs must be intentional and disclosed. Persisting a preference outside the input snapshot must not silently make it ineffective.

Root cause: manually duplicated normalization/snapshot construction in UI, preview and builder adapters. `as any` and optional fields permit omission.

Layers: implementation + verification. Escape: preview equivalence test (`preview/__tests__/preview.test.ts:128–204`) manually reconstructs a similarly simplified snapshot, again assuming five reps and excluding experience. It proves equivalence under shared omissions rather than through the real setup confirmation path. The old audit already records preference omission (`ROUTINE_AUDIT.md:196`), so rediscovery is evidence of unresolved integration, not a new symptom.

Control: one normalized draft/profile contract with explicit provenance; test actual setup serialization versus preview inputs for every exposed field. Acceptance includes advanced/beginner, non-five baseline reps, running/hybrid, skill-work and no-overhead constraints. Same decision-input digest must produce same prescription across preview and confirmation.

### PA-05 — Week plan and summaries are regenerated without persisted-session truth (high, confirmed architectural risk; user-visible mismatch not reproduced here)

Observed: `TrainingScreen.tsx:471–513` rebuilds all current-week day plans from current history and current code. This does not consult the planned items of already-started/completed sessions. `buildPlanForProgramDay` uses current-week cached plans by date or falls back to a call with no exercise-avoidance context (`:525–534`). A next day outside the current-week map similarly falls back (`:1010–1019`). Wear glance regeneration uses stored profile alone (`wearables/WearablesProjectionService.ts:60–68`). It presently exposes estimated duration, not exercise loads; do not claim it displays wrong kilograms.

Expected: completed/started work has frozen truth; future prescriptions have identified versions and a defined adaptation boundary. Weekly summaries distinguish completed, frozen planned and provisional future work. All surfaces project a shared result appropriate to their meaning.

Root cause: a programme persists calendar structure, while detailed exercises are ephemeral until session materialization. Week-level coordination is a component-local calculation. No durable decision version or content identity relates the summary to the session snapshot.

Layers: architecture/specification + implementation + verification. Escape: `buildProgramDaySession` tests protect snapshot freezing locally; that does not test whether the weekly headline is calculated from those snapshots. Cross-week fallback and wear consumers have different contexts.

Control: accepted read model for mixed historical/future week, plan-input/output versioning, end-to-end fixture showing preview, persisted start, history change and unchanged past summary. Avoid treating all recomputation as wrong: future adaptation is desirable when explicit.

### PA-06 — Exercise replacement copies incompatible prescription and overstates scope (high, confirmed source)

Observed: `TrainingSessionView.tsx:985–1023` copies old weight, reps and rest to the replacement exercise and carries old trace data. A replacement between loading modalities can therefore inherit kilograms with different meaning. The programme-scope branch (`:1060–1085`) comments that programme days do not store exercises and updates only the current session item.

Expected: replacement validates eligibility and requires an exercise-specific prescription or explicit calibration. Programme scope must actually change future programme policy or must not be offered. Completed set history should not be relabelled as though performed on the replacement.

Root cause: mutation of exercise identity is treated as display replacement, while load semantics and scope are separate domain decisions. No dedicated substitution contract.

Layers: implementation + specification + verification. Escape: old audit RA-020 already identified re-prescription gap; canonical completion tests do not verify substitution semantics. Whether any completed set has actually been misattributed requires a separate fixture/journey; source permits the concern but this agent did not mutate a session.

Control: approved substitution policy with completed-history preservation, per-exercise units/calibration, future-scope persistence and same immutable session authority. Use a fixture swapping a barbell movement for dumbbells and one after a completed set; verify effective load and historical identity across UI/storage/watch.

### PA-07 — Progression has partial, failure-obscuring evidence (high, source-confirmed structure; incidence uncertain)

Observed: `trainingProgramPerformanceSeedIds.ts` limits history fetch to 31 fixed ids. `loadTrainingPerformanceSeed` swallows errors and returns empty maps (`trainingProgramPerformanceSeed.ts:39–65`). `api.ts:2642–2720` selects items with non-null performed, then reads `training_set_logs`, although completion authority is `performed.sets`. It selects `ended_at` but does not filter for ended sessions. It retains recent entries before filtering for usable logs.

Expected: the generator knows whether history is absent, unavailable, stale, incomplete, skipped or valid for comparison. Every prescribed supported exercise should be eligible for history retrieval. Progression evidence must have explicit inclusion and session-completion rules.

Root cause: a fixed batching optimization became a capability boundary; multiple representations of performance lack a declared read contract. Failure is normalized to a new-user shape.

Layers: architecture/specification + implementation + verification. Escape: golden quality test only asserts seed length >=12 and inclusion of squat (`programQualityGolden.test.ts:52–55`); injected history tests bypass fetching and fallback. This does not establish programme-wide history coverage.

Control: fetch history for candidate/planned exercise ids, typed evidence status, canonical performed read model or verified replica reconciliation; test missing replica, skipped-only session, unfinished session, offline failure and >seed-catalogue id. Do not assume a DB migration is required before deciding the contract.

### PA-08 — Calendar repetition is not longitudinal outcome acceptance (high specification gap, confirmed intent/code)

Observed: `programPlanner.ts:133–156` repeats a weekly structure four times. `types.ts:175–181` and `engine/index.ts:1753–1757` explicitly say week index does not change strength prescription. `fourWeekProgression.test.ts:64–91` asserts no RIR/week multiplier and equal prescriptions. This was an intentional refusal to invent constants, recorded in PROGRESS lines 77–78; it was not accidental omission of a defined wave.

Expected: product acceptance defines supported user populations and observable progress decisions over time: evidence needed to progress; why to hold; return after missed days; when to reduce or rebuild; and what happens at block end. A repeated schedule can be an approved strategy if those decisions are coherent.

Root cause: historical charter accepted ambiguous feature shorthand (F4 bands, F5 sets/load/RIR), while available scientific/rule documents did not define it. Engineering correctly refused unsupported constants but did not obtain a reconciled product contract before dependent acceptance/closure. See parent EIF analysis for exact later closure mechanism.

Layers: specification + orchestration + verification. Not evidence that all four-week programmes require predetermined load waves. No new training constants proposed here.

Control: outcome-led longitudinal scenarios with policy IDs and scientific/product basis; explicit unresolved-decision status distinct from source-validation and completion. Scenario evidence must include sessions, adherence, availability and decisions over multiple blocks, not only week-index arithmetic.

### PA-09 — Product target and evidence specificity are underdefined (high, inference grounded in requirements)

The repository mission includes recovery from injury, illness, addiction and burnout. Training inputs represented in `TrainingProfileSnapshot`/setup are goals, schedule, equipment, broad injuries/forbidden intents, experience and a few entered lifts. They cannot establish suitability for all those recovery contexts. This is a product-boundary gap, not a claim that the app diagnoses or has caused harm.

The current UI of goal percentages, frequency and baseline entry offers apparent precision without a documented validation showing those controls match the recovering person's primary job. The product job should be framed as: help a supported adult choose an achievable, understandable programme, perform it, report actual work/effort and see justified future decisions. Mixed objective percentages are a product preference representation, not scientifically validated interpolation merely because the blend is deterministic.

Layers: product specification + domain briefing + verification. Escape: successful technical personalization (different output for different numbers) is easier to test than appropriate personalization for a supported user. Missing target/outcome fields in the installed manifest amplify integration risk, although they are not sole product truth.

Control: approve supported population/exclusions and recovery-product boundary; obtain qualified independent domain review for any clinical-return claim; representative task observation and programme review. Measure constraint adherence, feasibility, comprehension of load/adjustment, ability to finish/resume, and justified progression, rather than treating engagement or generator novelty as quality.

## Desired system and credible alternatives

Recommended direction: a deterministic, versioned programme decision pipeline with a bounded rule/template policy and explicit validation. Retain one `buildFourWeekPlan` calendar writer and `buildProgramDaySession` public entry, but replace hidden label dispatch and component-local orchestration with an explicit programme contract. This is a domain redesign inside the existing app, not a recommendation for microservices or an LLM exercise prescriber.

Flow: normalized profile and constraints -> evidence snapshot with freshness/status -> approved programme strategy -> week/block allocation -> slot and exercise selection -> exercise-specific prescription -> independent programme validator -> versioned proposal and explanations -> confirmed/frozen session snapshot -> canonical performed work -> reviewed progression evidence -> next future proposal.

A proposal must express infeasibility or degraded coverage instead of silently succeeding with missing slots. Hard eligibility/equipment constraints differ from preferences. Anatomical stimulus, display ownership and programme targets are different concepts; the science agent owns the proposed accounting choice. Week/day/session versions and decision reason codes must survive into views and evidence. No percentage is approved by this architecture alone.

| Option | Benefits | Costs/limits | Assessment |
|---|---|---|---|
| Explicit curated programme families + constrained selection + independent validator | Explainable, bounded candidate space, reviewed programmes, simpler certification of unsupported populations | Less flexibility; templates must be governed and coverage gaps explicit | Recommended initial correction for current product scope, with future extension seam |
| Whole-week constraint optimization | Direct treatment of availability, coverage, preference and fatigue budgets; explicit infeasibility | Objective weights/stimulus estimates need evidence; solver correctness does not confer scientific validity; harder explanation and migration | Credible later choice if approved requirements exceed curated families; prototype comparison before commitment |
| Repair both existing paths incrementally behind the current label dispatch | Lower migration effort | Preserves hidden strategy selection and duplicated constraint/prescription semantics; cannot establish durable truth without deeper contract changes | Reject as final architecture; local emergency fixes can precede migration after approval |

Do not choose by code diff size. Choose by coverage of approved constraints, transparency, replayability, feasibility, supported users and longitudinal behaviour. A generative model has no demonstrated requirement as the prescription authority; it may assist reviewed explanations only if separately scoped.

Retain: typed exercise catalogue identity; useful loading semantics metadata; deterministic pure functions after scientific review; started-session materialization/freeze; canonical performed completion and notification/FGS transport; provenance and trace concept; existing tests that genuinely protect invariants.

Improve: immutable normalized context, history evidence contract, strategy IDs, recipe/catalogue governance, explanations as actual reason records, time/coverage validation, future adaptation read model, setup confirmation reliability.

Replace: label-dependent decision dispatch, per-surface regeneration orchestration, fixed history seed as personalization boundary, synonym-like use of ownership/stimulus, incompatible autoregulation DTOs, copy-prescription substitution.

Remove or hide after approval: controls whose supported behaviour cannot be implemented (inert adaptation, nonfunctional programme replacement scope); unqualified claims of programme intelligence; unreachable `adaptSession` API only if no accepted caller remains. Do not delete it merely because it is currently unused before deciding desired behaviour.

## Prioritised proposal and acceptance

1. Approve product/scientific boundaries and reconcile rules. Deliver policy register separating evidence, extrapolation and product choice, supported population, explicit preserved invariants and unresolved decisions. Acceptance: independent domain reviewer can trace every material prescription/adjustment rule to the approved register; no contradictory active policy.
2. Approve programme authority contract and read model. Deliver strategy identity, normalized inputs, history status, proposal/frozen-session boundary and substitution/adjustment semantics. Acceptance: same input/version yields same output independent of UI label/surface; completed work survives all rebuild paths.
3. Correct demonstrated contract failures after authorization. Autoregulation, preview serialization, preferences, substitution and history inclusion require targeted integration fixtures. Acceptance: the reproduced 100/95 mismatch disappears consistently through storage and all consumption surfaces under the approved adaptation policy. No new clinical constants implicitly accepted.
4. Rebuild programme policy behind the existing public entry. Compare curated families against a solver prototype only if constraints justify it. Acceptance: independent programme rubric across supported goals, experience, equipment, selected-day patterns and missing history; nonfeasible cases explicitly reported. Preserve existing started sessions and user history.
5. Verify longitudinal and Android journeys. Baseline, preview, confirmation, start, complete/skip, resume, substitution, offline return, next prescription, end of block. Acceptance: exact persisted items reconcile with phone and Wear/FGS prompts and meaningful weekly summary; policy/version evidence is replayable.
6. Encode acceptance into Reclaim EIF integration. Mandatory owner/reviewer routing and evidence types follow decisions, not filenames; domain acceptance cannot be substituted by generic test counts. Shared framework proposals require separate authorization.

Risks: changed scientific rules affect future programme behavior and trust; compatibility with existing snapshots; schema migration may be necessary only after data contract choice and separate approval; more conservative eligibility can surface unsupported configurations; completion-path changes can threaten robust guided transport and therefore must be isolated and independently verified.

## Decisions for operator/reviewer

1. Approve a bounded nonclinical training product with explicitly supported users and a separately reviewed recovery/clinical boundary. Recommended: avoid extending physiological claims from a few broad injury flags. Trade-off: narrower promise, more defensible personalisation.
2. Approve the deterministic versioned pipeline with explicit curated programme families first, versus commissioning a whole-week optimizer now. Recommended: curated constrained families plus independent validator, judged against the same outcome scenarios; reconsider optimization only on demonstrated constraints. This is not approval of existing numbers or recipes.
3. Approve one scientific/product policy reconciliation before new volume, progression, frequency, load-transfer or fatigue rules. Recommended: reviewer-approved evidence register and competing proposals where evidence does not determine a unique policy; retain no-change for started sessions.
4. Decide whether intra-session adaptation is an authorized separate proposal overlay on frozen plans. Recommended: preserve frozen original prescription, make any allowed adjustment traceable, unit-aware and consistent across guidance; hide an ineffective feature until that policy is approved.

Routine implementation choices, component names and test-library details do not require operator decisions. Material product/science/architecture approval is required before any correction in this report is implemented.
