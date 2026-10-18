# Independent incomplete-history correction review ? 2026-10-18

Verdict: approve the final scoped source correction at the fingerprints below. Earlier approvals and withheld verdicts are preserved as historical candidate findings below; this verdict applies only to the final source. This is a source review, not programme acceptance, Android verification, scientific-policy approval or a full-suite result.

The reviewer applied the implementation-reviewer skill and detailed contract; read AGENTS.md, the R06 performance contract and exact-programme diagnosis; inspected the scoped diff and canonical adapter/qualification source; and assembled separate synthetic probes executed through esbuild/Node. The reviewer did not implement application changes or edit the author's tests. No raw captured profile/history was used. No live data, EIF state, session or programme was changed. R12 was not started.

## Final reviewed fingerprints

SHA256 of exact working-tree bytes:

| File | SHA256 |
| --- | --- |
| `app/src/lib/training/weeklyProgrammeValidator.ts` | `b4730b3a791408cc6d2d971c4e1dab4998a173f13590a7badc98adfd3d54e3b4` |
| `app/src/lib/training/__tests__/weeklyProgrammeValidator.test.ts` | `b8baba3afc339abe727f6dbad9f94e20f3f267e723c36582f109b5b49eefbd73` |

The preserved, separately modified `engine/index.ts` SHA256 was `3ba8cb793eb9da34a5d21ac14fd4ed65e5117776eb63adc76e72496cdf82dc48`, matching the diagnostic's executed-source fingerprint. It was not edited or accepted by this review.

## Findings and resolutions

1. MAJOR: the initial candidate delegated directly to `isQualifiedPerformance`, which accepted whitespace item identity, object session identity and performed-set timestamps before session start as qualified anchors. Independent probes returned `valid` without issues for each. A common structural guard now rejects all three before either qualified acceptance or rejected-barrier classification.
2. MAJOR: initial rejected-history classification rejected the canonical adapter's `duplicate_exercise_in_session` unsupported barrier. The revision preserves that reason/status, including incomplete duplicates. These remain unresolved at zero external load and cannot anchor positive no-inference load.
3. The coordinating agent subsequently identified that `Array.every` skips array holes, allowing a one-hole performed array to satisfy the older qualification predicate. The structural guard now iterates `Array.from` for planned indices and performed rows. Independent performed-hole, planned-hole and sparse-reason probes all fail closed.
4. MAJOR: a later independent public-validator probe supplied qualified older last-performance plus a canonical newer empty/incomplete `recent[0]`, with no baseline and positive 10 kg no-inference work. The validator returned valid/no issues while the engine correctly returned null progression. Approval was withheld. The final candidate checks the explicit contract fields of supplied last/recent first entries before anchoring and rejects mismatches even when a baseline exists. Last-only compatibility remains supported. The mismatch and additional variants now fail; matching qualified/incomplete and last-only controls behave correctly.

Historical candidate hashes (validator/tests):

- Initial rejected candidate: `04d162f44bef0f2480eb7ed6d937b9263e79bce84702118fc8ae83c973e44334` / `e3bb251b98dcab29b22399a7b7bccf0fbebc82b6c28e5f8ea11f6633b97c1567`.
- Provisional 32-probe candidate: `0f6f33975807d17f6b0c6bda1a643035745c02cebb03e641b13af976c1b1cf45` / `f757d37c3232f9d318e12c5924c611c37a1253a5e387529df0d47726f6bc7c9d`.
- Provisional 35-probe candidate, subsequently withheld on map consistency: `750dcf3f5b0d72b7c84c78c479b63c0229a33b4ae19487650a8cfdde67103a94` / `f014fa580089ecea0da6d5bde4938e5e22960dab899bb015b2f20aa1eaa60b72`.

## Final independent results

All 55 independent synthetic cases pass against the final root source:

