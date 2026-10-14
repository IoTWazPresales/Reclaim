# R03 shared exercise eligibility contract

Scope: `exerciseEligibility.ts` and its catalogue tests only. Weekly allocation,
whole-programme feasibility, substitution prescription/persistence and UI remain
later tasks. This contract is a prerequisite, not their acceptance evidence.

`evaluateExerciseEligibility(exercise, profile, options)` accepts an actual
catalogue `Exercise` and a saved `TrainingProfileSnapshot`. It is deterministic
and does not mutate either. `eligible` means no hard-constraint diagnostics;
it does not establish clinical suitability, slot fit, programme coverage,
prescription units or achievable loading.

`diagnostics` is a discriminated union with codes and matching values:

| Code | Detail | Meaning |
|---|---|---|
| `equipment_all` | `missing` | Every explicit ALL token is required |
| `equipment_any` | `requiredAny` | At least one explicit ANY token is required |
| `equipment_unavailable` | `requiredAny` | Legacy equipment is ANY when explicit lists are empty |
| `contraindication` | `injuries` | Exact catalogue/profile injury matches |
| `forbidden_movement` | `intents` | Any matching intent blocks the exercise |
| `excluded_exercise` | `exerciseId`, `source` | Saved `hatesExercises` or caller `excludedExerciseIds` |
| `skill_not_enabled` | `intents` | Existing skill opt-in gate for an explicitly supplied `selectionIntent` |

All applicable diagnostics are retained. Compatibility `reasons` and `warnings`
remain strings for the existing uncommitted consumers. New consumers should use
typed diagnostics, not parse strings. Positive finite baselines alone qualify
for the existing rack exception; another exercise's baseline cannot qualify it.

Equipment comparison trims whitespace, ignores case, and equates dumbbell(s)
and kettlebell(s), the singular/plural pairs found in the actual 137-row catalogue.
It does not infer a bench from an incline bench, a named machine from `machine`,
floor from no equipment, or any unlisted implement. Explicit ALL and ANY both
apply when populated; legacy ANY is used only when both are empty. No equipment
requirements means no equipment restriction.

Dislikes preserve `chooseExercise`'s accepted hard exclusion. Machine/free-weight
preferences remain ranking concerns, not hard eligibility rules. An entirely
disliked candidate pool stays empty with rejection evidence; there is no silent
dislike waiver. Injury and forbidden tokens, and excluded exercise IDs, match
exactly; there is no new diagnosis mapping or fuzzy exercise matching.

Skill role is intent-dependent: `handstand`, `planche`, and `overhead_squat` have
mixed roles. Supply `selectionIntent` to apply the existing skill preference for
that slot. Without it this contract makes no skill verdict; callers still own
slot compatibility and role gates. This corrects the unverified draft's broader
any-intent skill exclusion without changing the accepted selector policy.

The rack exception is disabled by default. `allowEnteredRackException: true`
preserves the accepted balanced-route rule only when the missing ALL equipment
is rack alone and this exercise has its own positive finite baseline. Structured
`policyExceptions` identifies the exercise, baseline, waived rack, provenance
in `docs/training/ROUTINE_AUDIT.md` (balanced week 2026-10-09), and unresolved
**D-P2-06**. It records an applied waiver even when another constraint rejects
the exercise. It never waives injuries, forbidden intents, dislikes, other
equipment or explicit ANY requirements. It is not proof that a rack exists.

`evaluateExerciseCandidates(catalogueRecords, profile, options)` returns every
record and decision in input order, retaining all rejections. Generation and
replacement can filter the same `eligibility.eligible` field; replacement can
exclude the original exercise through `excludedExerciseIds`. Callers resolve
IDs from the catalogue and handle unknown IDs before calling. Neither helper
ranks candidates, manufactures exercises, resolves empty slots, copies loads,
or implements the later weekly/substitution flows.

Unresolved policy/data limits: D-P2-06 remains pending. Several legacy records
use ANY for seemingly combined implements (`weighted_pull_ups`, `meadows_row`,
`skull_crushers`); this task preserves documented semantics rather than changing
catalogue safety rules. The current catalogue contains no explicit `equipmentAny`
entries, so tests label that requirement shape as synthetic in addition to testing
actual legacy ANY rows. Floor-only and dumbbell-only full-catalogue partitions
are hard-constraint results without slot context, not finished training plans.
