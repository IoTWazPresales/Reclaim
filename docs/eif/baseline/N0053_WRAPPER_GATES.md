# N-0053 public wrapper operations

Source of truth: `scripts/eif_node.py` wraps the installed public programme CLI. Runtime internals remain unread and unchanged. N-0044 code and all application gates passed and were pushed as `137055d`; completion was rejected with `QUALITY_GATE` despite EV-0017 and node acceptance.

Added read-only public CLI help/diagnostics, explicit revision-safe node-event forwarding, and lease release. No gate bypass, automatic quality claim, runtime edit, or reduced node risk was added. Event failures still append LEDGER_PENDING and return nonzero.

Public CLI validation confirms `node.quality` requires `dim` and `node.verification` requires a recognised `kind`. Its help supplies neither the allowed verification kinds nor the quality/verification payload schema. Empty payload and `kind=mechanical` were rejected without altering gate state. Do not replay these schema probes as completion claims.

The public health report also exposes 11 historical completed nodes with invalid gates (N-0002/3/5/6/12/13/14/15/36/37/38), and N-0001 now derives as ready with no gate evidence. These are not silently re-certified. Record a separate historical gate-reconciliation node.

Gate population/closure remains blocked until a documented public payload contract is available. Keep the implemented changes and continue other authorised source work; never mark the programme complete with these debts outstanding.

Verification: `python -m pytest scripts/test_eif_node.py scripts/test_eif_node_commands.py -q`. Application source is unchanged since the full 132-file/807-test pass for N-0044. Verification is same-session; independent review not claimed.
