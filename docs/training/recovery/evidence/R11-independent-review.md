# R11 independent evidence review — 2026-10-16

Reviewer: separate delegated session `/root/r11_evidence_review`, same inherited
model as the integration agent. This is evidence review, not an independent
model or qualified exercise-domain review. R11 only; no application, account,
session or ledger mutation by this reviewer.

**Result: fixture extraction and bounded Android/live-read observations
VERIFIED_WITH_LIMITATIONS; full new-save/start/freeze/guidance acceptance remains
UNABLE_TO_VERIFY.** Reviewed final evidence/report and continuation checklist.
This receipt does not imply N-0071 acceptance.

## Committed R10 comparison

Read R11's acceptance task and the committed R10 acceptance, independent review,
follow-up requirements and primary fixture at
`589d527e615cae85869835681499b0e4d28fed3f`. Did not regenerate a programme, rerun
earlier engineering/audits or substitute source tests for Android evidence.

Independently compared `R11-representative-five-day.json` directly with
`git show 589d527e615cae85869835681499b0e4d28fed3f:docs/training/recovery/evidence/R10-after-programmes.json`
using Python JSON equality, including every ordered exercise, set prescription,
load explanation, day template and estimated duration. Checked all four R10
`original-five-day` weeks, rather than comparing R11 only with its own extraction
script. Raw committed source SHA256 is
`5b90ba9c02b7264a812c20001f6b02ec3ee98eb900cf85551ace49c863a3320b`, matching
the receipt. Weeks 1–4 have identical sessions without new history.

Day working-set totals reconcile to **16/13/17/14/16**, **76 weekly working
sets**, with estimated durations **43/45/38/35/48 minutes**. Exclusive scheduling
region totals match the committed R10 fixture: pectorals/lats/quadriceps/
hamstrings 10 each; lateral deltoids/biceps/calves/triceps/rear deltoids 6 each;
anterior deltoids/traps 3 each. These are observed fixture values, not a new
prescription or physiological claim. Catalogue first-primary ownership and
aliases are bookkeeping assumptions already limited by R10.

The extraction script reads the committed R10 output and catalogue, makes no
account call and does not generate a programme. Its hard-coded fixture metadata
was cross-checked against the committed `programmeAcceptance.test.ts` draft:
46/46/8 goals, Monday–Friday, full gym, advanced, twice, strength, no skill work
or constraints, entered weights and reps. The fixture date is the test's
2026-10-12 build date. `weekly-20261014-v2` matches the committed
`weeklyProgrammeTypes.ts` constant. Neither value proves a live profile revision
or stored programme policy stamp.

## Acceptance limits and unresolved findings

The JSON correctly identifies a **synthetic representative fixture**, not an
identified operator's saved profile. An authenticated profile revision,
programme/day identity, persisted planned items, started-session snapshot,
performed work and actual guidance remain necessary to establish runtime parity.
Identical fixture weeks show calendar-only stability; they do not establish
progression after completed history or prove a frozen Android session.

R10-P01 remains unresolved: lower days contain squat/hack-squat and
deadlift/Romanian-deadlift follow-ups (plus squat/leg-press on day five). The
recorded isolation-only versus later compound/load-example policy conflict
cannot be resolved by reproducing these outputs. D-P2-01 through D-P2-06 also
remain open as applicable, including the baseline ceiling behavior. No new
scientific approval follows from arithmetic or source compatibility.

The established EIF `LEASE_NOT_OWNER: R20261014R03` blocker remains separate
from evidence quality. No takeover, bypass, completion or acceptance is implied.
Missing device/watch/live DB checks must stay explicitly unverified and have
reproducible human steps. Final runtime report/screenshots and any human-check
queue registration cannot be inferred from this review.

## Independent runtime evidence inspection

Inspected local primary `live-programme-local.json` (2026-10-16T09:51:14Z) and
`live-details-local.json` (09:53:29Z), unwrapping the CDP JSON string, plus actual
`training-local.png`, `setup-local.png`, `setup-final-local.png`,
`preview-mon-local.png` and `preview-tue-local.png`. These local captures are
evidence reviewed here, not an instruction to publish raw account captures.

The retained actual profile is advanced strength, twice, Monday–Friday, with
approximately 45.4918% muscle / 47.0628% strength / 7.44546% fitter / 0% fat.
Android setup displays rounded 45/47/7/0. This differs from the R10 synthetic
46/46/8-fat fixture. Its persisted estimated baselines and setup's entered
105×5 bench / 90×5 squat / 100×5 deadlift agree with the displayed estimated
123/105/117 kg after rounding; the app does not display persisted estimated kg
as entered working kg.

