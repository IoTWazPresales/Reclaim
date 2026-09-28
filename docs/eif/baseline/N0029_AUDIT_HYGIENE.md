# N-0029 — audit and resume hygiene

The canonical audit is `scripts/audit-training-dual-paths.sh`, invoked from Git Bash.
No line-ending attribute existed. The shell script also treated every failed `rg`
invocation as absence, including missing tools/files or an actual search error.

Pin only this script to LF on checkout. Treat exit 1 as no match and any other search
failure as an audit failure. Preserve all existing 27 checks. No product code or
dependencies change. The extra failure handling is part of the chartered audit
hardening, not a new product workflow.

Documentation authority remains AGENTS.md. Correct its stale deletion deployment note
using the already-recorded N-0055 evidence, document the operator-proven canonical Expo
workflow, and replace RESUME's obsolete N-0026 start pointer with current durable state.
Version 1.0.5/vc15 and 357 catalogue rows remain unchanged.

Acceptance: real Git Bash audit still passes 27/27; injected rg failure exits nonzero;
LF attribute is effective even with autocrlf; app typecheck/full verbose suite pass.
Do not treat source-scan checks as a complete architectural proof or AVD journey.

## Observed verification

- Git Bash real audit: 27/27 PASS.
- Isolated shell injection `function rg() { return 2; }; export -f rg` causes
  `Audit ERROR: rg failed with status 2` and a nonzero exit before any PASS.
- `git ls-files --eol`: index LF, working tree LF, `text eol=lf`. Attribute remains
  LF under `git -c core.autocrlf=true -c core.eol=crlf check-attr text eol`.
- Source version remains 1.0.5/vc15. Catalogue count remains 357.
- The ledger's older acceptance explicitly names System32 Bash. A bounded 20-second
  invocation reached the now-parsed audit under WSL, then failed with `rg: command not
  found` / `Audit ERROR: rg failed with status 127`. This is an unmet environment
  precondition, not a pass. No WSL/package/network configuration was changed. Git Bash
  remains the canonical gate under AGENTS.md; legacy System32 acceptance is queued.
- Typecheck: 0 errors (`.eif/audit/N0029-typecheck.txt`). Full verbose Vitest:
  147 files / 923 tests PASS in 164.18 seconds (`.eif/audit/N0029-vitest.txt`).
- Same-writer verification: all 27 checks preserved; no product behavior changed.
  This is not independent-agent verification or evidence of a runtime journey.
