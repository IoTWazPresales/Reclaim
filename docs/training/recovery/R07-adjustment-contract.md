# R07 in-session adjustment contract

Scope: R07 only, built on committed R06 (`77726c6`). This is a source checkpoint;
N-0070 remains open and no runtime journey or shipping approval is claimed.

## Producer, overlay and consumer

`recommendSessionAdjustment` validates observed set input, exercise identity and
prescription units, then calls the unchanged `runtime/autoregulation` rules.
`autoregulationOverlay` consumes absolute `adjustedWeight` / `adjustedReps`,
rounds with the existing exercise increment, and returns a typed outcome with
kg, reps, load convention, rule ID, applied explanation and JSON overlay.
The overlay's deltas are relative to the frozen **next** planned set. The reason
uses the existing load formatter and names the effective result.

The old adapter read `adjustment.weightDelta`, although the rule provided
`adjustedWeight` and `weightMultiplier`. For the audited first-set RPE 9 case:

| Boundary | Before | After |
|---|---|---|
| Producer | 95 kg from 100 kg | unchanged |
| Saved weight delta | 0 kg | -5 kg |
| Phone/derived next target | 100 kg, 8 reps | 95 kg, 8 reps |
| Guidance after JSON reload | original prescription | 95 kg, 8 reps |
| Plan / performed history | original | original |

The same existing later-set RPE 10 rule projects 90 kg / 6 reps from 100 kg /
8 reps. These are implementation examples, not new scientific prescriptions;
rule-policy authority remains `docs/training/ROUTINE_AUDIT.md` and its pending
scientific decisions. No thresholds or numerical producer rules changed.

## Persistence and guidance

Phone completion still calls `applySetCompletion` and patches canonical
`performed.sets`. Only an online successful completion may publish a new future
overlay. `persistAppliedSessionAdjustment` awaits the existing API write before
patching the session query cache. A failed read/write retains the old target and
the UI reports failure. Offline completion stays on the existing queue without
a phone-only adjustment. The duplicate guard spans persistence and guidance.

The rest preview selects canonical pending work across completed/skipped and
partially completed exercises. The focus card, rest preview, notification focus overlay and its Done action,
edit defaults, and full-plan projection use `getAdjustedSetParams`. No second
local adjustment map overrides the saved overlay. Completed-set edit defaults
still come from actual `performed.sets`. The reader ignores overlays on completed
sets and rejects corrupt deltas with an explicit reason.

`workTargetToNotificationNext` uses that reader. Existing scheduler prompt bodies
and phone/Wear Done fire-time derivation therefore agree with the phone target
after reload; stale payload weights cannot replace it. `setIntent` /
`reconcileNotifications`, foreground service behavior and completion authority
are unchanged. Upcoming programme glance projection is outside this live-session
contract and is unchanged.

## Explicit non-application

- Missing RPE, invalid inputs, missing next set, no recommendation and rounding to
  the same target return explicit no-adjustment outcomes.
- Bodyweight keeps zero kg when the existing rule changes reps; it cannot promise
  a weight reduction when the effective target remains zero.
- Assistance weight reductions are unsupported until their direction policy is
  approved. Explicit rep-only results preserve the existing assistance load.
- Carry distance, holds and complex repetitions are not treated as simple reps.
  R06 unit qualification is retained: positive external load on pure bodyweight,
  unspecified load semantics and uncalibrated zero external load stay unsupported.
- `skipRemainingSets` remains advisory and never writes skipped/completed work.
- Multiplier-only fatigue output without an effective target stays unapplied;
  no new fatigue input or interpretation is introduced.
- No started prescription, canonical history, planner, migration or scientific
  decision is changed. D-P2-01 remains pending.

Verification and governance receipts: `.eif/audit/N-0070/R07/result.md`.
