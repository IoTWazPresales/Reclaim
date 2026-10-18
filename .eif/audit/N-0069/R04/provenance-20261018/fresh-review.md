# Fresh R04 source review - 2026-10-18

## Outcome and authority

No substantive source defect was established in this bounded review of the exact thirteen R04 source/test files. This receipt provides a new independently inspected source fingerprint; it does not certify the historical review, accept N-0069, approve scientific policy, or establish production/runtime completion.

Project: Reclaim, `C:/Reclaim`. Authority: read-only implementation review with an explicit grant to create only this receipt and `reviewer-blobs.json` in the dated provenance directory. No product edits, historical receipt edits, ledger mutations, staging, commits or publication were performed by this reviewer.

## Reviewer separation

Reviewer: separate delegated agent session `/root/r04_fresh_review`, using the same underlying model as the coordinating agent. The reviewer received the bounded task and project instructions in a fresh task context, independently inspected Git source/diffs and contracts, and authored neither the original implementation nor its historical review. This is process/context separation within one assistant team, not an independent human or different-model opinion. The coordinating agent's test execution is separate and is not claimed as this reviewer's own test result. No conclusions from the historical independent-review receipt were used to decide this review.

## Immutable source identity

- Source checkpoint: `b40fa80f32a2b035f830d3e563055b93c083137a`.
- Verified direct parent: `59b6221958d30630c757c1ab055b6443b5777a08`, obtained with `git rev-parse <checkpoint>^`.
- Scope list: the thirteen entries under `sources` in the checkpoint's `.eif/audit/N-0069/R04/source-manifest.json`.
- Inspection used immutable `git show <checkpoint>:<path>` and `git diff <parent> <checkpoint> -- app/src/lib/training` rather than the later mixed working tree.
- Each reviewed path's exact Git object ID, SHA256 of immutable blob payload and byte length was independently calculated using Git subprocess byte output and Python SHA256. All thirteen match the committed manifest. All thirteen exact reconstructed checkout files at `C:/Reclaim-R04-provenance-20261018` match those Git bytes.
- Exact identities are in adjacent `reviewer-blobs.json`; no line-ending normalization is hidden in its SHA256 convention.

For `balancedHypertrophy.ts`, Git blob `2066af768343ad48d003037ad8fb153e81e3151c` has SHA256 `ff18e2d81c50adc8fc7a0e7868951e7accfbe482671552e7593b44ae2126e35f` (15,811 bytes). Independently calculated alternative byte hashes: CRLF rendering `b211622fd36931d4ad7fc6661ce9e0bdf70c44171ae728e10fa6808cd7730788`; that rendering plus one trailing CRLF `81d1982368d4ffdb6d043146fb81dd4e79dbd979a513b7239dc09f7854a08818`. These reproduce byte variants, but do not prove which bytes a historical reviewer actually inspected. This fresh review binds explicitly to the immutable Git payload above.

## Inspection coverage and observations

All changed hunks for all thirteen files were inspected, together with complete new compiler/policy/type/materializer modules, the balanced policy and compatibility path, the program-day wrapper and frozen snapshot helpers, planner/caller context, preview projection and the added tests. The complete engine file was not line-by-line audited; review covered its changed program-day construction path and relevant loading/fallback calls. Unchanged unrelated engine internals are outside this review.