- Canonical qualified history alone anchors its own exercise and produces a valid control week.
- Empty, partial, unfinished, skipped, mixed-load and duplicate barriers remain unqualified. Zero external load produces warnings/unresolved status without invalid-history errors; positive no-inference loads remain unanchored.
- Malformed qualified identity/timestamps, NaN/negative weights, infinite/fractional repetitions, invalid RPE, duplicate set indices, missing evidence, wrong exercise/unit/load convention/prescription, null sets, absent/sparse set arrays, sparse planned indices/reasons and contradictory qualification reasons fail closed.
- For older six-repetition and eight-repetition histories, a newest empty entry keeps progression null and loading equal to the no-history control.
- Eight last/recent mismatches (newest empty, different item/session/date/sets/status, empty recent, null recent) each fail with and without a baseline. Without a baseline, positive no-inference work also remains unanchored.
- Matching qualified history, qualified last-only history and reordered evidence object properties remain valid; matching incomplete history remains unresolved at zero.

Probe artifacts remain outside the repository under `%LOCALAPPDATA%/ReclaimDiagnostics/programme-exact-20261018/`. Final probe SHA256: `8de5f5eefa9e57d664d809e9d89f94b707062c3c3e9973436bdef6ff53228510`; final result SHA256: `49cc2a32c755ce0cbc49c372c38ea1a1761cb7036dbffe67627e48f288fa87d4`.

Earlier 32- and 35-case candidates were independently hashed and reprobed against `C:/Reclaim-incomplete-history-20261018/`, built from HEAD `41e8b008d704c5d5fb0bf6999fc78ed35b1cf9d3` plus scoped candidate source and a dependency junction. Their isolated results matched root exactly. Those checks are historical and do not establish final map-consistency source isolation; a final follow-up is recorded separately when complete.

## Replay-script review and limits

Read-only review of `replay-incomplete-history.cjs` found its replacement boundary consistent with its claim: captured Metro definitions are registered, the original validator establishes baseline reproduction, and only the validator is replaced with transpiled candidate source whose imports resolve to captured factories. It checks private-artifact hashes, nonvalidator source-manifest matches, exact baseline plan/four-week reproduction, unchanged generated prescriptions/declarations/coverage, unchanged canonical history and malformed-evidence controls. Writes are diagnostic artifacts and a sanitized receipt. The reviewer inspected this logic but did not independently execute private-fixture replay or authenticate the capture.

Full-suite results, exact private-fixture replay and committed-source provenance are separate coordinating-agent checks. The projection lacks session-end timestamps and an independent skipped field, so review cannot authenticate an end bound or skipped/duplicate claims from the projection alone. Rejected barriers never earn progression/load credit. No remaining material defect was found in the final scoped source.

## Staged-source provenance follow-up

The reviewer independently read each scoped index blob through `git show :<path>` and verified exact equality to the approved working-tree bytes after CRLF-to-LF normalization only. No other staged byte difference exists.

| Staged file | Git blob SHA-1 | SHA256 |
| --- | --- | --- |
| `app/src/lib/training/weeklyProgrammeValidator.ts` | `eec80742f3dce8355e872565dbd164493fd52f2c` | `44385538752ee04875656bf4e50deaa1f72354ae1d20ecca2ffc7b707bf67984` |
| `app/src/lib/training/__tests__/weeklyProgrammeValidator.test.ts` | `5e041ad5cd93b483277d8a3f5a0c0a99111591a8` | `2227bf5deb8a65f2966f49250bab55e72ab2c7cc8eb1ef19dc10c7dc9f095b36` |

This binds source approval to the staged Git objects; it does not claim a commit or deployment. Final isolated 55-case verification remains pending at this checkpoint.

## Final isolated 55-case verification

The reviewer independently verified that final scoped files in `C:/Reclaim-incomplete-history-20261018/` match the final approved working-tree hashes byte for byte and that current index blobs still differ only by CRLF-to-LF normalization. All 55 independent cases were then rebundled and executed against that isolated source. Results are byte-identical to the final root run and all assertions pass. Isolated probe SHA256: `1cd3b2f283426d0c524a2a33dfc4199ee15afd2a72a26040697527563ec0bf79`; isolated result SHA256: `49cc2a32c755ce0cbc49c372c38ea1a1761cb7036dbffe67627e48f288fa87d4`. Final source approval stands for the raw and staged fingerprints recorded above. This supersedes the pending-final-isolation checkpoints; no full-suite success, commit or runtime deployment is asserted.
