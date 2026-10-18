# R04 supplemental provenance checkpoint — 2026-10-18

Source: `b40fa80f32a2b035f830d3e563055b93c083137a`, parent
`59b6221958d30630c757c1ab055b6443b5777a08`. Branch:
`fix/training-confident-ux`. Scope is R04 provenance only. This receipt supplements
the unchanged original review, manifest and result; it does not backdate them.

## Exact reconstruction and fingerprint explanation

A new detached checkout at `C:/Reclaim-R04-provenance-20261018` reconstructs the
complete committed checkpoint. Its 13 scoped source/test files were explicitly
written from Git blobs, avoiding checkout conversion ambiguity. All 13 SHA-256
values match `source-manifest.json`'s `sources`; converting each LF blob to CRLF
reproduces all 13 `reviewedFilesystemHashes`. Full Git blob IDs, hashes, byte
counts and assertions are in [reconstruction.json](reconstruction.json).
The original review table fingerprints eleven files: ten equal the final CRLF
manifest exactly, and only the balanced file differs. The two preview test files
omitted from that historical table are included in the fresh thirteen-file review.
The exact comparison is in [historical-comparison.json](historical-comparison.json).

For `balancedHypertrophy.ts`, the committed 15,811-byte LF blob hashes to
`ff18e2d81c50adc8fc7a0e7868951e7accfbe482671552e7593b44ae2126e35f`.
CRLF conversion alone produces the manifest's
`b211622fd36931d4ad7fc6661ce9e0bdf70c44171ae728e10fa6808cd7730788`.
Appending **one additional CRLF** produces 16,144 bytes and exactly the original
review's `81d1982368d4ffdb6d043146fb81dd4e79dbd979a513b7239dc09f7854a08818`.
After line-ending normalization, that historical representation still has one
extra trailing LF (`25a9cc1dc0a9237025187e57adac95f77585a80315161ad5e753f57f1ed72668`).
Thus line endings alone do not explain the mismatch: the final file also lost
one trailing blank line. Removing trailing whitespace makes the content identical.
No executable token difference is needed to reproduce the historical fingerprint.

The surviving historical `R04/whitespace.py` reads both the mixed and isolated
`balancedHypertrophy.ts`, strips trailing whitespace and writes exactly one
terminal newline (`read_text(encoding='utf-8-sig').rstrip()+'\n'`). This corroborates
the final whitespace cleanup. Its hash is retained in the reconstruction receipt.
The old review fingerprint is exactly reconstructed, rather than a historical
source file recovered from immutable storage. Neither an execution timestamp for
that helper nor a claim about what the old reviewer observed beyond its recorded
fingerprint is inferred. The fresh review below removes dependence on that gap.

## Separate fresh review

[fresh-review.md](fresh-review.md) records a new source review by delegated agent
`/root/r04_fresh_review`, started with `fork_turns=none`: a fresh context, separate
execution and no authorship of the implementation or this reconstruction. It uses
the same model family; this is not a different-model or human review. The reviewer
independently inspects the complete committed 13-file change against its parent,
including balanced policy, weekly allocation, eligibility and scientific-policy
boundaries. [reviewer-blobs.json](reviewer-blobs.json) binds every reviewed file to
its exact Git blob and SHA-256. Findings and limitations belong to that receipt.

## Independent verification

The primary agent reran checks against the reconstructed checkpoint, separately
from both the original implementation and the new review. Existing dependencies
are provided through a junction to `C:/Reclaim/app/node_modules`; dependency
installation is not recreated. Repository timeouts remain unchanged.
The full suite regenerates `ROUTINE_VOLUME_BASELINE.md` inside the isolated
checkout; that test output is excluded from publication. With checkout conversion
disabled for comparison, the isolated application files retain the exact Git bytes.

- Focused seven-file Vitest command from the original final narrowed check:
  **83 passed**, exit 0, 17.16s; [focused.txt](focused.txt). Covers allocation,
  balanced policy, R03 eligibility, session wrapper, preview/setup and legacy carry.
- `npm run typecheck`: exit 0; [typecheck.txt](typecheck.txt).
- `npm run audit:training-dual-paths`, Git Bash: **31 passed, 0 failed**, exit 0;
  [dual-path.txt](dual-path.txt).
- Public-wrapper command tests: `python -B -m pytest scripts/test_eif_node_commands.py -q`:
  **11 passed**, 0.66s, exit 0. No wrapper code changed.
- `npm test -- --reporter=verbose`: **1138 passed / 4 failed**, exit 1; [full-vitest.txt](full-vitest.txt). These are the same four documented committed-baseline assertions: routineVolumeMeasurement seed count (31 versus 18), runSession migration link (uuid versus expected text), and weeklyVolumeModel caps (15 versus 10; 6 versus 2). No new failure was observed. This remains a failing full suite, with no waiver. Command results and log hashes: [verification.json](verification.json).

No runtime journey, Android rendering, live DB, clinical suitability, whole-node
criterion acceptance or clean full-harness completion is established here.
Scientific decisions D-P2-01 through D-P2-06 and other existing boundaries remain
unchanged. R02 and R12 were not addressed.

## Ownership and registration boundary

Run `R20261018R04PROVENANCE` rechecked N-0069 through the canonical public wrapper.
Programme revision was 554; node revision 4 had the prior recovery run's lease,
expired at `2026-10-16T16:31:03Z`. Under the current operator's explicit recovery
authorization, public `release` then `lease` succeeded under the fresh identity,
without impersonating the old owner. Node revision is 6; all nonownership fields
remain equal, including in-progress status, pending acceptance, empty node evidence
and verification fields. Exact before/release/acquire/replay receipts are adjacent.
No current ownership conflict was observed. The lease records execution-time
ownership only; future sessions must recheck it.

Registration follows publication of this supplemental evidence. Its actual
wrapper-issued ID and replay confirmation will be recorded in a subsequent
publication receipt; no ID or successful attachment is asserted in advance.
Registration is programme-level evidence, not a criterion packet, node acceptance
or completion. Preexisting unrelated files and original receipts are hash-checked
against `preservation-before.json`; ledger/generated changes are solely public
wrapper outputs and remain outside the scoped evidence commit.
