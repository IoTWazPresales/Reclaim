# R02 provenance review stopped - 2026-10-18

Exact source checkpoint: `cda17e7c3326272325b2a6b67bb805cbc7481ae2`.
Scope: R02 provenance only, branch `fix/training-confident-ux`.

## Finding and stop decision

The separate fresh-context reviewer found a concrete introduced source defect
and withheld source acceptance. The normal running preview fallback says
"pace and duration are not prescribed" (`OutcomePreviewPanel.tsx:41`), while
the committed running engine explicitly assigns `runTargetMinutes(weekIndex)`
to both time budget and estimated duration (`engine/index.ts:1784,1791`).
The setup screen's distance-scoped qualification does not appear in this
fallback. This is a MINOR copy correctness defect, substantive to accurate
preview behavior under the R02 contract. The primary agent independently
confirmed the source references. No source repair was attempted.

Per the operator's explicit stop condition, no successful approval receipt,
supplemental evidence publication, ownership mutation or evidence registration
is attempted. **New published commits: none. Actual evidence ID: none.**
N-0070 remains in progress with acceptance pending; no other recovery task or
R12 was started. The original review and scientific policies are preserved.

## Reconstruction and separate review

[reconstruction.json](reconstruction.json) identifies all ten changed R02 app
source/test files from the commit's parent diff, their Git blob IDs, raw SHA-256
and byte counts. Those files in the detached checkout
`C:/Reclaim-R02-provenance-20261018` were written from raw Git object bytes and
checked for exact equality. The complete checkpoint otherwise comes from
`git worktree add --detach`. Both historical R02 artifact blobs are unchanged
at current HEAD; current filesystem representations match after LF normalization.
No historical receipt was rewritten or backdated.

[reviewer.md](reviewer.md) is the new dated receipt from
`/root/r02_committed_review`, started with `fork_turns=none`, separate from the
primary verifier and from implementation authorship. It independently derives
the ten source blob/hash pairs and follows surrounding committed call sites.
This is a separate fresh context using the same inherited model, not a
different-model or human review. It covers normalized inputs, both generation
paths, saved baseline repetitions, experience, preferences and stale-state
handlers. It withholds acceptance and records limits on UI/query timing and
persisted round trips. No runtime journey or live data was exercised.

## Independent repository verification

The primary agent reran checks separately from the reviewer against the exact
checkpoint. Existing `C:/Reclaim/app/node_modules` is shared by junction;
dependencies were not freshly installed. The checkpoint lock hash is recorded.

- Focused actual setup/preview, experience and mode: exit 0, **31/31**
  ([focused.txt](focused.txt)).
- Typecheck: exit 0, **0 errors** ([typecheck.txt](typecheck.txt)).
- Dual-path audit in Git Bash: exit 0, **31/31** ([dual-path.txt](dual-path.txt)).
- Catalogue QA: exit 0, **357 rows**, no governance issues
  ([catalogue.txt](catalogue.txt)).
- Public wrapper harness in the canonical checkout: exit 0, **3 passed**
  ([wrapper.txt](wrapper.txt)).

Typecheck and the full verbose suite were already running when the finding
arrived. Typecheck finished successfully. The full verbose suite continued
producing output but remained incomplete; its dedicated `cmd.exe` process
52384 and child process tree were explicitly terminated to honor the source
defect stop condition (command identity checked before termination). Process
exit was 1 after termination, **not a completed suite result**.
[full-vitest.txt](full-vitest.txt) is partial evidence only. It includes
`routineVolumeMeasurement` and `runSession` failures matching assertions
documented in R01 isolation; no final count, complete baseline comparison or
no-regression conclusion is claimed. No baseline repair or retry was attempted.

Final [integrity.json](integrity.json) confirms every independently reviewed
source/dependency blob/hash pair, all ten exact isolated source bytes, historical
artifact filesystem bytes and pre-existing dirty files. Receipt and logs remain
local and uncommitted because the required source verification did not pass.
The local PROGRESS resume entry/node row and add-only CONTEXT heading record
the stop for the next operator; they are not acceptance or publication evidence.

## Ownership

Read-only public operation
`python scripts/eif_node.py --run R20261018R02PROVENANCE status --node N-0070`
succeeded at programme revision 557, node revision 5: owner
`R20261016EVIDRECOVERYA`, expired `2026-10-16T16:31:23Z`, status `in_progress`,
acceptance pending. This is the expected historical expired lease, not an
unexpected ownership conflict. Because source verification failed first, no
release, acquire, evidence, accept or complete operation was issued. No ID is
inferred or reserved. Future work must recheck ownership and separately resolve
the source defect before seeking a passing review.
