# R08 independent model verification — 2026-10-15

**Result: VERIFIED_WITH_LIMITATIONS.** No new release-blocking source defect was established in the scoped R08 review. This verifies the frozen source and synthetic acceptance coverage; it does not accept N-0070, approve shipping, or establish Android or distributed transaction behavior.

## Independence and source identity

Reviewer: `/root/r08_model_verify`, a fresh delegated context. The parent reports `spawn_agent` configuration `model: gpt-6.1-sol`, `reasoning_effort: high`, `fork_turns: none`. This is the requested/configured model identity, not independent proof of the runtime model; runtime identity is not exposed to this reviewer. This is a separate model-requested review path from the implementation and the earlier same-model reviewer. Its findings were derived from the source and rerun tests, not adopted from that review's conclusion.

Reviewed product commit: `3de2a5b8d5fcec9d9ce8cbf02ce18b303d9f067c`, observed as main workspace HEAD on `fix/training-confident-ux`. The isolated checkout remains detached at baseline `9c3c179e1544ef5ceccff099b58dba1a2f5924c9` with the frozen R08 files materialized over it. I compared all **18/18** manifest entries independently against both `git show <product-commit>:<path>` bytes and the isolated files at `C:/Reclaim-R08-verify-20261015`; every SHA-256 matches. The isolated baseline HEAD alone is therefore not the reviewed source identifier. Receipt: `model-source-receipt.json`.

I read AGENTS.md, the verification-controller skill and contract, R08 task and substitution contract, and the existing result/review/manifest. No product file, index, commit, runtime internal, ledger state, live database or schema was changed. R09 was not started. Only this report and the model review's audit log/receipt were written.

## Independently checked behavior

| Claim | Source and evidence | Assessment |
|---|---|---|
| Candidates respect current restrictions | `replacementCandidates`/`replacementEligibility` use actual catalogue entries, shared `evaluateExerciseEligibility`, slot intent and prescription minimum sets; filtering occurs before the active dialog's ten-entry limit. Equipment, contraindications, forbidden movements, dislikes and slot skill rules remain hard gates. | Supported. Missing profile yields no candidates. |
| Confirmation does not rely on old session profile | `TrainingSessionView` queries `getTrainingProfile` when opening; confirmation fetches it again and reruns eligibility. `getTrainingProfile` reads the signed-in user's latest saved row and throws on read failure. | Supported by source. This is a current-read snapshot, not an atomic guarantee against another device editing the profile afterward. |
| Prescription is exercise-specific | `prescribeReplacement` reconstructs targets/rest through existing engine helpers, preserves set count/indices, and supplies only the replacement's positive finite baseline to `estimated1RM`. Qualified own history must pass `isQualifiedPerformance`, available/requested history status, and `deriveProgressionDecision`; mismatched recent/last history cannot label the result calibrated. | Supported. The original kg/reps, warmups and adjustment overlays are not copied. No new scientific constants were introduced in this path. |
| Units and absent calibration remain explicit | Loading metadata comes from `getExerciseLoadingProfile`. Unsupported prescription/load modes cannot qualify through the R06 history guard. Uncalibrated external load is zero with an enter-load explanation; bodyweight is zero external kg. The focus card receives the persisted explanation. | Supported by source and synthetic cases; visual readability is not established. |
| Performed work retains its identity | Eligibility rejects any performed-set entry or skipped item. Persistence checks ownership, ended/skipped/performed state, existing logs, strict pending queue, expected original identity and original planned snapshot. Item update compares exercise, planned, performed and skipped values again. | Supported for the observed guarded path, subject to the nontransactional limits below. |
| Replacement is persisted and session-only | Trace stores original exercise/plan, timestamp, scope, calibration and units. Repeated replacement nests the prior trace through `originalPlanned`. API clears incompatible adjustments; UI publishes the returned row only after persistence succeeds. Reload uses persisted identity/targets. No future programme override writer is invoked. | Supported. Failed writes leave the old item. The older `ExerciseCard` dialog has no eligibility callback and therefore offers no candidates; active session replacement uses the fully supplied dialog. |
| Canonical completion remains authoritative | `applySetCompletion` still logs and merges `performed.sets`; it and exercise replacement use the shared per-item promise lock. Explicit stale identity fails in `logTrainingSet` and canonical merge. New offline Done payloads/schema/replay preserve optional exercise identity, and merge failures return `blocked` and retain queued work. | Supported within the stated scope; the lock is local to one JS runtime. |

## Re-executed verification

From `C:/Reclaim-R08-verify-20261015/app`, without timeout override:

```text
npx vitest run src/lib/training/__tests__/exerciseSubstitution.test.ts src/lib/training/__tests__/exerciseSubstitutionPersistence.test.ts src/lib/training/__tests__/substitutionCompletionIdentity.test.ts --reporter=verbose
```

**3 files / 29 tests passed; exit 0; 11.44 seconds.** Retained output: `model-focused.txt`. Cases include barbell-to-dumbbell own units, machine-to-bodyweight, exercise-specific repetitions/time hold, restrictions, one/three performed sets, own qualified history, reload, failed writes, pending queue/read error, row race, local serialization and stale completion identity.

The preexisting full-suite summary was inspected, not rerun by this reviewer: 1,320 pass / four baseline failures, exit 1. Earlier typecheck, dual-path, catalogue, 95-test review and five reviewer probes remain separately owned evidence. I do not turn those supplied gate results into independently rerun claims or call the full suite green.

## Safety challenge and residual limitations

1. **Distributed atomicity remains unproven.** The item compare-and-swap is not a transaction with the separate set-log insert, session end or another device's queue. The local lock cannot protect separate runtimes. A separate approved database change would be required for a stronger claim. No such change is authorized or performed here.
2. **Legacy replay rejection is not necessarily side-effect-free.** `offlineSync` attempts an absent legacy set-log insert before canonical merge checks the replacement provenance. With no `exerciseId`, `logTrainingSet` cannot reject stale exercise identity; the merge then rejects and leaves the operation blocked. Canonical performed identity is protected, but an unlabelled log row may already exist. Ordinary same-runtime replacement is blocked while that operation is pending; foreign/stale queues remain a limit of the nontransactional design. Do not describe this as rejection before any write, or as proof that every legacy log retains an explicit original exercise ID.
3. **Queue and storage guarantees are bounded.** Strict replacement reads fail closed on the inspected signed-in storage initialization/corruption paths. Queue retention after a failed merge is visible in source; this review does not prove lossless queue persistence under storage failure or concurrent writers. Existing queue persistence catches storage failures, and `upsertItem` replay does not carry exercise identity. Those are not stronger guarantees supplied by R08.
4. **Runtime and acceptance remain open.** No device/render/watch journey was executed. The supplied no-device ADB finding and R11 runtime scope remain explicit. Known `LEASE_NOT_OWNER: R20261014R03` was not reinvestigated, bypassed or mutated. No EIF evidence ID, human approval, shipping approval or N-0070 acceptance is asserted.

The source claims are supportable when phrased with those limits. No product change was requested in this verification; stronger distributed or side-effect-free replay claims would require additional implementation and approval beyond this frozen checkpoint.
