# R08 — Eligible, exercise-specific substitution

**Type:** dependent app integration task. **Depends on:** R03 eligibility and R06 load/history contracts. **EIF:** N-0070. **Entry tree:** `ReplaceExerciseDialog.tsx` and `TrainingSessionView.tsx` contained uncommitted partial edits; R08 resumed them and preserved unrelated work.

**R08 source checkpoint (2026-10-15).** `3de2a5b` pushed and remote-verified. Resumed and verified the existing edits; independent frozen focused 95/95 and reviewer probes 5/5 pass. Both typechecks and source gates pass. Full isolated suite: 1,320 pass / the four established baseline failures. See [contract](../R08-substitution-contract.md) and [result](../../../../.eif/audit/N-0070/R08/result.md). Distributed atomicity and Android confirmation remain unproven; known EIF owner blocker prevents attachment/acceptance. N-0070 stays open. Stop after R08; do not start R09.

**Objective and scope.** Replace an unperformed exercise only with a candidate eligible for the current profile and a newly calculated exercise-specific prescription; preserve performed work's original identity. Own replacement candidate adapter/dialog and the narrow replacement path in session UI/persistence.

**Why.** [Audit R6](../../../../.eif/audit/training-intelligence-20261012/PROJECT_AUDIT_REPORT.md) / [product PA-06](../../../../.eif/audit/training-intelligence-20261012/product/HANDOFF.md): raw alternatives bypass restrictions and prior kilograms/reps are copied across implements. “Programme” replacement currently changes only the session item.

**Required behavior and acceptance.** Reapply shared hard eligibility to displayed alternatives. Re-prescribe in the replacement's load units with its own qualified baseline/history; if uncalibrated, show that state rather than copy an incompatible kg. A performed or partially performed item cannot have its exercise identity rewritten. Offer **session-only** scope until future programme override persistence is separately implemented and verified; remove misleading programme scope now. Keep started-session planned history immutable except an explicitly recorded allowed replacement of unperformed work.

**Verification/evidence.** Tests cover barbell→dumbbell, machine→bodyweight, injury/forbidden/disliked alternatives, one completed set, reload and session-only truth. Verify persisted original performed sets and canonical Done path. Run focused then required AGENTS checks, independent reviewer, explicit staging/commit/push and criterion evidence. Android confirmation belongs to R11.

**Exclusions/completion.** No new future-override schema, prescription constants, live user-session mutation or second completion workflow. Complete when selection, prescription, scope and history assertions pass; keep N-0070 open.
