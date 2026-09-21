# N-0058 account deletion identity boundary

Source of truth: Supabase session plus server-validated captured JWT. The confirmation
captures the displayed user ID; neither a later SDK current token nor response
`ok` alone authorizes deletion/cleanup. A short-lived privacy-operation lease is
mutual exclusion, not a second auth store. It gates navigation until cleanup ends,
serializes auth storage writes and refuses persistence of a different identity.
Drain writes begun before the lease before validating the confirmed identity.

Account deletion and limited client data reset share this exclusion. A different
persisted identity at cleanup fails closed without clearing shared device state.
The existing deleted-ID tombstone still prevents stale refresh resurrection.

Verification: deferred promise races, real Supabase SDK storage/sign-in probes,
rendered component behavior, and full harness. No AVD visual claim: N-0056 remains
the documented dev-client/ANR blocker. UI and accessibility review are source/test
only until emulator recovery. Final operator review remains required.

## Executed evidence (2026-09-21)

- Initial focused run: 4 files / 35 tests. Final identity tests after defensive
  tombstone and timeout checks: 2 files / 31 tests, PASS.
- Final full verbose suite: **141 files / 900 tests PASS**, 354.91 seconds,
  `--testTimeout=30000`; N-0052 retains the default-timeout reproducibility debt.
- Typecheck 0; Git Bash dual-path 27/27; catalogue 357 rows / zero issues.
- Wrapper integration plus command tests 14/14 (base test file alone is 3/3).
- Live schema refresh check: 26 tables unchanged. No live account deleted here.
- Logs (local, not bulk-committed): `.eif/audit/N0058-focused.txt`,
  `N0058-races-final.txt`, `N0058-typecheck.txt`, `N0058-vitest-final.txt`.

Same-agent verification-controller re-review found no remaining instance of the
original identity/cleanup interleaving in these paths. This is not independent-
person verification, AVD evidence, or a release approval.
