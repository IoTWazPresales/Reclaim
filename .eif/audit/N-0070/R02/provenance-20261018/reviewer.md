# R02 committed-source independent review ? 2026-10-18

- Source commit: `cda17e7c3326272325b2a6b67bb805cbc7481ae2` (parent diff defines the R02 source slice).
- Reviewed checkout: `C:/Reclaim-R02-provenance-20261018`; HEAD independently checked against the source commit.
- Reviewer: separate agent `/root/r02_committed_review`, fresh review context, same inherited model as the parent (no claim of a different model or human reviewer). The implementation was not authored by this reviewer. Parent supplied the review scope and target commit. No previous receipt conclusion was used.
- Authority/scope: independent source review only; no app edits, no live programme save, no EIF operations, no policy changes. Read canonical AGENTS.md and implementation-reviewer SKILL.md plus its contract; inspected checkpoint task brief, CONTEXT and generated CURRENT/WORK_ITEM context. PROJECT_MANIFEST.md was not found at the expected .eif location.

## Result: concrete defect; source acceptance withheld

**MINOR ? Running outcome preview incorrectly says duration is not prescribed (substantive source defect for this provenance stop condition).**

At `app/src/components/training/OutcomePreviewPanel.tsx:41`, the new fallback sentence says: ?Your distance goal is saved; pace and duration are not prescribed.? It is displayed when `generatePreview` returns null and the raw mode is running with at least one selected weekday. This is the normal running path: `computePreviewSummary` (`preview/index.ts:87`) rejects an empty exercise array, while the running session builder deliberately returns an empty array of lifting exercises. The committed run branch in `app/src/lib/training/engine/index.ts:1773` prescribes `runTargetMinutes(weekIndex)` as both `constraints.timeBudgetMinutes` and `estimatedDurationMinutes` (lines 1784 and 1791).

The sentence's second clause states that duration is not prescribed; it does not explicitly limit that claim to the distance-goal input. Contrast the correctly scoped setup sentence, ?Distance goal is saved to your profile. It does not set a pace or session duration.? Therefore the preview's new message can misdescribe a valid generated run plan. This is user-visible behavioral copy, not a style preference. Review acceptance is withheld rather than certifying preview correctness. Parent notified immediately; no fix attempted and further execution probes stopped.

## Method and observations

Read every R02 changed application/test diff against the exact parent, then the shared adapter, preview module, complete panel, setup state/draft construction, hydration, save mutation, skip-baseline handler, and touched tests. Followed surrounding mapping/formula helpers, planner input handling, canonical session wrapper, run and strength engine branches, and TrainingScreen's persisted-snapshot/session build call sites. Inspected API/profile and programme snapshot types around changes. Surrounding files were reviewed at relevant call sites, not audited in full.

The shared `prepareTrainingSetup` boundary is actually used by both preview and confirmation. The same draft includes entered reps, experience, preferences, mode and running metadata. Epley baseline values come from the existing formula; positive entered weight/reps are retained in constraints JSON for profile reopening and at snapshot top level for programme persistence. Skip baselines passes an explicitly cleared draft, avoiding reliance on asynchronous React setters. Confirmation passes the draft as mutation variables rather than reading baseline state after clearing it. New snapshots include preference fields formerly dropped. These source observations do not constitute a clean approval after the defect above.

Tests call the real shared serialization adapter and compare generated proposals for beginner/advanced, non-five reps, restrictions, frequency fallback, running and hybrid. They do not mount the real React screen or intercept the real save mutation. Thus they cannot independently establish UI event timing, hydration/refetch behavior, persisted DB round-trip, or the visible fallback text. Existing hydration can rerun on query-data replacement; no new guarantee against all stale-query/user-edit races is established by R02. No runtime/UI/AVD review or live database action was performed. No claim is made about historical sessions, full-suite passage, numerical/science-policy approval, or later recovery tasks. Required checks are independently owned by the parent; this receipt does not borrow their outcome. No new test command was run by this reviewer before the stop condition.

## Exact committed bytes

Git object IDs below were obtained with `git rev-parse <commit>:<path>` and independently recomputed as SHA-1 over `blob <byte-length>\0<content>`. SHA-256 is over raw `git show <commit>:<path>` bytes; no PowerShell decoding/newline normalization was used. First ten rows are all changed R02 app source/tests; remaining rows identify task and surrounding source inspected.

