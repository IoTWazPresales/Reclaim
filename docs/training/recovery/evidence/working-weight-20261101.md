# Working weight versus Epley ceiling - 2026-11-01

Source baseline: `b693b0dc28e527f054118e73ff48f84cb9f04aec`, branch
`fix/training-confident-ux`. Scope: new-build prescription correction, separate
source review, complete source gates, commit/push, then the same local release
APK recipe as the 1 November standalone build. No install or live operations.

## Finding and correction

The previous shared `suggestLoading` resolver used the target-rep Epley ceiling
as the baseline working weight and capped qualified-history progression at that
same value. Its ceiling helper rounded nearest, sometimes above raw capacity.
An independent isolated baseline-source probe reproduces shrugs 20 kg x 7
qualified history -> **17 kg x 13**. The corrected source gives **16 kg x 13**.
[Before/current source probe](../../../../.eif/audit/N-0070/working-weight-review-20261101/baseline-comparison.json).

New-build rep-based working limit is `oneRM / (1 + (targetReps + 2) / 30)`,
rounded down to the exercise's existing increment. This applies the
[ROUTINE_AUDIT RPE 8 and 9 October ceiling rules](../../ROUTINE_AUDIT.md).
D-P2-01's newer qualified evidence / newer entered baseline precedence stays in
force; no baseline is overwritten. Existing progression or deload proposals
below this limit remain below it. No ratios, defaults, or load constants added.
The cited existing squat-variation ratio uses the same RPE 8 inversion.

Descriptions separate the floor-rounded target-rep ceiling, RPE 8 working
limit, and final applied working weight. They attribute additional reductions
to the actual load adjustment. Non-rep defaults and historical v1 helper/replay
retain prior behavior. A valid below-step result is zero/confirmation and
cannot fall through to a population load.

## Path inventory and preservation

| Path | Authority and verification |
| --- | --- |
| Own baseline | `suggestLoading` -> shared RPE 8 limiter, step floor; unit matrix |
| Qualified history | Existing qualification and `governingLoadEvidence` -> same limiter; history remains immutable |
| Same-unit anchor | `anchoredWorkingKg`; scaled squat evidence; tiny-load and cross-unit tests |
| Allocated / programme | `buildProgramDaySession` -> allocated loading closure -> `suggestLoading`; all five days compared |
| Substitution | Explicit `prescribeReplacement` -> same resolver for replacement's own evidence; adapter now preserves baseline edit timestamps |
| Preview / saved / new start | Preview and saved JSON plan agree with canonical day wrapper and materialized planned sets |
| Started / guided / frozen | `plannedItemsForSession` and `frozenSessionProjection` retain stored rows even when current proposals differ |
| Default / bodyweight / distance / time | Existing population units and confirmation behavior retained; no rep-reserve conversion of distance/time |

No session persistence, completion, notification/FGS workflow, schema or native
project changes. Preview/save/start checks use synthetic in-memory rows and JSON
reload; they are source verification, not an Android journey or live database
write. Visible explanation changes have no device visual acceptance in this
task. EIF acceptance/ledger transitions were neither requested nor performed.

## Operator data note

On **2026-11-01**, the operator reports deleting session
`training_1790871926289_4tsky2d`, the 1 October RA-016 test session containing
70 kg per-dumbbell shoulder press/front raises. The operator verified
**5 sessions and 18 set logs remain**. This is operator-supplied evidence;
this task did not query, modify or independently reverify live data.

## Separate review and gates

[Separate source review](working-weight-review-20261101.md).
Final complete coverage: **1531 tests / 208 files / zero failures** using the
permitted sharded fallback and complete file replays. Focused **119/119 across
7 files**, plus final allocation **21/21**; separate reviewer **25/25**, final
typecheck exit 0; Git Bash dual-path **31/31**; catalogue **357 rows / 0 issues**.
[Machine-readable coverage inventory, attempts and local log hashes](../../../../.eif/audit/N-0070/working-weight-20261101/gate-results.json).

The unsharded runner stalled after its first file; forks shard 1 twice failed
with `ERR_IPC_CHANNEL_CLOSED`, and a thread retry was incomplete when stopped.
No such attempt is counted as passing. Shards 2/3 completed 376/507 tests;
shard 4 initially completed 326 pass / 1 fail because its squat fixture expected
the old ceiling95 instead of RPE8 working85. The exact final formula was
independently reviewed and all21 tests in that file pass on replay. Every one
of the remaining52 files completed in four explicit13-file batches
(107/74/70/70 tests). Inventory union is exactly all208 discovered test files;
no test was excluded and the configured30-second test budget was unchanged.

## Release build

Built after validated source commit `bd69229f92276663861c426f46b75953db6653b7` was pushed. Same command as the
1 November build: `app/android/gradlew.bat :app:assembleRelease
-PreactNativeArchitectures=x86_64 --max-workers=2 --console=plain`, with
`NODE_ENV=production` and `SENTRY_DISABLE_AUTO_UPLOAD=true`. Existing native
projects retained; no prebuild, regeneration or installation.


**BUILD SUCCESSFUL**, Gradle exit 0, **7m 47s**, 1228 tasks (34 executed,
1194 up-to-date). Artifact `releases/reclaim-1.0.5-vc15-working-weight-bd69229-x86_64.apk`
(121254168 bytes), copied byte-identically from the fresh Gradle release output.
SHA-256: `7407978a5afd3d35b52134ebf934626bdf6e34427202386d32531084c674cf0a`.
Package `com.fissioncorporation.reclaim`, **1.0.5 / vc15**, **x86_64**;
no debuggable marker. APK v2 signature verifies (one signer); ZIP integrity
passes. Embedded bundle8128296 bytes contains the new ceiling, RPE8 limit and
applied-working-weight text. Product/native/package sources have no diff from
the source commit. Existing local release signing/configuration retained.
This is the same local x86_64 recipe, not a store submission or ARM build.
[Machine-readable release receipt](../../../../.eif/audit/N-0070/working-weight-20261101/release-build.json).

Additional repository wrapper smoke: **3/3 passed**, exit0, status/read-only and
dry-run commands only; no ledger acceptance. Raw build/test logs and the APK
remain local. Final documentation commit records these receipts; it does not
change the application source used to build the APK. **Stopped after the build
and its receipt. No installation, native regeneration, live data write,
migration or EIF acceptance.**
