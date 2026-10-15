# FINAL R05 independent source review — 2026-10-15

Verdict: VERIFIED_WITH_LIMITATIONS. All initial and subsequent legacy source findings documented below are resolved in this exact candidate. Historical NOT APPROVED/pending-fix sections below describe superseded candidates only. N-0069 acceptance remains open; this review does not replace the full AGENTS harness or ledger gates.

Exact isolated candidate: C:/Reclaim-R05-verify-20261014, detached HEAD 37118f59da8692875bb4c881cd9994697d91c60d plus R05 validator and focused test.

Final SHA256:
- weeklyProgrammeValidator.ts: 6BFE75037FCB1C7CB7D8D77C4E1EDCEC69252458EC0E37850E44C8861A797336
- weeklyProgrammeValidator.test.ts: 9833670A25A056E7508EE0C3287A77688EAF1131B15F5AB277AEA21D11CC4EDC

Final independent command from isolated app:
`npx vitest run src/lib/training/__tests__/r05-independent-probe.test.ts --reporter=verbose`
Observed process exit 0, one file / nine tests passed, 16.38 seconds. Log: model-probes-legacy-final.txt. Default thread pool and configured testTimeout remained unchanged; no fork fallback was needed. Final hashes above were re-read after completion and match the reviewed frozen source.

The nine independently selected probes cover missing/numeric strategy, malformed history, unsupported final validation status, daily allocation error, excessive warmup, ordinary legacy display-name plus stable-ID alternatives, absent legacy intent, and forged legacy alternative ID masked by a valid display name. All reject or retain unresolved status as intended, without throws.

Final source review: legacy_pending_review without declared weekly quotas remains unresolved, never valid. It still checks actual catalogue identity, R03 eligibility, alternative eligibility, duplicate exercises, finite sets/reps/rest/load, bodyweight and baseline load constraints, time/set caps, empty selected lifting days, whole-programme/run/mode checks. Trusted accepted coverage keeps the stricter allocation checks. Missing intent arrays now fail the payload guard. Legacy alternatives use nonempty stable IDs as authority; display-only exact canonical names/IDs are resolved, and unresolvable display-only identity stays explicitly unresolved. No invented legacy quota or new progression model was introduced.

Residual limitations: literal fixtures and reason-specific mutations are independent and meaningful; public integration declarations still partly copy generated calendar/run targets and are a weaker oracle. Earlier focused-suite attempts on preceding hashes exited 1 from thread-startup timeout despite passing stdout and are not relabeled clean. The parent owns final focused/full harness evidence on the final hash. Review is source-only, not clinical/product acceptance, runtime proof, or N-0069 closure. No production edits or ledger/runtime writes by reviewer. Temporary probe file is untracked and must not be staged as product source.

---
# Legacy correction review â€” pending fixes

Latest inspected validator SHA256 3BABE331F7E11F8C0F96608E59B9BB7FFE474C5D048B4219EAFEF5D5519AFD47; test F8DDC202ED2D5576066CFF9AC4EE06F8C6A27165DC94D1FE3DB1D41B4B02D35E. This latest source is NOT covered by the earlier verified verdict.

Two source-review blockers sent to parent: legacy branch reads decisionTrace.intent[0] without guarding missing/null intent; and it treats rankedAlternatives display names as IDs despite actual legacy engine emitting enriched.names alongside rankedAlternativeIds=enriched.ids. Actual ordinary legacy alternatives therefore become invalid. Literal added fixture has empty alternatives and misses this. Three extra independent probes are prepared in the temporary probe file but not run pending parent's exclusive test window. Coverage-unresolved design itself is appropriate: policy warning prevents valid status and shared actual dose/load/time/mode checks remain.

---
# R05 revised candidate Ã¢â‚¬â€ final review

Verdict: VERIFIED_WITH_LIMITATIONS. Initial findings below resolved. N-0069 acceptance remains open; source verification only.

Final HEAD 37118f59da8692875bb4c881cd9994697d91c60d. SHA256 validator 1A5B76F5D8030B8D4E3617B5D8A12B4BFF56AAF1CCA5C70FE91F807A30AF6689; focused test E7DB7A845182A8E62E199FCDB0E0D001BE98429AE18F4217249B52F5CEF0D40A. Unchanged during review.

Independent probe rerun: `npx vitest run src/lib/training/__tests__/r05-independent-probe.test.ts --reporter=verbose` from isolated app. Observed exit0, 6/6 tests passed, 9.40s; model-probes-revised-retry.txt. Missing/numeric strategy returns invalid_payload, malformed history invalid, unsupported final status invalid, daily error produces allocation_day_issue, excessive warmup produces invalid_warmup. Earlier revised attempt hit thread startup timeout.

