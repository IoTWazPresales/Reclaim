# EIF lease and recovery evidence reconciliation — 2026-10-16

Ownership recovery succeeded and eight existing artifacts were registered. Two task attachments remain blocked by review provenance. No node was accepted or completed.

Scope: Reclaim / PRG-20260917T222550, `C:/Reclaim`, branch `fix/training-confident-ux`. Fresh run: `R20261016EVIDRECOVERYA`. Starting HEAD and artifact publication anchor: `caed83b` (full SHA in [inventory](LEASE-evidence-recovery/inventory.json)). Root commit and origin match the project manifest. The installed repair was used as installed; no installation, framework investigation or runtime-internal access was performed.

## Ownership and current state

Public wrapper preflight confirmed programme revision **541** and the expected node revisions, leases, status and pending acceptance. Public health identified the two expired leases. Its exit 2 reflects the separately recorded 11 historical gate debts. Local process checks found no matching non-shell process for the historical P2/R03 identities; this bounded observation cannot establish remote or idle human-session liveness. Public help exposes no run-liveness query. The current operator instruction authorizes the documented expired-release/acquire recovery; expiry alone was not treated as proof that an operator session ended.

Every programme read and mutation used `python scripts/eif_node.py` under the fresh identity. The wrapper fetched current revisions for mutations. Successful public release/acquire operations:

| Node | Initial revision / lease | Public operations | Result revision / lease expiry UTC |
| --- | --- | --- | --- |
| N-0068 | 6 / P2, expired 2026-10-14 11:45:07 | release → acquire | 8 / fresh run, 2026-10-16 16:30:52 |
| N-0069 | 3 / none | acquire | 4 / fresh run, 2026-10-16 16:31:03 |
| N-0070 | 3 / P2, expired 2026-10-13 13:47:18 | release → acquire | 5 / fresh run, 2026-10-16 16:31:23 |
| N-0071 | 1 / none | read only | unchanged; proposed, unleased |

No ownership conflict or unexpected revision occurred. No historical identity was impersonated. Leases were not extended beyond the wrapper's ordinary duration; this report records ownership at execution time, not perpetual ownership. A future session must recheck status under its own legitimate identity.

## Verified inventory and actual attachments

The [machine inventory](LEASE-evidence-recovery/inventory.json) records full reviewed commits, artifact publication/last-change commits, SHA-256 values, source bindings, supporting receipts, original checkout bytes, blocked reasons and actual evidence IDs. `git ls-remote` confirmed the current branch publication anchor; all selected source and artifact commits are ancestors of that remotely observed tip. Existing task reports/reviews/manifests were inspected; no new independent source review is claimed.

Selected clean evidence files with CRLF checkout bytes were restored from their existing HEAD Git blobs before attachment. Only LF normalization was required; no report content or source was rewritten. Exact committed-byte equality was checked before submission and again afterward. Original and committed hashes are retained. Supporting reports with CRLF bytes are identified separately in the inventory; they were not submitted as exact-byte attachments.

| Node | Task | Existing artifact | Reviewed source commit | Successful evidence ID |
| --- | --- | --- | --- | --- |
| N-0068 | R01 | `docs/eif/phase2-controls/R01-result.md` | `c4863c401c5c71e4d379901b1534b700f213a0ad` | EV-0059 |
| N-0069 | R03 | `.eif/audit/N-0069/R03/result.md` | `db41b341ecfbfd230886d3762d4e38b5e6881764` | EV-0060 |
| N-0069 | R05 | `.eif/audit/N-0069/R05/result.md` | `dcf4bf87b6d587f99451d88d3e58fbea68f6913a` | EV-0061 |
| N-0069 | R05 | `.eif/audit/N-0069/R05/recheck.md` | `dcf4bf87b6d587f99451d88d3e58fbea68f6913a` | EV-0062 |
| N-0070 | R06 | `.eif/audit/N-0070/R06/result.md` | `77726c6d3ae31f85212503c8c21dee3cc626bac8` | EV-0063 |
| N-0070 | R07 | `.eif/audit/N-0070/R07/result.md` | `c46baa798f93c7b950ba936cc8b98ed4ad11ec75` | EV-0064 |
| N-0070 | R08 | `.eif/audit/N-0070/R08/result.md` | `3de2a5b8d5fcec9d9ce8cbf02ce18b303d9f067c` | EV-0065 |
| N-0070 | R09 | `.eif/audit/N-0070/R09/result.md` | `df38eba9dbd9636039d2c4b6bdb59085f11a42f4` | EV-0066 |

