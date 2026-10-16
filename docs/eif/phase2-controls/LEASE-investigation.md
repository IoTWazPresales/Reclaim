# Phase 2 lease ownership investigation - 2026-10-16

Scope: governance only, run `R20261016LEASE`, branch `fix/training-confident-ux`, project `reclaim` / `PRG-20260917T222550`. Repository path, origin and root commit match `.eif/PROJECT_MANIFEST.md`. No R12 or training logic investigation.

## Findings

The error's `R20261014R03` is the actor/run on the final persisted release event, not the current owner of four nodes. The public materialized ledger and generated frontier show:

| Node | Snapshot revision/status | Lease owner | Last heartbeat / expiry (UTC) |
|---|---|---|---|
| N-0068 | 6 / in_progress | R20261013P2 | 2026-10-14 11:15:07 / 11:45:07 |
| N-0069 | 3 / in_progress | none after release | Original P2 lease: 2026-10-13 13:17:15 / 13:47:15 |
| N-0070 | 3 / in_progress | R20261013P2 | 2026-10-13 13:17:18 / 13:47:18 |
| N-0071 | 1 / proposed | none | none |

These are last materialized observations, not successfully replay-verified current state. Scope acceptance remains pending on all four. No acceptance/completion was attempted.

Public append-only history contains N-0069 acquisition at sequence 530 by `R20261013P2`, expired 2026-10-13T13:47:15Z. Sequence 541, the final event, is `node.lease.release` by `R20261014R03` at 2026-10-14T14:12:12Z, expected_revision 2. It was recorded after expiry and the materialized snapshot reflects release. There is no intervening N-0069 lease event. PROGRESS records the release as successful at 14:12:13Z.

Observed root cause boundary: public history consumption now fails with LEASE_NOT_OWNER naming that historical releasing run, including read-only status, verify, health and account. Strong inference: the installed framework admits the expired-owner release on write but rejects it when consuming historical events. The release across run IDs at sequence 541 is the implicated replay boundary. Exact internal validation logic is not established: runtime source was neither read nor modified. This is not evidence that R03 currently owns the nodes or that changing the new caller ID can fix it.

All four requested node reads fail, including unleased N-0071. The programme-level diagnostics fail too; impact is broader than those four nodes. `evidence` starts with the same `ledger.node()` read, so it cannot reach evidence submission. `accept`, lease and release also depend on node reads. No evidence operation can be certified functional while that prerequisite fails.

## Supported mechanism and activity

The documented wrapper supports `release NODE` (revision-safe `node.lease.release`) followed by `lease NODE` (`node.lease.acquire`). `lease` alone returns an existing lease without renewing it, including an expired lease. There is no documented transfer/force-release/run-liveness command in the exposed wrapper or installed public CLI help. Generic event help does not document an administrative transfer payload; none was guessed.

Dry-run release/acquire on N-0069 both fail before producing a mutation because the required status read fails. Releasing N-0068 or N-0070 has the same prerequisite. A real retry cannot repair this read barrier. No actual lease transition was attempted.

Both recorded P2 leases are expired, and the log has no later heartbeats. A bounded local Win32_Process query for `R20261013P2` or `R20261014R03` found no matching process (excluding the querying process). There is no public run-liveness report; public account also fails. Thus there is no observed active owning run, but an idle/remote/session process without its run ID in its command line cannot be excluded. Do not treat elapsed lease time as proof a human session is closed.

## Verification and preservation

`LEASE-investigation-probes.json` records actual exit codes/output for four status reads and dry-run release/acquire, plus unchanged SHA-256 values for PROGRAM.yaml, PROGRAM_LOG.ndjson, generated CURRENT/PROGRAM/WORK_ITEM and LEDGER_PENDING before/after probes. All six probes return exit 2 naming R03. Public verify/health/account independently return the same error. Public help works.

Focused governance verification: `python -m pytest scripts/test_eif_node.py scripts/test_eif_node_commands.py scripts/test_eif_recovery_controls.py -q` returned exit 1: **55 passed, 2 failed in 246.92 seconds**. Both failures are the live runtime-backed status/dry-run smoke checks with `LEASE_NOT_OWNER: R20261014R03`; the other live smoke check passes, as do all 54 isolated command/recovery contract tests. `git diff --check` passes for edited tracked documentation. The protected-file hash check passes again after the tests. Runtime-backed failures must remain visible; mock contract passes do not prove live evidence access. Application tests were not run because no application source changed.

Existing dirty source, ledger, generated views and evidence were preserved and excluded from this documentation commit. No runtime internals, framework checkout, acceptance controls, hooks, production data or historical events were changed. No prior run ID was used as the current identity. No node was accepted/completed and no historical pending operation was blindly replayed.

## Approval required - proposed operation, not executed

Authorize the shared EIF maintainer to fix historical expired-lease release replay consistency, using the public history sequence 530/541 as the regression case: establish the documented expiry/release authority and make historical replay consistent with admission for sequence 541. If that recorded release was authorized under the original expiry rules, replay it consistently without treating it as a new live non-owner mutation. If its authority cannot be established, stop and propose an explicit audited recovery operation instead of silently validating it. Retain the append-only log bytes, existing evidence, optimistic revisions and live ownership checks; do not blanket-disable lease validation. Test live non-owner release rejection while a lease is active, authorized expired-lease recovery, repeatable replay/status, and acceptance/evidence gate preservation. The maintainer must determine and document the precise supported repair after authorized framework inspection; this report does not invent a transfer payload or patch runtime locally.

After an approved framework fix is installed, use the canonical wrapper under a fresh legitimate run: verify/status first; recheck actual owners and activity; release expired N-0068/N-0070 and acquire only nodes required for authorized evidence work, acquiring unleased N-0069 separately. N-0071 depends on the first three and must not be leased merely to force readiness. Attach the existing committed/pushed evidence using real reviewed commits and paths only after wrapper checks pass, then verify actual evidence IDs. Do not accept or complete any node as part of access recovery. Stop on any ownership/gate rejection. No post-repair action was executed in this task; the framework repair itself requires separate approval.
