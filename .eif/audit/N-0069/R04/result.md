# R04 weekly allocation source checkpoint — 2026-10-14

Scope: **R04 only**, branch `fix/training-confident-ux`, starting HEAD
`59b6221` (full hash in `source-manifest.json`). R03 dependency is the pushed
`db41b34` eligibility contract. No R05 or another recovery task was started.

## Implemented contract

`weekly-20261014-v2` declares named weekly objectives from the accepted balanced
policy before calendar allocation or candidate selection. Objectives carry
explicit scheduling owners, dose, target sets, required exposures, accepted
placement positions and provenance. Calendar omission or equipment failure
cannot reduce those requirements. Stable day and weekly strategy identifiers
replace display-label policy selection for new programmes. All 109 exposure
positions and 85 objective owners match the committed accepted policy.

The compiler allocates declared objectives to selected days, evaluates candidates
using committed R03 eligibility with slot context, and uses per-day bipartite
matching to preserve scarce candidates. It reports missing exposure days,
unavailable slots, unmet objectives, malformed prescriptions, unsupported
strategies and accepted session-budget conflicts explicitly. It does not call
or modify the uncommitted R05 whole-programme validator.

The engine materializes an allocation without adding, trimming or recomputing
doses. Each exercise trace names the policy version and weekly requirement.
Missing saved exercises and changed eligibility remain explicit failures.
Preview receives that same allocation through the existing product wrapper.
This is minimal adapter transport; R09 UI/persistence projections are not
implemented here.

Running retains RD-004/RD-006 placement and numeric schedule; the compilation
records required run exposures. Hybrid 2/3-day missing authorized run placement
is infeasible with D-P2-03 provenance. No replacement pairing policy is invented.
Once-frequency/fat/fitter legacy prescriptions retain their accepted behavior
and a `legacy_pending_review` policy flag. Historical days lacking allocation
retain explicitly flagged legacy label routing and accepted doses, now with
shared eligibility and missing-candidate diagnostics. The entered-lift rack
exception stays balanced-only, with R03 provenance; D-P2-06 remains pending.

Four-week outputs are cloned to avoid mutations leaking across weeks. Existing
started/guided snapshot guards, session history, completion and persistence
authority are unchanged. There is no migration, live-data operation, deployment,
new science rule or production UI change.

## Evidence and verification

- Focused final mixed check: **79/79 pass**, six files (`focused.txt`).
- Final isolated scoped check: **83/83 pass**, seven files (`isolated-focused-final.txt`), including the legacy carry guard.
- Final independent reviewer rerun: **83/83 pass**, seven files (`reviewer-focused-final.txt`), from the exact isolated candidate.
- Typecheck: exit 0, both mixed and isolated (`typecheck.txt`, `isolated-typecheck.txt`).
- Dual-path: **31/31 pass**, both mixed and isolated (Git Bash logs).
- Medication QA: **357 rows, 0 governance issues**, exit 0 (`catalogue.txt`).
- Wrapper pytest: **1 passed / 2 failed**, both from existing public ledger replay failure (`wrapper.txt`).
- Final exact isolated full suite: **1138 passed / 4 failed**, 187 files, exit 1 (`isolated-scoped-full.txt`). Exactly the four documented committed-baseline failures, no new scoped regression.
- Final mixed full suite: **1143 passed / 4 failed**, 188 files, exit 1 (`full-vitest-final.txt`). All four are in R03's earlier six-failure mixed set. Existing migration work removes the isolated migration failure; existing generic-selector integration retains the carry failure. Historical balanced and Wednesday-shape cases now pass.

The isolated failures are `routineVolumeMeasurement` seed count (31 versus 18),
`runSession` migration link (uuid versus expected text), and the two
`weeklyVolumeModel` cap assertions (15 versus 10 and 6 versus 2). Mixed failures
replace the migration assertion with the preexisting `smallMuscleVolume` carry
assertion. This is the same baseline classification recorded by R01/R02/R03,
not an unqualified full-suite pass. Superseded isolated attempts that included
the preexisting generic-selector integration had five failures. Excluding that
unrelated integration restores the exact four-failure committed baseline; the
final focused legacy carry guard passes. No test timeout was shortened.