| Reviewed files | Source observations |
| --- | --- |
| `balancedHypertrophy.ts` | Exposes existing caps and dose/slot definitions; legacy balanced selection now calls shared R03 eligibility with explicit slot intent and rack exception. Historical cap trimming has diagnostics; historical candidate omissions become errors. Numerical goal blending, set/repetition/rest calculation, own-history/load handling and warm-up policy remain as before in inspected changes. |
| `weeklyProgrammePolicy.ts`, `weeklyProgrammeTypes.ts` | Separate versioned objective table and allocation types; requirement positions, exposures, sets and provenance are explicit. Ownership is documented as scheduling ownership rather than complete muscle-stimulus accounting. |
| `weeklyProgramme.ts` | `defineWeeklyRequirements` reads objective policy and goal blend before catalogue/candidate selection. Missing calendar exposures do not reduce declared targets. Actual allocation filters R03 hard eligibility and slot compatibility, then uses augmenting-path matching for distinct exercise assignments within a day. Explicit unmet, unavailable, invalid-dose and budget issues lead to infeasibility; required dose is not silently trimmed. |
| `allocatedProgramSession.ts` | Materializes saved allocation rather than selecting a new dose. Checks policy/strategy, prescription values, candidate identity and current hard eligibility; retains slot dose and exercise-specific loading policy. Error diagnostics remain visible in `programmeValidation`. |
| `programPlanner.ts`, `types.ts` | Sole calendar writer adds stable strategy identities, compiles once and supplies allocation to each week. Deep JSON copies prevent week-to-week allocation aliasing. Existing split/run pairing policy is retained. |
| `buildProgramDaySession.ts`, `engine/index.ts` | Product wrapper remains the entry and engine remains implementation. Versioned balanced allocations use the materializer; historical days without allocation retain compatibility behavior with a missing-weekly-context warning. Running preserves the established calendar-week minute policy. No completion authority or notification workflow was changed. |
| `preview/index.ts`, `preview/__tests__/preview.test.ts`, `preview/__tests__/setupContract.test.ts` | Preview and test construction pass the planner's allocation through the existing product wrapper. Label text does not select the new allocation's prescription. |
| `__tests__/weeklyProgrammeAllocation.test.ts` | Added coverage exercises 2-6-day real planner/session flows across weeks, missing exposure days, translated/duplicated labels, floor-only infeasibility, equipment/dislike/injury constraints, rack exception, caps, running/hybrid, legacy modes, frozen items and unavailable saved identities. |

Primary local contracts read: `AGENTS.md`; implementation-reviewer `SKILL.md` and `references/contract.md`; `.eif/PROJECT_MANIFEST.md`, `.eif/CURRENT.md`, `.eif/WORK_ITEM.md`, leading `CONTEXT.md` sections; R04 task and R03 eligibility contracts; `docs/eif/phase2-controls/DECISIONS_PENDING.md`; relevant `ROUTINE_AUDIT.md` balanced-week policy; Universal Specialist Contract, Evidence Decision Protocol and Intelligence Quality excerpts under the existing audit's `framework/upstream` directory. Generated current/work-item documents describe later programme state and were treated as context, not as authority for historical R04 acceptance. EIF runtime internals were not read or invoked.

## Reviewer-executed probe

An independent Node/esbuild in-memory probe imported the exact reconstructed `balancedHypertrophy.ts` and `weeklyProgrammePolicy.ts`. For each 2-6-day strategy it expanded every weekly objective position, rejected duplicate positions, and compared the complete slot record (candidate IDs, dose, intent, priority, compound estimate and load policy) against the corresponding historical balanced day policy. Result: **109/109 positions matched**, no duplicate or extra positions. Bundling used `write: false`; no probe source/output file was created.

Reproduction: from isolated `app/`, bundle both modules with installed esbuild into memory, enumerate strategy day keys from `weeklyProgramme.ts`, expand each objective's `[dayOrdinal, slotIndex]` positions, and require JSON equality with each historical day slot plus equal total position count. This confirms table transcription and preservation of policy inputs; it does not establish scientific adequacy or replace independent programme validation.

This reviewer did not rerun focused/full Vitest, typecheck, catalogue QA or the dual-path audit. The coordinating agent is performing bounded focused verification separately; consult that execution receipt for results. Existing tests were inspected as source evidence only.

## Findings, limitations and next boundary

No BLOCKER or MAJOR finding was established for the reviewed R04 implementation contract. No product fix is authorized by this provenance task.

