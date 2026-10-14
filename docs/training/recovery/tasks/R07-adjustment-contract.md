# R07 — Consistent in-session adjustment contract

**Type:** dependent integration task. **Depends on:** R06's qualified set/history representation. **EIF:** N-0070. **Current tree:** `TrainingSessionView.tsx` and `trainingSessionProgression.ts` have uncommitted edits; `sessionDerivedState.ts` and `runtime/autoregulation.ts` remain the producer/reader authorities. Inspect the partial adapter before editing.

**Objective and scope.** Ensure an existing authorized autoregulation recommendation produces the same effective next target in the phone view and guidance consumers while original planned sets stay frozen. Own the adjustment adapter, derived-state reader, and notification/watch target projection where actually used. Use the existing `setIntent()`/`reconcileNotifications()` transport and canonical completion path.

**Why.** [Audit R3–R4](../../../../.eif/audit/training-intelligence-20261012/PROJECT_AUDIT_REPORT.md) / [product PA-03](../../../../.eif/audit/training-intelligence-20261012/product/HANDOFF.md): producer returned 95 kg from 100 at high effort, while UI persisted zero delta and the reader kept 100. Some fatigue capabilities have no production input.

**Required behavior and acceptance.** A typed, unit-aware applied adjustment connects recommendation, effective value, explanation and persisted overlay. Existing accepted automatic weight/rep behavior may be repaired without changing thresholds. Do not activate previously ignored automatic `skipRemainingSets`, invent a fatigue proxy or change original `planned.sets`; report those as policy decisions. Invalid/unavailable input yields an explicit no-adjustment reason, not a false promise.

**Verification/evidence.** Reproduce the 100→95 example through actual adapter and reader, then phone/notification/watch target projection tests for weight, reps, bodyweight/assistance and reload. Verify original plan and `performed.sets` authority unchanged. Run required AGENTS checks, record before/after contract output and independent review, stage explicit files and commit/push. Visual/runtime claims need actual device evidence later in R11.

**Exclusions/completion.** No new physiological rules, second completion workflow, direct notification scheduling, native FGS changes or live session edits. Complete on cross-consumer agreement in source tests; leave N-0070 open until its other tasks and actual journeys are resolved.