Review: [independent-review.md](independent-review.md),
**VERIFIED_WITH_LIMITATIONS**. A separate delegated same-model reviewer inspected
the exact isolated patch and re-executed focused checks; this is not a different
model or fresh-context review. R05 independent programme validation and Android/
live DB acceptance are not claimed.

`plans.json.gz` contains 45 complete real-planner/session fixtures across 2–6
days, strength/running/hybrid, rich/floor/dumbbell equipment, and weeks 1–4,
including every unmet reason. `source-manifest.json` records SHA256 for the exact
13 scoped source/test files, objective policy, compressed and uncompressed
fixture data. Fixture data is synthetic. Decompress with Python's `gzip` library.

## Isolation and preservation

Exact candidate checkout: `C:/Reclaim-R04-verify-20261014`, detached at the
starting HEAD, using a junction to existing dependencies. It contains only the
13 listed R04 source/test files. Source staging uses explicit file paths and
the reviewed isolated bytes. The mixed worktree's starting generic-selector
eligibility integration is excluded because it changes accepted legacy output;
its additional carry test failure was reproduced and disappears when the
committed generic selector is retained. That integration is preserved unstaged.
The mixed worktree's unrelated R06 progression
call/performance fields and R09 allocation resolver remain unstaged, alongside
its other UI/API/progression/migration/audit/ledger edits. R05 validator remains
untracked and unchanged. Generated EIF views and runtime internals were not
edited or bypassed. Test-generated volume documentation is excluded.

## EIF blocker and authorized transition attempts

Run: `R20261014R04`. Public `status --node N-0069` still fails at replay with
`LEASE_NOT_OWNER: R20261014R03`. Public help describes the lease release/acquire
operations but supplies no usable repair/replay transition. The documented
owner-release/new-acquire sequence was attempted only through the wrapper:

```text
python scripts/eif_node.py --run R20261013P2 release N-0069
python scripts/eif_node.py --run R20261014R04 lease N-0069
python scripts/eif_node.py --run R20261014R04 status --node N-0069
```

All fail on their preliminary status query before an event can be appended;
see `lease-transition.txt`. No new lease ownership or current node revision
can be asserted. Stale generated views are not proof of ownership. R03's
evidence attachment remains blocked by the same previously recorded release
sequence 541. No runtime internals, historical event repair, raw event bypass,
false acceptance or completion was attempted.

Required next governance step: an explicitly authorized documented public
repair/replay procedure must first restore readable ledger status; then release
under the actual owner and acquire under the intended run through the wrapper.
Only afterward attach pushed R03 and R04 evidence. No such working public
transition was available in this task. This is a source checkpoint, **not a
validated EIF node**. N-0069 remains open for acceptance and R05; its current
lease is unreadable. Stop after R04.

This commit is the scoped R04 source/evidence checkpoint. Full-suite and EIF
node gates remain failing for the documented baseline/replay reasons; no waiver
or node completion is asserted. The pushed source SHA and actual evidence
attachment attempt are recorded in the subsequent durability receipt.

Current Android runtime/rendering is **UNABLE_TO_VERIFY**: bounded ADB device
listing was empty and Metro localhost status was unreachable. See
`android-check.md`, `human-check-registration.txt`, and `docs/eif/HUMAN_CHECKS.md`.
Human-check registration also fails before mutation on the same replay error;
no queue event or visual approval is claimed.


## Pushed source receipt and actual attachment attempt

Source checkpoint: **`b40fa80f32a2b035f830d3e563055b93c083137a`**, pushed to
`origin/fix/training-confident-ux`. `git ls-remote` confirmed that exact full
hash. Only 13 explicitly scoped source/test files and R04 evidence/resume files
were checkpointed. Unrelated work remains in the worktree.

Actual public evidence attachment after push exited **1** on preliminary status
with `LEASE_NOT_OWNER: R20261014R03`. The committed command, exit code, output
and source SHA are in `evidence-attachment.json`. No evidence ID was issued.
Replay that exact attachment after a separately authorized documented public
repair and owner-release/new-acquire transition restores readable status. R03's
pushed `db41b34` evidence remains pending too. No node acceptance, human-check
queue event, lease ownership or completion is claimed. Stop after R04.
