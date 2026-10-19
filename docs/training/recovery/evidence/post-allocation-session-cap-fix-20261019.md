# Post-allocation session-total correction - 2026-10-19

Scope: `fix/training-confident-ux`, base `be70d2fa500d1f1889031e5e038ab57c59e9f449`.
Only the legacy `buildSession` small-muscle top-up is corrected. Stop after this
correction. No full suite, Android, EIF acceptance, R12, live data or saved-session
operations were performed.

## Correction and limits

Top-ups reserve their allowed increment through existing `takeSets(..., true)`.
That updates the session total before another muscle can consume capacity.
`noteMuscleSets` records only allocated increments. The direct-work priority-counter
exemption stays unchanged. The existing per-exercise ceiling and cloned prescription
values stay unchanged; no existing working sets are rewritten.

When capacity prevents a top-up, the existing exercise decision trace records the
number of unallocated top-up sets. Actual planned sets remain the source for volume
credit; neither a target nor an unallocated set becomes delivered work.

Remaining policy gap: this legacy path has no structured weekly shortfall result
or approved cap-constrained redistribution policy. The trace reports only the
blocked top-up increment, not the whole weekly deficit. It does not certify weekly
requirements as satisfied. Weekly targets, accepted allocation policies and the
isolation-priority precedence question remain unchanged. Existing policy provenance
is [ROUTINE_AUDIT.md](../../ROUTINE_AUDIT.md), Small-muscle volume (2026-10-07).

## Reproduction and regression results

| Case | Before working sets | After working sets |
| --- | ---: | ---: |
| Custom session cap 2 | 6 | 2 |
| Custom session cap 5 (masked in existing test) | 8 | 5 |
| Session cap 0 | 0 | 0 |
| Under-allocated first pass, cap 17 | 29 | 17 |
| Under-allocated first pass, cap 19 | 29 | 19 |
| Under-allocated first pass, cap 21 | 29 | 21 |
| Under-allocated first pass, cap 23 | 29 | 23 |
| Three complete top-ups, exact cap 29 | 29 | 29 |
| Three complete top-ups, spare capacity 120 | 29 | 29 |

The partial/competing top-up cases deliberately limit first-pass small-muscle
proposals to one set via a test spy. Selection, top-up and accounting execute real
code. Both dumbbell equipment aliases are supplied in this focused fixture so it
also works without the unrelated eligibility edit. The original diagnosis's
unmodified fixture is covered by the unchanged existing weekly-volume tests.

Three ordinary programme prescription snapshots (muscle, strength, mixed goals)
were captured from committed HEAD **before applying the correction**, in a temporary
source checkout without environment files or saved data. Installed dependencies were
shared by junction. The snapshots include IDs, priorities, all working-set values
and warm-ups. All three match after the correction in both source variants.

New focused suite: **15/15 pass**, including zero/partial/exact capacity, competing
top-ups, per-exercise maximums, set indexing/values, actual volume credit and three
frozen-session cases (started normal, started guided, existing guided snapshot).
Frozen arrays retain identity and deep content; source-plan mutation cannot alias
the materialized snapshot.

Focused command from `app/` (existing 30-second test budget):

```text
node node_modules/vitest/vitest.mjs run src/lib/training/__tests__/postAllocationSessionCap.test.ts src/lib/training/__tests__/weeklyVolumeModel.test.ts src/lib/training/__tests__/smallMuscleVolume.test.ts src/lib/training/__tests__/buildProgramDaySession.test.ts src/lib/training/__tests__/balancedHypertrophy.test.ts --reporter=verbose
```

Result in working tree **and** isolated committed HEAD plus only the top-up fix:
**32 passed / 1 existing failure**. The remaining assertion is
`weeklyVolumeModel > clamps a new session when a tighter cap is supplied`:
isolation total 15 versus ceiling 10. That test still stops before its five-set
build; the new dedicated regression executes it separately. The failed assertion
and its expectations were not changed. The existing frozen-session test now passes.
This is a failing focused aggregate, not a green repository acceptance gate.

`npm run typecheck`: **exit 0**, no errors.

## Separate source and staging review

Separate read-only reviewer: **APPROVE**, no scoped source findings. The review
checked session accounting, competing reservations, unchanged priority treatment,
prescription cloning, per-exercise limits and the unchanged frozen-session boundary.
The structured legacy weekly shortfall/redistribution limitation is documented above.

The engine was selectively staged using a patch constructed from committed HEAD
plus only the top-up block. The remaining unstaged eligibility diff was compared
against its pre-task capture (excluding only diff blob IDs): identical. The staged
engine contains no eligibility import or scoring changes. Only the correction,
focused test, pre-fix prescription snapshots and this sanitised evidence belong in
the commit. No raw logs, environment values, live identifiers or diagnostic dumps
are included.
