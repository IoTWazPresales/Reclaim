# R06 performance-history and progression boundary

## Implemented new-build ceiling - 2026-10-30

D-P2-01 now governs new builds under `weekly-20261030-v3`; supported historical
policy replay retains the original ceiling. Qualification and increments are
unchanged. Existing JSON holds per-exercise baseline edit timestamps; a newer
baseline wins and entered values are never overwritten. See the
[implementation and replay evidence](evidence/resolved-policy-implementation-20261030.md).
Earlier implementation-pending language below is retained as the prior checkpoint.

Scope: R06 only, based on committed R02 setup and R04 allocated-day interfaces.
This is a source contract, not N-0070 acceptance or Android verification.

## Approved ceiling policy update — 2026-10-30

D-P2-01 is **RESOLVED** by [operator decision 1](../../eif/phase2-controls/DECISIONS_PENDING.md#resolved-operator-decisions--2026-10-30):
most recent evidence wins. Qualified history as defined below, newer than the
baseline, supersedes the baseline ceiling. The new ceiling is the Epley estimate
from the best recent qualified set, at target reps. A baseline entered after the
last qualified session wins; without qualified history the baseline ceiling is
unchanged. Keep the existing double-progression increment and never overwrite the
user-entered baseline. This changes the approved new-build policy, not qualification
or frozen prescriptions. Engine implementation and verification remain pending.

## Source and identity

`getRecentExercisePerformances`, both last-performance APIs and the planning seed
read `training_session_items.performed.sets` together with that item's frozen
`planned.sets`, skipped flag and owning session's start/end. They never require
`training_set_logs`, update historical data, or complete work. The query filters
the authenticated owner, deduplicates requested IDs and pages in stable item-ID
order beyond Supabase's default response cap. Default planning requests every
catalogue candidate; a caller may supply relevant planned/candidate IDs instead.

Canonical stored weight is kilograms in the existing exercise-specific display
convention, not a total weight interchangeable between implements. Evidence
records kg, catalogue load-display mode, prescription type, exercise ID, item ID,
session ID, exact planned working-set indices/count and completion status. The
historical schema does not store a separate load-unit/version column: this
adapter applies the existing kg/catalogue convention, without conversion or a
migration. Legacy bare numeric maps have no such qualification and are rejected
at the engine decision boundary. No history crosses exercise IDs, per-hand/per-
dumbbell/total-bar conventions or prescription units.

## Availability and qualification

`missing` means a successful read found no started history for requested IDs;
`unavailable` means authentication, transport, missing response or any page failed.
`available` means timeline evidence exists, not that it is qualified. The legacy
map-only compatibility export throws on unavailable history; it returns an empty
map only for a successful absent-history read. Seed source,
status and requested IDs travel through profile to user state. A missing, pending
or unavailable fresh seed clears snapshot history rather than retaining stale
numeric maps. The screen's history-query key changes when the session-list cache
refreshes after completion, notification actions or offline replay; there is no
five-minute freshness promise over a newly completed session.

The latest entry remains latest even if unfinished, skipped, partially performed,
missing a frozen plan, invalid or unsupported. These entries break a hold streak;
the adapter never searches past them for an older success. A completed exercise
inside an unfinished session does not qualify. Working sets must match the frozen
indices/count exactly, with unique positive indices/repetitions, finite nonnegative
kg, valid completion timestamps within the session, and valid optional RPE. No
missing weight is coerced to zero. Multiple items for the same exercise/session
are conservatively unsupported, not two sessions of progress.

Mixed loads, assistance, unspecified load semantics and carry/time/complex units
cannot feed the ordinary rep/kg progression rule. External zero is uncalibrated;
bodyweight or added-bodyweight zero can qualify under their existing rule.
Pure bodyweight with a positive external load is inconsistent and rejected.
Qualification is rechecked at the engine boundary, including the current exercise
and load convention. Last/recent maps must agree before a decision can be made.

## Decisions and explanations

Only consecutive, distinct, newest-first qualified sessions are considered for
stagnation. Increasing total repetitions at the same uniform load and working-set
count breaks the hold streak even below the top of the current rep range. A load
or work-count change breaks comparability. The original R06 checkpoint retained:
exercise increments, RPE threshold, bodyweight rule, two-hold deload, rounding,
minimums and the exercise-specific Epley baseline ceiling. See the accepted policy
in `docs/training/ROUTINE_AUDIT.md`. The approved ceiling update above supersedes
the baseline-only policy for new builds; R06 qualification remains unchanged.

Explanations use the final saved weight and rep target after the ceiling/load
adjustment. Rounded increases report the actual kg delta; deload wording identifies
the percentage as a target rounded to the implement step/minimum. Bodyweight copy
does not claim a rep increment or added load was saved. Allocated, historical
balanced and generic required/optional prescription paths share this explanation.
Internal decision IDs are kept in evidence, not product copy.

## Historical v1 ceiling example (policy superseded 2026-10-30)

The tested bench timeline has three complete sessions: 80, 82.5 and 85 kg, each
three sets of 12 repetitions. Existing double progression proposes 87.5 kg. With
that exercise's retained estimated 1RM of 80 kg and a new target of 10 reps, the
existing rounded Epley ceiling applies 60 kg. The explanation explicitly says
60 kg for 10 reps per set, identifies the proposed 87.5 kg and the saved-baseline
limit. It does not promise +2.5 kg or replace the old baseline with recent history.
This is retained evidence of the original implementation, not the approved new-build
policy. D-P2-01 now approves the history override above; implementation and
verification of that update remain pending.

## Limits

Started/guided sessions keep frozen prescriptions; this contract informs new
builds only. No session completion authority, live data, schema, running policy,
R07 adjustment behavior, R08 substitution or R09 projection work is changed.
Android presentation and persistence are separately unverified. Independent review
and exact staged-source gate results are recorded in `.eif/audit/N-0070/R06/`.
