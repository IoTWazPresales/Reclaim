## Approved amendment ? 2026-11-03: prescription progression

The operator approved the combined reps/load correction and explicitly prohibited dual workflows. D-P2-01 retains newer explicit baseline precedence and immutable entered baselines. For comparable frozen prescriptions, the existing double-progression decision now governs the next reps/load pair without the history-derived Epley cap cancelling that decision. Estimates continue to apply to initial calibration/re-anchoring. Reset reps to the range minimum after an earned load increase or deload; retain optional RPE; count only two comparable unsuccessful attempts without improvement toward the existing deload. Incomplete/mixed/adjusted work is a barrier, not earned progression or stagnation.

The complete accepted contract is at the top of [ROUTINE_AUDIT.md](../../training/ROUTINE_AUDIT.md). This is a product policy correction, not scientific validation of an RPE-adjusted estimate. No split, exercise, set-volume, running, schema, completion-authority or native-service change is authorized by it. The older decisions below remain the historical record.

# Material policy decisions: resolved and pending

## Implementation checkpoint - 2026-10-30

Decisions 1-2 are now implemented for **new builds** under
`weekly-20261030-v3`. Decisions 3-4 have regression coverage without behavior
changes. Historical v1 replay and frozen started/guided prescriptions are retained.
[Implementation, offline replay, separate review and final test inventory](../../training/recovery/evidence/resolved-policy-implementation-20261030.md).
Android approval remains pending; this source checkpoint is not EIF acceptance.
The documentation-only checkpoint below records the earlier state before implementation.

## Resolved operator decisions — 2026-10-30

All four decisions below are **RESOLVED** by the operator. The wording is recorded
verbatim. This documentation checkpoint does not implement the policies, change
test expectations, approve historical violations or satisfy recovery acceptance.
Baseline: `623d0c0`; preserved edits: `dc96fb3`, `623d0c0`.

1. D-P2-01 — Most recent evidence wins.
   - Qualified history (R06 definition) newer than the baseline supersedes the
     baseline ceiling.
   - The new ceiling is the Epley estimate from the best recent qualified set,
     at the target reps.
   - A baseline entered after the last qualified session wins (returning or
     injured users).
   - No qualified history: baseline ceiling unchanged.
   - Step size stays the existing double-progression increment.
   - Never overwrite the user-entered baseline.

2. Cap precedence — new versioned policy (v2 rules) for new builds.
   - Binding limits:
     - per exercise <=5 sets
     - per owner-muscle per session <=10 (heavy + follow-up)
     - per session <=24 working sets and <=60 min estimate
     - user-supplied tighter caps as hard constraints
   - The per-priority isolation cap and the 120 session total are no longer
     binding for new builds.
   - Direct small-muscle work counts toward session and muscle totals.
   - Shortfalls are reported, never silently dropped.
   - v1 rules remain for frozen and historical sessions.

3. No fractional credit toward prescriptions.
   - Secondary involvement is recorded for recovery/fatigue only.
   - D-P2-04 stays open for any future cited change.

4. Weekly targets are weekly totals regardless of frequency.
   - Frequency distributes, never multiplies.
   - Volume increases come only from progression evidence.

### Provenance and implementation boundary

Approval source: the operator's 2026-10-30 instruction. Scientific context remains
in [ROUTINE_AUDIT.md](../../training/ROUTINE_AUDIT.md); qualified history retains the
identity, units, completeness and barrier requirements of the
[R06 contract](../../training/recovery/R06-performance-contract.md).

The [volume-cap diagnosis](../../training/recovery/evidence/volume-cap-diagnosis-20261019.md)
and [post-allocation session-cap repair](../../training/recovery/evidence/post-allocation-session-cap-fix-20261019.md)
remain dated evidence of v1 behavior. Decision 2 resolves their cap-precedence
question prospectively for v2; it does not turn failing assertions into passing
results. Reported baseline suite: 1,477 passed / 1 known failure (isolation cap
15 versus 10). Implementation and v2 verification remain follow-up work;
started/guided prescriptions stay frozen.

### Documentation validation — 2026-10-30

Local document links, four resolved decision rows, D-P2-04 OPEN, add-only CONTEXT
history and scoped `git diff --check` pass. The required full-suite command
`npm test -- --reporter=verbose` was attempted without a timeout override; it
produced no test outcomes after more than two minutes and was stopped. This run
is **INCOMPLETE**, not a new passing result. Output is local temporary evidence
(`%TEMP%/reclaim-policy-decisions-20261030-vitest.txt`), excluded from the commit.
No product source or test expectations changed.

## Decision register

The Phase2 instruction explicitly preserves accepted behavior where scientific/product rules remain unapproved. Work on independent correctness fixes continues.

| Decision | Evidence and conflict | Recommended direction / current handling |
|---|---|---|
| D-P2-01 Baseline ceiling versus achieved progression — RESOLVED 2026-10-30 | Phase1 T04/R7:100kg estimated maximum and successful80kg history can recommend82.5 while cap returns80. October rules explicitly made baseline a ceiling. | Operator decision 1 supersedes keep-cap-pending-approval guidance for new builds. Implementation pending; explanations must describe the final applied prescription. |
| Cap precedence — RESOLVED 2026-10-30 | Legacy priority caps conflict with direct-muscle allocation; the custom session-total top-up bug was separately repaired. | Decision 2 defines v2 for new builds; v1 remains for frozen and historical sessions. Implementation and verification pending. |
| Prescription credit — RESOLVED 2026-10-30 | Scheduling ownership, secondary involvement and fractional stimulus are distinct. | Decision 3: no fractional prescription credit; secondary involvement is recovery/fatigue only. D-P2-04 remains open. |
| Frequency and weekly targets — RESOLVED 2026-10-30 | More exposures must not multiply a weekly target. | Decision 4: distribute weekly totals; volume increases require progression evidence. |
| D-P2-02 Running progression | RD-001 requires completed comfortable prior work; RD-006 increases minutes by calendar week from20 to30. | Select one tolerance/evidence policy after domain review. Preserve accepted numeric schedule, disclose unresolved scientific translation; no new percentage or pace formula. |
| D-P2-03 Hybrid2/3-day feasibility | Full-body schedules plus no-run-on-leg-day rule leave zero allowed run slots. | Approve a schedule trade-off (separate run day or revised pairing) before introducing it. Return explicit infeasibility for new requests rather than strength-only success. |
| D-P2-04 Muscle stimulus and supported population — OPEN | Ownership quotas, multi-primary catalogue and fractional helper represent different concepts; healthy-adult findings do not establish clinical suitability. | Decision 3 resolves current prescription credit only. Clinical boundaries and any future cited change to fractional-dose policy remain open for qualified review. |
| D-P2-05 Automatic skip / fatigue capability | Existing adapter ignored skip outputs and lacks a production fatigue proxy. | Do not introduce a new fatigue formula or activate silent skipping. Make unavailable capability explicit; separately approve wider recovery adaptation. |
| D-P2-06 Equipment inference | Accepted balanced policy waives a missing rack for an entered lift. | Prefer explicit current equipment confirmation in a future approved policy; preserve exception with diagnostic provenance now. |
| D-P2-07 Shared EIF changes | E1–E5 expose schema, waiver and provenance gaps in inspected shared framework. | Separate grant for versioned public schema, strict selectors and evidence/approval semantics; only local Reclaim controls implemented here. |

These decisions are not retrospective approvals and cannot satisfy a recovery acceptance criterion by themselves.