- R04 compiler checks are not the independent R05 whole-programme validator. Arbitrary corrupted/tampered allocation consistency is not fully proven by these local checks. A green local materializer status alone is insufficient as programme acceptance evidence.
- R04 does not persist allocations through `generateProgramDays` or wire every saved-programme/UI path. The R04 task explicitly assigns persistence/projection to R09; this checkpoint must not be described as end-to-end saved-programme correctness. Historical no-allocation sessions deliberately retain the label-based compatibility route.
- Frozen-session protection is retained in unchanged `materializePlannedSessionItems` / `plannedItemsForSession` helpers and covered by the added source test. No real-device, live-DB reload, watch or guidance journey was executed by this reviewer; no render or runtime approval is claimed.
- D-P2-01 baseline ceiling, D-P2-02 running progression, D-P2-03 hybrid placement, D-P2-04 ownership/stimulus/population, D-P2-05 skip/fatigue, and D-P2-06 rack inference remain pending. Existing numbers/exception behavior remain policy inputs rather than newly validated scientific conclusions. Two/three-day balanced hybrid impossibility produces explicit errors rather than a newly invented run placement.
- Preferences and load evidence influence ranking/prescription; R03 eligibility alone does not prove slot quality, clinical suitability, whole-week coverage or unit-aware load validity. Existing policy candidates are intentionally retained by compatibility checks.
- Logical reviewer separation and exact fingerprints cannot retrospectively establish the original reviewer's inspected bytes. They provide a new source-bound review that can be assessed alongside the new verification evidence.

Confidence: high in exact source identity and the 109-position transcription result; medium in bounded source correctness because whole-programme independent validation and persisted/runtime behavior are outside this task. Any change to the thirteen blob IDs invalidates this source receipt for the changed files. No EIF evidence attachment, criterion acceptance, node completion, shipping approval or scientific decision is asserted.

## Exact reviewer probe command and observed output

Executed from `C:/Reclaim-R04-provenance-20261018/app` in PowerShell. The command imports the exact reconstructed checkpoint files, bundles in memory, compares every full slot object and asserts position uniqueness and cardinality. It creates no files.

```powershell
@'
const esbuild = require('C:/Reclaim/app/node_modules/esbuild');
const Module = require('module');
const result = esbuild.buildSync({stdin:{contents:`export { BALANCED_DAY_POLICIES } from './src/lib/training/balancedHypertrophy'; export { BALANCED_WEEKLY_OBJECTIVES } from './src/lib/training/weeklyProgrammePolicy'; export { buildFourWeekPlan } from './src/lib/training/programPlanner';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'cjs',write:false});
const m = new Module('fresh-review-probe', module); m.paths=module.paths; m._compile(result.outputFiles[0].text,'fresh-review-probe.cjs');
const {BALANCED_DAY_POLICIES:D,BALANCED_WEEKLY_OBJECTIVES:W,buildFourWeekPlan}=m.exports;
const keys={2:['twoA','twoB'],3:['threeA','threeB','threeC'],4:['fourUpperA','fourLowerA','fourUpperB','fourLowerB'],5:['fiveUpper','fiveSquat','fivePush','fivePull','fiveDead'],6:['sixPushA','sixPullA','sixLegsA','sixPushB','sixPullB','sixLegsB']};
let compared=0; for(const [n,days] of Object.entries(keys)) { const positions=new Map(); for(const req of W[n]) for(const [d,i] of req.positions) { const key=`${d}:${i}`; if(positions.has(key)) throw Error('duplicate '+key); positions.set(key,req.slot); } for(let d=0;d<days.length;d++) for(let i=0;i<D[days[d]].length;i++) {if(JSON.stringify(positions.get(`${d}:${i}`))!==JSON.stringify(D[days[d]][i])) throw Error('policy drift '+n+' '+d+' '+i);compared++;} if(positions.size!==days.reduce((sum,k)=>sum+D[k].length,0))throw Error('unexpected positions'); }
console.log(JSON.stringify({probe:'independent weekly objectives vs historical complete slot policies',compared,passed:true}));
'@ | node
```

Observed output (exit code 0):

```json
{"probe":"independent weekly objectives vs historical complete slot policies","compared":109,"passed":true}
```
