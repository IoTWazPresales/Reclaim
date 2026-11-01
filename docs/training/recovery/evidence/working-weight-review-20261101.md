# Working weight separate source review - 2026-11-01

Separate implementation-reviewer review of the working tree against baseline `b693b0dc28e527f054118e73ff48f84cb9f04aec` on `fix/training-confident-ux`. Final disposition: **no unresolved source blockers** in the reviewed scope. This is source/test review, not Android visual approval, live-data verification, release installation, or EIF acceptance. Full-gate/build evidence belongs to the executor's result report.

## Business rule and correctness

New-build repetition prescriptions limit working load to `floor(e1RM / (1 + (targetReps + 2)/30) / existingStep) * existingStep`, retaining any lower progression/deload proposal. This implements the operator's RPE 8 instruction and the audit distinction between ceiling and working weight without introducing other numeric policy. The original target-rep helper remains for explicit v1/historical replay. Non-repetition carry loading keeps its former behavior. D-P2-01 evidence ordering and baseline immutability remain; replacement planning now transports baseline timestamps from the real profile adapter through the resolver.

Source trace covers baseline/qualified history, same-unit anchor, generic required/optional/follow-up builds, allocated-day loading closures, replacement prescriptions, dry-run preview, materialization and frozen projections. Adaptive fatigue bias is reduction-only and cannot exceed an already stepped working limit. Stored started/guided items stay under the unchanged `plannedItemsForSession` snapshot boundary. No set-completion, persistence API, notification, native, migration or live-data implementation was changed.

## Findings resolved during review

1. A valid anchor whose working load floored to zero returned `null`, allowing a population fallback. It now returns zero for new builds, while historical v1 remains unchanged. An adversarial test proves no population replacement.
2. The replacement UI profile adapter dropped `constraints.baselineUpdatedAt`; passing the snapshot field only inside `prescribeReplacement` did not preserve actual D-P2-01 precedence. Both boundaries now carry it. A full adapter-to-replacement test uses a newer lower baseline and qualified older history.
3. Anchor-derived prescriptions lacked separate ceiling/working explanation because the exercise had no own baseline. Same-unit anchor evidence now supplies the existing audited squat scaling and rejects DB cross-unit inference; tests assert numeric ceiling and working values.
4. A lower adaptive applied load could be falsely attributed to the RPE 8 history limit when the progression proposal was already below that limit. Explanation now distinguishes current load adjustment; an adversarial test covers this case.
5. Applying target-reps-plus-two to non-repetition own-baseline inputs would interpret metres as reps. The resolver/explanation now restrict the new RPE rule to repetition prescriptions; the prior carry path has explicit preservation coverage.

## Independent execution

- `npx vitest run src/lib/training/__tests__/workingWeight.test.ts src/lib/training/__tests__/exerciseSubstitution.test.ts --reporter=verbose`: **25/25 tests, 2/2 files passed**, exit 0. Local log: `app/working-weight-review-final.local.txt`; 30-second configured test budget retained. The final subsequent test edit only completed TypeScript fixture shapes.
- Isolated read-only `git archive b693b0d app/src/lib/training` extraction plus esbuild bundles of the baseline and working resolvers: synthetic qualified own-unit shrugs `20 kg x 7`, three complete sets, target13 produces **17 kg before / 16 kg after**. The current explanation independently reports ceiling17, RPE8 working16 and applied16. [Sanitized comparator receipt](../../../../.eif/audit/N-0070/working-weight-review-20261101/baseline-comparison.json). No shared product source was swapped and no account/history was read or written.
- `npm run typecheck`: **passed**, exit 0. Local log: `app/working-weight-review-types.local.txt`; no TypeScript errors.

The reviewer added adversarial tests only to `workingWeight.test.ts` and this receipt. Product fixes were made by the executor and independently re-read. Existing five updated expectation files were reviewed: changed loads follow target-plus-two flooring; historical v1 assertions remain. No tests were excluded or budgets shortened in the independent execution.

## Reviewed file fingerprints

SHA-256 values cover the final reviewed on-disk bytes (including the final fixture type corrections):

| File | SHA-256 |
| --- | --- |
| `app/src/lib/training/progression.ts` | `7a29264958cb2425f2ebe3d266bf986a5dda0e5c67f62a327527d0958ca43111` |
| `app/src/lib/training/anchorLoad.ts` | `926e2307261bb53a107880c35f7eaec43f9dba5138f7dfb30f9adc12c5590e65` |
| `app/src/lib/training/engine/index.ts` | `34c0478a99dd0c1257fd751185a3a74853ff75537d82fbbe6c8f1a36a9990656` |
| `app/src/lib/training/exerciseSubstitution.ts` | `5bc41fa2cfa34b06c302acb054211f9c30c5df13d598dc0989e2e62a5fa7c35f` |
| `app/src/lib/training/__tests__/workingWeight.test.ts` | `4cfc8d32898596300f40d89b8fc770c7b1b5ec12113174bceeaf20aba5c01b01` |
| `app/src/lib/training/__tests__/anchorLoad.test.ts` | `55d3029c49f4184c3273d78a0350aa25e37782ac73179acb31a763e5c671e463` |
| `app/src/lib/training/__tests__/defaultLoadUnits.test.ts` | `644b9a9b367ba3f29ca6273650a9a2e03b8d4a4e6cf2e03a829e35dc3717fed4` |
| `app/src/lib/training/__tests__/performanceHistory.test.ts` | `02f721f0eedf4df21358aa6de206e0a3a1e1ea1336937bb17653521c30d7eff6` |
| `app/src/lib/training/__tests__/programmeAcceptance.test.ts` | `5bd2a3f8fe122b78c0213a00af69219746eff964c0122383fc2446171ba0d90d` |
| `app/src/lib/training/__tests__/routineVolumeMeasurement.test.ts` | `fb08c3695ea612ee121fd19891427a626c86b87dca336eb19df1fcba4d52f84e` |

Independent focused log SHA-256: `7234437376e1062a7e2296e0bb38f055959723137af08aa1cc4b64bd901fc4fe`.

Independent typecheck log SHA-256: `cd35ebdba9e12b61678eec835bf92424979bd88f78501689ba82b1dffbf391cc`.

## Final expectation follow-up

Separately reviewed the executor's final `weeklyProgrammeAllocation.test.ts` correction from 95 kg to **85 kg**. The rack-exception fixture retains its own squat baseline; `116.67 / (1 + (7 + 2)/30) = 89.74`, floored to the existing 5 kg step, gives 85 kg. Rack-exception and uncalibrated-fly assertions remain intact. This is the expected prospective RPE 8 load change, not a relaxed eligibility assertion. No product source changed after the review above. The executor owns the final file replay/full-suite coverage.

Additional reviewed file SHA-256: `4255c98ef1ddb8fdba56c127033abdfb1b565d3b14b9b29d9f0181258ec1d8b2` (`app/src/lib/training/__tests__/weeklyProgrammeAllocation.test.ts`).
