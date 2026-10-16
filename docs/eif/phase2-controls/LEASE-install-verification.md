# EIF lease replay repair installation preflight — 2026-10-16

**Result: STOPPED before installation. EIF public history access is not restored.**

Scope: installation and verification only; run `R20261016LEASEINSTALL`. Target `C:/Reclaim`, branch `fix/training-confident-ux`, starting HEAD `c72c6c0106cd6e7942a5165f9b37f470134ac408`, origin `https://github.com/IoTWazPresales/Reclaim`, root commit `f61a11f0ffd30f8449d69a2f6909f5063d524fde`. Identity matches `.eif/PROJECT_MANIFEST.md`; programme `PRG-20260917T222550`.

## Verified lineage and pinned repair

Repair checkout: `C:/AI/engineering-intelligence-framework/.tmp/lease-replay-repair`, branch `fix/historical-lease-release-replay`, exact HEAD and remote branch `a9f39d5b10300facd7b12be73498d23ccf9a9abb`. Relevant tracked tools/runtime/review files have no diff from that commit. The compatible baseline `9bde37921e286f9e4aa94ec3fa82685b9c350abe` is an ancestor. All 21 mapped installed programme source files match baseline source blobs after CRLF normalization. Installed manifest entries match their actual SHA-256 values. Installed manifest version is `0.7.0-draft`; it does not record an original installation commit, so byte correspondence establishes lineage without inventing one. No framework main checkout was used.

Read the pinned `reviews/historical-lease-replay/REPAIR.md` and Reclaim `LEASE-investigation.md`. The framework repair changes only the engine's production behavior and includes historical-time and active-owner regression coverage. Those upstream results are documentary evidence, not locally re-executed certification.

## Failed governance preflight

`AGENTS.md` section 5 explicitly says: **“Hooks are off (`.cursor/hooks.off`, `.cursor/hooks.json.off`). Leave them off.”** Observed `.cursor/hooks` and `.cursor/hooks.json` are absent, while both disabled counterparts exist.

At the pinned repair commit, `tools/eif_install.py` `_upgrade_project_locked()` calls `install_runtime(project)` before installing the programme runtime. `install_runtime()` copies the active hook tree, unconditionally writes `.cursor/hooks.json`, and registers hooks through the current-OS adapter. `tools/install_project.py` exposes no programme-only or preserve-disabled-hooks upgrade option. Thus the documented command `python tools/install_project.py upgrade C:/Reclaim` would activate hooks contrary to Reclaim's explicit governance invariant.

The task requires stopping when a governance check fails. No installer was invoked, no unsupported installer entry point was substituted, and no protected runtime file or manifest was edited. Installation requires a supported framework workflow that preserves the disabled hook configuration, or an explicit revision of that requirement. This integration did neither.

## Preservation and recovery

`LEASE-install-preflight.json` contains before/after SHA-256 inventories for tracked files (excluding the two intentionally updated durability notes), programme runtime and ledger, project identity/policies, disabled hooks, integrity manifests and pending operations. It also contains exact command outputs and exit codes. Hashing runtime bytes does not inspect or interpret installed runtime implementation. No raw downstream history bodies were copied into the report.

Existing installer recovery journal: `.eif/upgrade-work/journal.json`, phase `committed`, finished `2026-09-18T19:03:04Z`. No new recovery transaction or snapshot exists for this task. The supported command for an incomplete upgrade is `python tools/install_project.py recover C:/Reclaim` from the pinned checkout. On the existing committed journal it reports no rollback required; it was not invoked because no upgrade ran. The installer automatically rolls back caught upgrade failures, retains the recovery journal, and removes its snapshot after successful commit. Manual runtime restoration is outside this integration.

## Verification results

All commands use fresh run `R20261016LEASEINSTALL` through the canonical wrapper:

| Check | Before | After installation |
| --- | --- | --- |
| `python -B scripts/eif_node.py inspect verify` | Exit 2, `LEASE_NOT_OWNER: R20261014R03` | Not run: upgrade blocked |
| `python -B scripts/eif_node.py status` | Exit 2, same error | Not run: upgrade blocked |
| `status --node N-0068`, N-0069, N-0070, N-0071 | Each exit 2, same error | Not run: upgrade blocked |
| Governance smoke tests | Exit 1: **55 passed, 2 failed in 245.83s** | Not run: upgrade blocked |

Historical investigation baseline: 55 passed / 2 failed in 246.92 seconds; failures were live status and dry-run prerequisite reads. The fresh run uses exactly `python -B -m pytest scripts/test_eif_node.py scripts/test_eif_node_commands.py scripts/test_eif_recovery_controls.py -q`. Its dry-run lease smoke test is read-only; no actual lease operation is performed. Isolated contracts use disposable repositories and do not mutate Reclaim's ledger.

No deterministic post-repair replay, restored public access, current node ownership or live ownership protection certification is claimed. The append-only ledger bytes remain the preservation reference. Application tests were not run because this task changes only integration documentation. A broad `git diff --check` reports pre-existing whitespace in `.eif/WORK_ITEM.md` and release documentation; only integration paths are checked for this commit, leaving unrelated changes intact.

Installed framework commit: **unchanged; repair a9f39d5 not installed**. Changed installed files: **none**. Capabilities remain unverified; hooks remain off. No higher autonomy is certified. No lease acquired/released, evidence attached, node accepted/completed, training algorithm or live data changed, or R12 begun. Stop after this verification report.

Fresh smoke failures: `test_status_reads_ledger` and `test_dry_run_mutation_writes_nothing`, both `LEASE_NOT_OWNER: R20261014R03`. The remaining live smoke and all 54 isolated governance contracts pass. No tests or gates were modified. The preservation check passes for all **1,898 inventoried paths**; hook path presence is unchanged. Ledger: 541 events, SHA-256 `bfd355375b8fe546d7e1caa2522b58111a36abe300d93224753c6986530da031`; snapshot SHA-256 `3c170ab5a1ee9ef977003dac3c76e50bacde0389f1d4809ab16a62ae8a64a3b1`. Both match the shared repair investigation. The original 11 unrelated tracked modifications remain unstaged.
