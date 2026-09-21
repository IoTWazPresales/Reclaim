# N-0051 Stage 1 combined review — NOT a release approval

Reviewed combined diff `4962b3f..67ebba9`, not isolated node descriptions, under
the verification-controller contract. This is same-agent adversarial re-review;
no independent-person verification is claimed. No EIF runtime internals read.

## Verified

- Deletion inventory covers the 26-table live snapshot and restrictive FK order.
  Required tables cannot be skipped, and auth deletion follows successful domain
  deletion. The deployed handler is v2 ACTIVE with JWT verification retained.
- The read-only verifier requires exact zero counts AND a 404 user_not_found;
  missing required tables / null counts / ambiguous auth results fail closed.
- Account deletion no longer downgrades to client-only deletion. Its distinct
  limited reset API retains the account and reports service-only tables left.
- Real SDK tests cover local sign-out with offline networking and storage failures;
  provider tests cover stale bootstrap and refresh results for a deleted identity.
- Two views now use caller RLS. Actual two-user SQL probes passed pre/post migration.
- Public/client EXECUTE grants removed from the two definer functions; signup
  trigger behavior and service-role access preserved in actual SQL probes.
- Four function search paths pinned, with pg_temp last; actual trigger and
  temp-shadow probes pass. No function body or RLS policy was widened.
- Security advisors: **0 ERROR, 2 WARN** — public moddatetime (N-0057 assessment),
  leaked-password dashboard toggle (HUMAN_CHECKS).

## Finding requiring a node before closure

**N-0058 — account-switch identity and cleanup race, release blocker.**
`deleteAccountOnce` first awaits getUser, then invokes delete-account without a
captured Authorization token. The SDK can therefore send a different current
session if identity changes between those operations. It also accepts ok=true
without comparing response.userId to the intended account. Separately,
`clearDeletedAccountSession(userId)` marks that identity deleted but unconditionally
removes the shared auth storage keys and calls signOut on the current SDK session.
Local cleanup continues after SIGNED_OUT has made Auth reachable. A newer identity
must not be erased by the late callback or shared cache cleanup. Existing tests
exercise next-user sign-in only AFTER cleanup, so do not cover this interleaving.
This is a concrete source-path finding, not a claimed live account incident.

N-0058 owns token/identity binding, account-switch exclusion/scoping and deferred
race tests. Schedule it next, before wave 2. No release from current green tests.

## Unresolved gates

AVD journey N-0047 blocked (N-0056); visual approval N-0046 outstanding. EIF closure
contract N-0053 unavailable and historical debt N-0054 remains. N-0051 cannot be
complete until its journey/review findings resolve. No final preview build started.

## Review-node rerun

Full verbose suite **140 files / 884 tests PASS** (203.44 s, 30-second timeout
workaround retained). Typecheck 0, dual-path 27/27, catalogue 357 / zero issues,
wrapper 14/14 and live 26-table snapshot check unchanged. Advisors re-run after
the combined review: zero ERROR, exactly the two WARNs above. These green tests
do not cover N-0058's missing interleaving and do not waive that release blocker.

## N-0058 follow-up source review — 2026-09-21

Reviewed the deletion/auth combined paths again after the fix, including existing
provider stale-event handling. Confirmation captures the displayed ID; the request
uses its server-validated explicit JWT, and response identity must match. Auth
storage mutations are serialized and foreign identity persistence is rejected
during the privacy lease. Prior writes drain before identity validation. Auth
navigation remains unavailable until all cleanup ends; a defensive different-
identity guard preserves shared device state while tombstoning only deleted A.
The limited data-only reset shares mutual exclusion and never invokes the function.

Deferred interleavings and actual SDK sign-in/storage/Authorization behavior pass;
full suite is now 141 files / 900 tests. The original source finding is addressed.
N-0047 runtime deletion and final visible approval remain unverified; N-0051 is
still not complete. SQL migrations were unchanged; the prior zero-ERROR advisor
result is not represented as a fresh advisor invocation in this follow-up.
