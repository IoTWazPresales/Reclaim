# R01 local controls — 2026-10-14

Status: scoped R01 source checkpoint `c4863c401c5c71e4d379901b1534b700f213a0ad`
is pushed; N-0068 remains open. No R02 or other task began.
Executor: Codex `/root`, working session R20261014R01; ledger owner retained as
`R20261013P2`. Baseline HEAD: `18d21abd86cf01433c82dcc7516bac91c677f155`.
Branch verified: `fix/training-confident-ux`. Remote tip was independently
checked at the checkpoint SHA. The failed full-suite gate is disclosed; this
document is working evidence, not node completion.

## Changes and independent challenge

Resumed the existing uncommitted wrapper implementation. Added rejection of
pending scope in read-only completion checks, untracked source in reviewed paths,
changed waiver/visible approval bytes through hashed references, and structurally
circular criterion/journey evidence pointing to packet or reviewer artifacts.
The independent `/root/r01_review` session reproduced the untracked-source and
waiver-replacement bypasses before the fixes, then added adversarial regression
tests. A subsequent exact-ID waiver schema fix rejects string/substring authority and has a negative regression. See R01-independent-review.md for exact input hashes, execution and limits.
Same-model session separation is not a separate-model review.

Scope acceptance is still pending. The earlier N0068-scope.json explicitly says
its criteria are agent-authored decomposition under a general implementation
grant, not individually reviewed operator criteria. It was not converted into
node acceptance or a completion approval. No criterion was waived.

## Required checks

| Check | Actual result |
|---|---|
| Initial combined Python wrapper suite | 41 passed in 182.90 seconds; before final adversarial additions |
| Final independent combined wrapper suite | 56 passed in 246.66 seconds; final waiver delta separately verified: 3 passed / 40 deselected in 43.18 seconds |
| `npm run typecheck` | FAIL, exit 1: TrainingSetupScreen.tsx:939:43, TS2304 undefined estimate1RM |
| `npm test -- --reporter=verbose` | FAIL, exit 1: 1082 passed, 8 failed; 178 passed files, 7 failed files; 245.24 seconds |
| Git Bash `npm run audit:training-dual-paths` | PASS, 31 passed / 0 failed |
| `npm run med-catalog-qa` | PASS, 357 rows, zero governance issues, 1 test passed |
| Scoped `git diff --check` | PASS for wrapper, tests and controls |
| Repository `git diff --check` | FAIL on pre-existing unrelated whitespace and generated EIF WORK_ITEM Markdown hard breaks |
| Public status/help | PASS; node JSON and public event help readable |
| Public check-completion | Expected refusal, exit 2: scope acceptance pending; see R01-completion-check.txt |
| Isolated R01 checkout typecheck | PASS, exit 0; committed app source plus R01 files |
| Isolated R01 checkout full verbose suite | FAIL, exit 1: 1081 passed / 4 failed; all four occur with committed app source |

The eight app failures are balancedHypertrophy (missing overhead_press),
experienceLevelLoads (profile snapshot assertion), routineVolumeMeasurement
(31 seed IDs versus expected 18), smallMuscleVolume (missing carry),
wednesdayPushShape (missing overhead_press), weeklyVolumeModel (isolation cap
and tighter rebuild cap), and preview equivalence (16 versus 19 sets).
These files already contained unrelated recovery work before R01. R01 changes
only Python controls/tests and documentation; no training fixes were attempted.
`R01-isolation.md` records the clean-checkout comparison. The `estimate1RM`
error comes from uncommitted Phase 2 training changes. The working-tree eight
test failures include three committed-baseline failures and five additional
training failures. The committed baseline also has a fourth run-session
migration failure that the uncommitted migration fixes. R01 caused none of
these failures. The required full app suite remains red.
The full suite regenerated ROUTINE_VOLUME_BASELINE.md; it was clean at entry
and was restored to HEAD after the suite. All original unrelated changes remain.

## EIF and durability

Before editing, status showed revision 535, N-0068 revision 2, in_progress,
acceptance pending, with lease expired on 2026-10-13. `lease` reported the old
lease without renewal. Public `release` then `lease` renewed it, yielding node
revision 4 and programme revision 537; no ledger file was hand-edited.

No `accept`, `evidence` or `complete` mutation was issued. A stage
note records the blocker through the wrapper (programme revision 538, node revision 5); PROGRESS contains its mutation log.
Generated views and ledger changes are wrapper outputs, not manually authored.
After the scoped checkpoint push, a second wrapper stage note recorded that
push without changing the node's acceptance or completion state.

Remaining completion blockers: required full-suite failures even in the
isolated R01 checkout; pending scope acceptance; no review of a pushed R01
implementation commit or committed criterion-level completion packet.
The working criterion packet records these gaps explicitly. Resume only R01
when these gates can be satisfied; do not bypass them or start another task.

The wrapper enforces local structural evidence checks. It cannot authenticate
operator identity, independently prove arbitrary evidence prose, or constrain
direct runtime invocation. Hooks remain off; shared EIF and production data were
not modified.
