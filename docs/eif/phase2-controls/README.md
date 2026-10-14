# Reclaim local recovery completion controls

These controls apply through `scripts/eif_node.py`, not through shared EIF or
inactive hooks. They do not authenticate a human, prove the meaning of arbitrary
evidence, or constrain direct runtime invocation. Independent review must judge
whether the evidence actually proves each criterion.

## Contract

`registry.json` maps recovery nodes to exact acceptance files, reviewed source
paths, applicable journey IDs and visible-change approval requirements. Both the
registry and acceptance file must match bytes at the reviewed implementation
commit. An empty journey list means no product journey is applicable to that
local tooling node; it is not permission to mark mapped journeys NA.

`accept NODE --receipt PATH` requires a committed scope-acceptance JSON receipt
with version 1, node, approved=true, exact criteria_sha256, approver_role=operator,
approver and statement. Record actual operator authority; never manufacture it.
`sync-criteria` repairs delimiter corruption from a scope receipt but does not
accept or complete the node. Its working-artifact exception is logged explicitly.

`check-completion NODE --commit SHA [--packet PATH]` is read-only. `complete`
uses the same check and then delegates to the existing runtime gates. Neither
command accepts pending scope. A packet needs:

- Version 1, node, full reviewed_commit, exact criteria_sha256 and executor_session.
- Every criterion exactly once, in order, with ID C1...Cn and exact criterion text.
- Exactly the registry's journey IDs; there is no blanket NA outcome.
- `satisfied` rows with nonempty evidence references `{path, sha256}`; or `waived`
  rows with reason, residual_limitation and a hashed operator waiver receipt
  explicitly naming the row in waived_ids. Waived remains waived in the result.
- A separate reviewer session/model, verified result and hashed JSON receipt.
  That receipt binds executor, node, reviewed commit, criteria digest, exact
  criteria/journey outcomes digest, and a hashed review report.
- For visible changes, operator_approval is a hashed visible-acceptance receipt
  bound to the same reviewed commit and criteria digest.

Evidence, packet, report and receipts must exist as nonempty committed bytes at
HEAD. HEAD must be an ancestor of the current origin branch tip, queried with
ls-remote; reviewed source must be an ancestor of HEAD and unchanged in commits,
tracked working files and untracked source files. Packet/reviewer artifacts cannot
also serve as criterion or journey evidence. This detects structural circularity;
semantic circularity still requires a reviewer.

`await-approval` records a pending queue note and hashes PNG/JPEG signature-bearing
files. It explicitly does not claim image authenticity, rendered review or approval.
Generic event calls cannot accept, complete or replace protected recovery fields.
Runtime rejections retain the existing pending-mutation log.

## Ordering and limitations

Validate source and repository gates, commit/push the implementation, obtain a
separate review of that commit, then commit/push the evidence packet and receipts.
Record EIF evidence and run check-completion before attempting complete. A runtime
gate rejection remains a blocker; do not add blanket exemptions to make it pass.

R01's current working evidence is recorded separately in R01-result.md and
R01-criterion-packet.json. An uncommitted working packet is not completion proof.