Each ID above came from a successful wrapper invocation with exit 0, followed by successful public replay. These are programme-level `evidence.add` records naming the node in their note. They do not populate a criterion packet or establish satisfied node evidence/verification fields. No ID was allocated manually. Final programme revision is **554**: five ownership events and eight evidence events after revision 541.

R01's six preserved working-source hashes map to the committed inputs after line-ending normalization, including the mixed-line-ending wrapper. This permits registering historical source observations; its review expressly does not supply final committed-source/criterion-packet approval. R03's two review fingerprints match committed inputs. R05's two source fingerprints, R06's 16, R07's nine, R08's 18 and R09's ten match their respective committed manifests. R07's review is explicitly same-author, with separate harness execution, and is not an independent reviewer receipt.

## Blocked attachments and separate requirements

| Node / task | Artifact and candidate source commit | Actual blocker / operation |
| --- | --- | --- |
| N-0069 / R04 | `.eif/audit/N-0069/R04/result.md`, `b40fa80f32a2b035f830d3e563055b93c083137a` | All 13 manifest source hashes match the commit, but the independent review lists `balancedHypertrophy.ts` SHA-256 `81d1982368d4ffdb6d043146fb81dd4e79dbd979a513b7239dc09f7854a08818`; the manifest's reviewed-filesystem value is `b211622fd36931d4ad7fc6661ce9e0bdf70c44171ae728e10fa6808cd7730788` (the commit reconstructed with CRLF). Exact reviewer coverage of that final file is unresolved. No attachment attempted; no ID. |
| N-0070 / R02 | `.eif/audit/N-0070/R02/fixture-and-review.md`, `cda17e7c3326272325b2a6b67bb805cbc7481ae2` | Narrative final-diff review exists, but no exact reviewed-source fingerprint/manifest binds its inspected bytes to the checkpoint. The artifact exists, matches committed bytes and was pushed; exact source-review binding remains unverified. No attachment attempted; no ID. |

No missing artifact, review receipt or evidence ID was invented. These blockers call for narrow provenance clarification or actual review in separately authorized work, not a rewritten historical receipt. Existing R04/R05/R06 failed-attachment receipts were reconciled against current readable state and their null IDs. The new IDs above supersede those historical attachment blockers only for their exact listed artifacts. R04 remains withheld. `LEDGER_PENDING.md` contains older operations outside this task; it was not replayed or edited. Historical failed human-check/approval registrations were not retried as evidence registration.

All four nodes retain **pending scope acceptance**. Final comparison confirms every node field except authorized lease/revision changes is unchanged, including status, quality, verification, evidence arrays and stage notes. Historical stage notes describing the former replay failure remain historical. N-0070 UX, accessibility, rendered and content gates remain pending. R01 final committed criterion packet/review, independent review requirements (especially R07), full-harness failures/stalls, Android saved-profile/save/start/freeze/effective-guidance journeys and operator visible approval remain separate outstanding requirements. No historical render or source review was promoted to runtime approval.

Scientific-policy decisions D-P2-01 through D-P2-06 and the R10-P01 policy conflict were not resolved. R08 distributed atomicity and R09 malformed-data limitations remain as documented. No training algorithm, live data or schema changed. N-0071 was not acquired, and R12 was not begun.

## Governance verification and preservation

Focused command: `python -B -m pytest scripts/test_eif_node.py scripts/test_eif_node_commands.py scripts/test_eif_recovery_controls.py -q`. Exit **0**, **57 passed in 313.86s**; output is recorded in [governance-tests.txt](LEASE-evidence-recovery/governance-tests.txt). Application harness was not rerun for this governance/evidence-only task.

Final public `inspect verify` retains exit **2**, `integrity_ok: true`, zero integrity issues, and exactly the same unacknowledged gate debts for N-0002, N-0003, N-0005, N-0006, N-0012–N-0015 and N-0036–N-0038. Those 11 debts prevent clean overall verification. They did not prevent these ownership/evidence operations. None was repaired, acknowledged, waived or rewritten.

[Final verification](LEASE-evidence-recovery/final-verification.json) records unchanged hashes for pre-existing dirty non-ledger files, accepted policies, identity, pending operations, approval/human-check queues and disabled hook artifacts. Hooks remain off; installation integrity does not certify runtime enforcement. Pre-existing local ledger/generated-view changes remain outside the scoped report commit; wrapper-generated recovery events are retained locally. No raw append-only ledger bodies, runtime files, unrelated app edits, secrets or bulk screenshots are published by this reconciliation.

The helper [reconcile_recovery_evidence.py](reconcile_recovery_evidence.py) records explicit one-time phases and stops on failed mutations or unexpected node state; it is an execution receipt, not a general retry tool. Resume from this report and current wrapper status. Stop after scoped report publication; do not accept/complete nodes or begin another recovery task.