The live retained programme starts October 12, contains four weeks / 20 days,
and has no policy stamp, weekly metadata or allocations. Its database day
metadata is persisted; its current proposed sets/weights are regenerated
saved-day projections, **not persisted started-session prescriptions**.
Current programme frozen-day count is zero and no open session was reported.
Six inspected completed historical sessions predate this programme and have
no active-programme day association; they cannot prove completion or frozen
snapshot parity for this saved week.

Independently summed projection set arrays: **14/10/16/13/14**, total **67**,
at **43/37/38/35/48 minutes**. Tuesday has four exercises and an infeasible
`unavailable_slot` error for `hip_hinge`. Monday's Android preview shows six
exercises and 43 minutes; Tuesday shows four and 37 minutes. Both agree with
the actual saved-day projection, rather than with R10's synthetic week.

Monday screenshot shows `Completed: 0 sets`, `Frozen planned: 0 sets`, and
`Provisional future: Chest 8 · Back 32 · Shoulders 28 · Arms 25 · Legs 19 ·
Programme needs review`. Arithmetic reconciles under the current summary
contract: Tuesday's infeasible projection is excluded, and every catalogue
primary muscle tag contributes, including multiple tags in the same bucket.
These overlapping display buckets are not R10's exclusive owner quotas and
must not be presented as independent weekly work-set totals.

The unsaved pure new build reports policy `weekly-20261014-v2`; every day in
its first-week projection carries infeasible status from the week's
`invalid_load_evidence` error for `leg_press`. This is an observed validation
result, not a successful regenerated programme or an independently diagnosed
history defect. No Android start or new persisted session is demonstrated by
the inspected evidence. Completed history, effective guidance, frozen-session
comparisons need their own bounded evidence or explicit limitations.

## Final publication review

Read `R11-android-acceptance.md`, `R11-human-verification.md`,
`R11-live-reconciliation.json`, `R11-preview-comparison.json`,
`R11-android-accessibility.json` and `R11-runtime-observations.json`. The report
explicitly distinguishes the mixed working-tree runtime (pre-existing engine
edit retained) from the committed R10 source fixture. This limitation prevents
attributing all observed legacy selection behavior to the committed baseline.
The runtime receipt demonstrates a booted current app and localhost Metro
HTTP 200, rather than declaring Android unavailable.

Independently checked **all 27 exercise-row comparisons**: identities/order,
set counts, first-set target reps and numeric kg match the sanitized live
projection, and each comparison's Android text occurs in the published
accessibility corpus. Zero-load rows explicitly distinguish bodyweight from
enter-a-weight. No missing rows are listed. This is hierarchy coverage,
including clipped/offscreen nodes, not full simultaneous pixel coverage or
Android rest-target/session acceptance.

Visually inspected all four publication PNGs: training week, setup baselines,
preview summary and historical detail. No email, account identity, heart-rate
or calorie values are visible. Inspected the published hierarchy corpus and
scanned for email, UUID, token, heart-rate and calorie markers; none were found.
Rejected `-end-` capture keys are absent. The publication uses bounded training
observations; underlying raw snapshots and rejected surfaces are not included
by this reviewer.

Direct before/after local CDP comparison independently confirmed unchanged
profile snapshot, all six stored planned/performed session snapshots,
saved-week proposal, new in-memory build, summary and open/frozen status.
Cache timestamps changed. Profile/programme revision values are consistent
with the original live programme receipt and the after-read. This establishes
the bounded re-read result, not an exhaustive database-wide mutation audit.

Independently recomputed the inspected October 1 historical sample from its
stored planned/performed arrays: **22 planned sets / 20 completed sets / eight
completed exercises / 5,394 kg volume**. The current detail screenshot agrees.
Its visible 5,939-minute duration is a separate historical observation; no
duration correctness or new-session acceptance is inferred from the matching
set summary.

The human-verification checklist provides reproducible canonical startup and
the remaining expressly authorized disposable save/start/frozen/effective/
completed/guidance comparisons. It retains R10-P01, D-P2-01–06, missing Wear
evidence and the unregistered EIF queue distinction. Source gate results are
reported as source evidence, with four baseline failures and lease failures
visible; this reviewer did not rerun the full harness or approve science.

Publication corrections requested during final review are resolved. All five
comparison limits now state that all exercise rows were captured while full
pixels/new sessions remain unverified. The report's Wednesday/Thursday table
was corrected to 38/35 minutes; independently inspecting the published
accessibility records confirms Android actually shows ~38/~35, matching the
timestamped projection. The initial 37/34 report values were a transcription
discrepancy, not an observed Android duration mismatch. The report also records
the unusual historical duration without asserting its cause or correctness.
No remaining publication blocker was found within this bounded review. Full
new-save/start/freeze/guidance acceptance, policy findings and EIF ownership
remain unresolved as stated. No application implementation or R12 work occurred.
