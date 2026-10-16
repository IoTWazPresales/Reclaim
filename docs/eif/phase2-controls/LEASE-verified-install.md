# Verified EIF repair installation — 2026-10-16

Public history access is restored. Installation verification passes. This supersedes the stopped installation attempt in `LEASE-install-verification.md`; it does not authorize further programme work.

Target: `C:/Reclaim`, branch `fix/training-confident-ux`, starting HEAD `ea2cbce6a2b468373df782e4cb4b0abeaeba1d0c`. Run: `R20261016VERIFIEDINSTALL`. Origin and root commit match `.eif/PROJECT_MANIFEST.md`; programme `PRG-20260917T222550`.

## Installed source and supported procedure

Installed from `C:/AI/eif-disabled-hooks-repair`, branch `fix/preserve-disabled-hooks`, exact commit **`a0a0270531baddc083dab0ddcbf1bbe45340b713`**. The tracked tools/runtime/build source matches that commit. Both `a9f39d5b10300facd7b12be73498d23ccf9a9abb` and compatible baseline `9bde37921e286f9e4aa94ec3fa82685b9c350abe` are ancestors. All 23 pre-install runtime files match the previous verified inventory, which established baseline source correspondence. Untracked upstream test artifacts were not imported.

Read the pinned README and `reviews/disabled-hooks-upgrade/VERIFICATION.md` and `reviews/historical-lease-replay/REPAIR.md`. Only these supported shared-framework commands were invoked, from the pinned checkout:

```text
python tools/install_project.py upgrade C:\Reclaim --preserve-disabled-hooks
python tools/verify_runtime_install.py C:\Reclaim --allow-disabled-hooks
```

Both exited 0. No `--migrate` was supplied. The verifier returned `ok: true`: programme runtime matches reviewed framework source; preserved hook artifacts match upgrade digests; hooks disabled; runtime protection unavailable. Installer validation reports 66 active core specialists and zero warnings. Product version remains `0.7.0-draft`; derived framework version remains `0.4.0-draft`. Those version labels do not replace the exact source commit above.

Pre-existing journal was `committed`, finished `2026-09-18T19:03:04Z`. The supported upgrade archived it and committed a disabled-mode transaction, finished `2026-10-16T15:28:30Z`. No rollback/recovery was needed. If an incomplete transaction requires recovery, the documented command remains `python tools/install_project.py recover C:\Reclaim` from this checkout. Recovery does not undo a committed upgrade. No manual runtime restoration or protected-file edit was performed.

## Public replay and controls

All reads used `scripts/eif_node.py` under the fresh run above. Status and all four requested node reads changed from exit 2 / `LEASE_NOT_OWNER: R20261014R03` to exit 0. Two fresh-process passes produced byte-identical verify/status/node output. Replay reaches revision **541**, and the complete returned node objects equal the unchanged public snapshot. This establishes deterministic repeated public replay locally; arbitrary-clock regression coverage is upstream documentary evidence, not a locally rerun framework test.

| Node | Revision | Status | Lease | Acceptance |
| --- | --- | --- | --- | --- |
| N-0068 | 6 | in_progress | R20261013P2; expired 2026-10-14T11:45:07Z | pending |
| N-0069 | 3 | in_progress | none | pending |
| N-0070 | 3 | in_progress | R20261013P2; expired 2026-10-13T13:47:18Z | pending |
| N-0071 | 1 | proposed | none | pending |

No live owner transition was attempted. Expiry does not prove an operator session has ended. Evidence lists and verification objects remain unchanged; N-0070's required UX/accessibility/render/content gates remain pending. The existing negative governance tests exercise evidence provenance, independent review, approval, quality and completion controls in disposable fixtures. Upstream active-owner replay/admission regressions were independently reviewed before installation; no new live mutation test is claimed here.

`inspect verify` now returns a readable report at revision 541 with **`integrity_ok: true`, no integrity issues**, but exits **2** because `gates_ok: false`: N-0002, N-0003, N-0005, N-0006, N-0012–N-0015 and N-0036–N-0038 are recorded complete with invalid gates. These 11 historical completion debts remain unacknowledged. They block a clean overall programme verification; they do not block public history access or indicate installation/replay integrity failure. No debt was waived or repaired.

## Preservation

Before/after inventories cover 4,222 / 4,223 existing project paths, including installed runtime hashes, tracked/untracked work, policies, identity, disabled hooks and ledger. Ledger remains 541 events: `PROGRAM_LOG.ndjson` SHA-256 `bfd355375b8fe546d7e1caa2522b58111a36abe300d93224753c6986530da031`; snapshot SHA-256 `3c170ab5a1ee9ef977003dac3c76e50bacde0389f1d4809ab16a62ae8a64a3b1`.

Accepted autonomy/environment policies, identity, generated programme views, wrapper/tests, pending operations and approval/human-check queues retain their original bytes. All nine files under `.cursor/hooks.off` and `.cursor/hooks.json.off` retain their original bytes. `.cursor/hooks` and `.cursor/hooks.json` are absent. The derived runtime policy digest is unchanged.

The installer refreshed runtime, its manifest and two tracked generated rule files, plus the journal/archive. These derived rule changes are left unstaged because publication is limited to installation evidence/manifests. No installed runtime file was manually edited or staged. All 11 pre-existing tracked modifications remain untouched and unstaged. One pre-existing untracked Metro output (`.eif/audit/N-0071/R11/coldboot-local-out.txt`) changed during capture while its existing producer continued running; it was neither edited nor staged by this task. The evidence helper's own edits are intentional. The inventories and summary enumerate every observed changed/added path.

After the full post-install suite, final preservation checks passed for **58** protected/runtime/pre-existing tracked paths; enabled hook counterparts remain absent.

Disabled hooks provide **no runtime enforcement**. Measured capabilities remain **unverified**. Installation integrity is not enforcement certification, an autonomy increase, or permission to proceed with R12.

## Governance test results

Exact unchanged command, from Reclaim:

```text
python -B -m pytest scripts/test_eif_node.py scripts/test_eif_node_commands.py scripts/test_eif_recovery_controls.py -q
```

Before: exit 1, **55 passed, 2 failed in 271.27s**. Failures: `test_status_reads_ledger` and `test_dry_run_mutation_writes_nothing`, both historical `LEASE_NOT_OWNER: R20261014R03`.

After: exit 0, **57 passed in 257.10s**. Both previously failing runtime-backed smoke tests now pass. Full output and exact exit codes are in `LEASE-verified-install/before-tests.json` and `after-tests.json`.

Initial sandbox-only probes denied runtime/fixture access and were discarded as a baseline; the recorded comparisons use elevated execution. The existing smoke suite's dry-run lease command performs no mutation; isolated fixture operations never act on Reclaim's ledger. No tests or gates were changed. Application tests were not run because no application source was changed by this installation-only task.

Machine-readable evidence is under `LEASE-verified-install/`: command outputs/exit codes, preflight lineage/journal, SHA-256 inventories, identical public reads, control/ownership summary, and final preservation checks. Capture helper: `verify_lease_install.py`. No raw append-only event bodies were copied.

No lease was acquired/released, evidence attached, node accepted/completed, training code or live data changed, or R12 begun. Stop after verification and scoped publication.