| Committed file | Git blob SHA-1 | Raw content SHA-256 |
|---|---|---|
| `app/src/components/training/OutcomePreviewPanel.tsx` | `c91c248718f53439bcf072f0896c832503032bbe` | `7bc431198f21ba77b8049d6565064b65eb27bf8b81545aabb31e8434c022c169` |
| `app/src/lib/api.ts` | `de522d6d11fb37ba092bfb27ea97a82123ed41b7` | `7af353f11bdca25b33b46b5dbe0effdebee1373c9b5fd7079648d98fda8cb446` |
| `app/src/lib/training/__tests__/experienceLevelLoads.test.ts` | `6e556ac14b653123f426856bdc6bfa56a9e0c243` | `ad655ca39fa48f7148f61b4b5b7ad027427249e6eaa9da96269655dec2811d1a` |
| `app/src/lib/training/__tests__/trainingMode.test.ts` | `2484eecb7eec011f55f7c4dc3a2ffb957a748e71` | `6a74bf6acae64f83d07d8c5b83b1e18be31c44e091a5434f04a67455a150d383` |
| `app/src/lib/training/preview/__tests__/preview.test.ts` | `4831a7253f625285fc31f5d8ba9a16b91757d9f1` | `5e5327b90a429a1ecac2d918f333998aaf867af4a3533d131745d6e89f53d5fc` |
| `app/src/lib/training/preview/__tests__/setupContract.test.ts` | `9691118f6c1828f92404272db9f5e29b748fec9b` | `618a97cc7fd6080304e5bb7eb6ee8df682529ecd08afe0552f6218f3755ca4b1` |
| `app/src/lib/training/preview/index.ts` | `82df0c665688ef6c01487724521795cfa500a431` | `560b8951e9eee7b196481a0e931fbe9c30fffc8796b880d3d8345659eda567bd` |
| `app/src/lib/training/setupDraft.ts` | `aeac9a56bf67093d024209df3a468d78d4d7def0` | `0ebd705a74e8221eff1f17da0076825a4b8dc17f56106542ea3c3d217eaa526c` |
| `app/src/lib/training/types.ts` | `56098f4d7901ea70aa3ddc00e5a930b4ef97bde2` | `8f6e2492e9191e3295d35d7f5792e500e81b402be758a9ff3e69e14e50018502` |
| `app/src/screens/training/TrainingSetupScreen.tsx` | `edd459e1bd1e21317c8d5edcb4c37de143f0dddc` | `c1a901116cc2c133ab3c567c2d07d4df92bcdf9831f8d852c724bf3a47baaaba` |
| `docs/training/recovery/tasks/R02-setup-contract.md` | `124ffce08847f6b81ea4af2ffa83c9a83aed2815` | `c40aa7a64bb44500058524dc89edac782e567c32cd71d5375759dc143161171c` |
| `app/src/lib/training/setupMappings.ts` | `f626e149b5b3ec562c192f8434b177f862922edc` | `c62699718f883a3012a2dc6f8a08c3afffc5712262544b10c15f73d27ca0a20f` |
| `app/src/lib/training/experienceLevel.ts` | `8c0ca354847b22da3ae2f26093613adee5ab2b20` | `8fdf3e64253f64200d03e0d7d97b848e67ce15e92f0ee8bbecda9def1ee78051` |
| `app/src/lib/training/progression.ts` | `baddbfc94639d72662f662d1f4f23d754585ddc2` | `73d930f63636c03be040d6fd8cacceeedb2d01c8f93326bb8a635c2feb8203cd` |
| `app/src/lib/training/trainingMode.ts` | `6c3a79f92fe52372d7c149e7520cb8d50b201530` | `4f9b4346dcc598dadbf8838ea01d645299a88078bed37d30066a7fff43d55e40` |
| `app/src/lib/training/programPlanner.ts` | `a56cf098a6a232ab10cc063ba5ef78bada0dc749` | `9bcabb42526e9eb87d690f7019745104de8122a1d72ba865c76da494daad085c` |
| `app/src/lib/training/buildProgramDaySession.ts` | `d26c633be38c2c74ef14b4a9074ba8c87c375d90` | `346118b69e9359095482f10964348d799789865bfc3984cf370784bc2f576b89` |
| `app/src/lib/training/engine/index.ts` | `61138f7904c7015d464de8181cd0d635fa4bb8e8` | `3265ec57c1927320b84badabccb5e6ec8d951f7bd65ee1006fe5ff860837f397` |
| `app/src/screens/TrainingScreen.tsx` | `eb5e46743bd3a1c9406ad6f2a899fec09fb1e149` | `61728f6d6ecb26557d37d22599ceb0e609e905dea3933efe6aef734c87eeccf8` |