Focused rerun: `npx vitest run src/lib/training/__tests__/weeklyProgrammeValidator.test.ts --reporter=verbose`. Both sequential attempts observed exit1 from [vitest-pool]: Timeout starting threads runner; later passing assertion stdout does NOT establish clean suite success. Logs model-focused-revised.txt and model-focused-revised-retry.txt. Full harness remains parent's responsibility.

Inspected guards and error propagation; warmup validation independently checks final working-weight fractions and five reps, matching existing ROUTINE_AUDIT.md line45. No generator warmup helper called. Literal fixture remains meaningful independent oracle; public integration declaration correlation caveat below persists. No new source blocker found in revised scope. Isolated status additionally showed modified docs/training/ROUTINE_VOLUME_BASELINE.md from another run; reviewer did not modify/stage/revert it. No reviewer production source, runtime or ledger changes.

---
# R05 independent model review Ã¢â‚¬â€ initial candidate

Verdict: FAILED. Source review only; N-0069 acceptance remains open and LEASE_NOT_OWNER:R20261014R03 is not resolved by this review.

Scope: detached C:/Reclaim-R05-verify-20261014 at 37118f5, plus weeklyProgrammeValidator.ts and its focused test. No implementation, ledger or runtime changes. Applied verification-controller and implementation-reviewer contracts. Separate agent/model review requested by the parent; model identity is not independently attested by this artifact.

SHA256 at inspection:
- validator: 7DB2C7D94140BECB5C988EA4CFE117BC5605C5340883E108DE8433298A8633B5
- focused test: 8A26260270B9FF44DCB0637EFEC83BC0D9DA4142CC8F93E3E90AD5143AE782DF

Findings:
1. MAJOR: deleting declaration.strategyId or replacing it with 42 passes completeShape, records unsupported_strategy, then throws at eligibilityOptions/startsWith. Persisted malformed input does not return the promised structured invalid result. Guard scalar types before later consumption.
2. MAJOR: adding an error to allocation.days[1].issues while leaving valid work returns valid with zero issues. The validator honors weekly and final-session errors but silently ignores daily allocation errors, even though the R04 materializer propagates these errors. Validate and retain per-day errors independently of duplicated summaries.
3. MINOR: final programmeValidation {status:'nonsense',issues:[]} returns valid. Optional metadata shape checks inspect issues but not status/policyVersion. Reject unsupported supplied status/version.
4. MAJOR load-validation gap: a warmup of 1,000,000 kg x5 with own baseline100 and working sets10 returns valid. Warmups receive only finite/nonnegative checks and bypass the exercise load-state/baseline checks. Apply applicable existing load invariants to all prescribed load rows without counting warmups as working dose; do not invent a new ceiling.

Probe controls: malformed selected history sets=42 correctly returns invalid_load_evidence. Existing focused assertions visibly pass for literal valid fixture, 4-week coverage, missing slots/sessions/weeks, simultaneous output allocation/reps manipulation, ineligible equipment/injury/alternatives, set/time caps, load state corruption, run mislabels and hybrid omissions.

Fixture quality: reviewedRows is literal and does not call the generator. Requirements and actual sessions share fixture construction, which is normal test setup; the independent policy literals plus reason-specific mutations are meaningful and not generator snapshots. The 2-day fixture matches R04 objective placement and preserves 37 actual weekly sets. Public integration tests are weaker independent oracles: their declarations copy calendar and runRequirement from generated output and derive requirements through defineWeeklyRequirements. They provide integration evidence but cannot alone expose correlated missing-calendar/run-target defects. This is a limitation, not a rejection of the literal fixture.

Reproduction from isolated app directory:
`npx vitest run src/lib/training/__tests__/weeklyProgrammeValidator.test.ts src/lib/training/__tests__/r05-independent-probe.test.ts --reporter=verbose`
`npx vitest run src/lib/training/__tests__/r05-independent-probe.test.ts --reporter=verbose`

Temporary untracked probe: app/src/lib/training/__tests__/r05-independent-probe.test.ts. It reuses the literal fixture prefix and adds six independently selected mutations; no production edits. Logs: model-probes-final.txt and model-probes-only.txt. Probe stdout demonstrates five failing expectations (two throws, three false-valid) and one passing rejection. Runner also emitted thread/startup timeout metadata; do not report this invocation as a clean completed harness. A final isolated rerun after corrections is required. Full AGENTS harness was not repeated by this reviewer.
