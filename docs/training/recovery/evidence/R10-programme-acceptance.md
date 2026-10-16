# R10 whole-programme acceptance — 2026-10-16

R10 only, branch `fix/training-confident-ux`, committed product baseline
`1666ba535354c20535d980489801fcc424ac2f6f` (R03–R09). Tests and evidence only;
no product implementation, schema, live data, Android journey or R11 work.
N-0071 remains open. This is a source verification checkpoint, not programme-wide
scientific acceptance or shipping approval.

## Independent requirements and evidence

- `R10-requirements.json`: separate reviewer authored literal expectations from
  accepted prose before inspecting new outputs. Latest balanced-week amendment
  takes precedence over the older universal 16-set target. Expected weekly major
  region sets at 50/50 are 6/10/12/12/12 for 2/3/4/5/6 days. These are existing
  product requirements, not new scientific constants.
- `programmeAcceptance.test.ts`: final delivered work checked against literal
  totals, catalogue primary scheduling region, prescriptions and five-day order.
  No generator policy table or generated requirement list supplies expected
  weekly totals. Correlated removal of allocation and actual sets, and correlated
  owner/requirement corruption, cannot pass the independent inspector.
- `R10-review-probes.test.ts` and `R10-independent-review.md`: actual separate
  agent re-execution and six independently authored probes. Same inherited model;
  no qualified exercise-domain review or independent-model claim.
- `R10-before-programmes.json`: immutable sanitized Phase 1 output extract, with
  source SHA256 and historical commit. It is a rejected-example fixture, never
  the expected-good oracle. The old binary/audit was not rerun.
- `R10-after-programmes.json`: compact actual sessions and prescriptions for all
  four weeks of representative balanced/five-day/limited-equipment scenarios.
  Zero external load means uncalibrated where explained; it does not mean the
  programme has established a personal working load.

## Coverage and programme findings

The main 42 scenarios plus six reviewer probes cover strength/running/hybrid,
2–6 days, beginner/advanced, 50/50 and original 46/46/8 goals, pure muscle/strength,
fat/fitter and four pure-goal legacy profiles, full/dumbbell/floor equipment,
injury/forbidden/disliked work, 1/5/8/12-repetition entered baselines, absent and
unavailable history, improving and partial history, JSON reload, substitutions,
label rename, calendar reconstruction and mixed frozen/future weeks.

Balanced 50/50 programmes meet equal major-region weekly requirements at every
frequency and both tested experience levels, weeks 1–4. Calendar passage alone
does not change strength exercises, sets or load. Support work is counted
directly, without crediting bench as arm work. Present support regions have
three or six sets; exact required support placement for every frequency is not
fully specified by accepted prose and is not invented here. Five-day sequencing
and chest isolation follow-ups are independently checked.

| Representative week | Observed result | Acceptance interpretation |
|---|---|---|
| Original 46/46/8, five-day full gym | Chest/back/quads/hamstrings each 10 sets; estimated minutes 43/45/38/35/48 | Pass existing balanced allocation/caps; not a clinical recovery claim |
| 50/50, two-day full gym | Each major region 6 sets | Pass literal weekly requirements |
| 50/50, six-day full gym | Each major region 12 sets, including upper-pectoral work as chest | Pass regional ownership accounting |
| Five-day floor only | Partial or empty days, including empty pull; whole week infeasible | Correct rejection; not a delivered-good programme |
| Five-day dumbbell/bench/floor | Partial programme, missing required back exposure | Correct rejection; start materialization throws |
| Two/three-day hybrid | No allowed run placement under retained rules; explicit hybrid error | Correct rejection, D-P2-03 pending |
| Running, 2–6 days | Actual run proposals preserve 20/20/30/30 minutes | Compatibility passes; D-P2-02 scientific conflict remains |

In the original five-day week, bench is 3×7 on both chest days; its unchanged
82.5 kg follows the normalized own baseline, while fly loads remain explicitly
uncalibrated. Monday uses dumbbell flyes and Wednesday cable flyes. Repeating
bench practice across days is consistent with specificity, not automatically a
repetition defect. Weekly dose is not multiplied by frequency.

The exact audited progression regression passes: successful 80 kg history
recommends 82.5 kg; the retained own-exercise baseline ceiling applies 80 kg with
an explicit explanation mentioning the proposed load and saved baseline limit.
This verifies truthful behavior, not resolution of D-P2-01. The 100→95 adjustment
survives JSON reload and agrees between phone/effective reader and guidance;
other pending targets, frozen plan and performed work are preserved.

Adversarial mutation checks reject empty/missing work, jointly lowered allocation
and prescription, corrupted ownership, bad reps, negative load and exceeded
estimated time. Current hard constraints exclude contraindicated, forbidden and
disliked IDs; reviewer probes exercise four pure-goal legacy paths. Replacement
does not transfer barbell kg to dumbbells or alter future saved programme weeks.
Partial/unavailable/missing history cannot qualify as completed progression;
increasing reps below the ceiling remain a hold rather than a stagnant deload.

## Passing compatibility is not policy approval

D-P2-01–06 retain their recorded status. Running tolerance gating versus calendar
minutes, hybrid 2/3 feasibility, scheduling ownership versus biological stimulus,
clinical population applicability, automatic fatigue/skip behavior and the
entered-lift missing-rack exception are not resolved by green tests. Recovery
checks cover existing caps, retained reductions/holds and frozen prescriptions;
no minimum recovery gap or new fatigue formula is asserted.

Hybrid 4–6 separate-run flags survive programme JSON and calendar reconstruction
through the actual stored-plan reader, on non-leg days. Runtime secondary-run
start/delivery is unverified. Legacy `once` goal profiles remain
`legacy_pending_review`, even when structural/restriction checks pass.

The independent inspector uses catalogue first-primary region and dose labels
to locate work; it is not an exhaustive independently declared per-slot policy
for every goal/equipment combination. Chest follow-up roles have a separate
literal-ID reviewer probe. See `R10-follow-up-requirements.md` for the documented
lower-body follow-up policy conflict and bounded remaining work.

## Gates, governance and source integrity

Run details and SHA256 receipts are in `R10-gates.json`. Verbose logs are retained
under `.eif/audit/N-0071/R10/`; required full-suite baseline failures are compared
by assertion identity against R09. The full suite is not described as green.
Fixture-authoring mistakes (region aliases, reviewer interface assumptions and
missing typed DB metadata) were corrected in tests only and rechecked.

The isolated checkout is a `git archive` of the committed baseline with only R10
tests/fixtures added. Installed dependencies are reused by junction. Unrelated
root engine, migration, report, CLI and EIF changes remain excluded and preserved.
Only explicit R10 and durability-document paths are staged.

Public EIF wrapper tests reproduce `LEASE_NOT_OWNER: R20261014R03` (one pass,
two existing failures). No ownership repair, takeover, release, evidence attach,
accept or complete is attempted. There is no EIF evidence ID. Criterion-level
status: N-0071 C1 has the bounded R10 programme evidence; its full recovery and
framework mapping remains R12. C2 Android/live parity remains unverified. C3
scientific/framework decisions remain separately queued. C4 branch publication
is recorded in `R10-publication.json`; full node acceptance remains outstanding.
No node completion is inferred from this checkpoint. Stop after R10.
