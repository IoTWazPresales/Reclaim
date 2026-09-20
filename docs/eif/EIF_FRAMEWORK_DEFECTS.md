# EIF framework findings — for upstream to `C:\AI\engineering-intelligence-framework`

Recorded by the Reclaim programme (PRG-20260917T222550). Nothing outside `C:\Reclaim` was edited.

## 2026-09-20 — `engine.py` edit review (step 4 of the close-out run)

**Claim under review:** a previous session edited `.eif/runtime/programme/eif_program/engine.py`.

**Method:**

- `.eif/runtime/` is untracked in the Reclaim repo (`git ls-files .eif` lists only the generated views, the ledger and `.eif/audit/N-0030`), so `git log -p` cannot show its history. Compared the installed copy against the framework source instead.
- `Get-FileHash` SHA-256, both files: `CDF487CBFA50A2ECDB7BD788944C4C57544A1A0D16063EB6E4CAE52B02B49D10`.
- Framework checkout: HEAD `9bde379`; `git status` for `tools/eif_program/engine.py` clean; last commits touching it `381393d` (2026-09-10), `560c9c8` (2026-09-08), `bc35c09` (2026-09-06). All predate the Reclaim install (`.eif/upgrade-history/1789758173649592300`, finished 2026-09-18T19:01:18Z).
- `.eif/runtime-events.jsonl` shows only `Read`/`Grep` tool events against `engine.py` from the prior conversations — no `Write`/`Edit` events.

**Verdict:** **no edit exists.** The installed `engine.py` is byte-identical to framework HEAD. Classification (a)/(b) does not apply; nothing to revert. `program.py status` loads the ledger at rev 105+ without error.

**Upstream note:** if a session reports editing runtime internals, the runtime-events log is the discriminator. Consider having the installer stamp the source commit (`9bde379`) into `.eif/upgrade-history/*/manifest` so the check is one line instead of a hash comparison.

## Friction worth fixing upstream (observed while wrapping the CLI)

1. `program.py --help` lists subcommands but not event type names. Agents have to infer `node.lease.acquire`, `evidence.add`, `node.accept`, `node.status`, `node.stage_note`, `node.lease.release`, `node.blocker.open/close`, `node.patch`, `decision.add/status` from the ledger. A `program.py events` subcommand (or `event --help` listing types + payload schema) would remove this.
2. `expected_revision` must be supplied by the caller. Every payload template in `docs/eif/payloads/` hard-codes it, and it drifts after any extra event. `scripts/eif_node.py` now reads `status --node` before each mutation; upstream could accept `--expected-revision current` or default to the current revision when omitted.
3. `status --node X` prints the programme header before the node JSON. Machine callers must scan for the first `\n{`. A `--json` flag would make this stable.
4. `add-node --acceptance` is the acceptance *mode* (`operator`/`auto`), while criteria go in `--criteria` as a comma-joined slug list. The naming invites mistakes; the wrapper takes `--acceptance <file>` (one criterion per line) and maps it to `--criteria`.
5. `evidence.add` has no node linkage field; evidence is programme-level and `status --node` shows `"evidence": []` even after evidence was recorded for that node (see N-0007 / EV-0014). Either accept `node` in the payload or document that evidence is programme-scoped.
6. The generated views (`CURRENT.md`, `ROADMAP.md`, …) and `.eif/program/*` are committed, but `.eif/runtime/` is not, so a fresh clone cannot run `program.py`. The wrapper fails closed with a clear message; upstream should document whether the runtime is meant to be vendored or reinstalled per clone.
