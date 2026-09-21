# N-0046 client account deletion

## Source of truth and scope

The existing `delete-account` response `{ ok: true }` confirms removal of the auth
user. A client-table wipe is not equivalent. `dataPrivacy.deleteAllPersonalData`
remains the account-deletion entry point, but no longer falls back on a missing
function. It coalesces duplicate submissions. Failed/unconfirmed responses leave
local session, reminders and onboarding unchanged.

After confirmed deletion, Supabase's public local sign-out emits SIGNED_OUT before
onboarding resets. The existing storage adapter rejects the deleted identity for
the lifetime of the process, removes both credential stores, and reports disk
failures. This makes sign-out independent of another network request and prevents
late refresh or bootstrap results from reviving a deleted account. Query, SQLite,
notification and AsyncStorage cleanup are all attempted independently; warnings
tell the user to clear app storage, never retry an already-deleted account.

The separate `deleteClientDeletableDataKeepingAccount` API cannot call the Edge
Function or sign out. Its result explicitly names retained service-only tables.
It is deliberately NOT presented as an all-data wipe in the UI: the current RLS
contract cannot provide that promise. Both existing destructive screen actions
are account deletion and now say so. Post-deletion telemetry writes were removed.

## Evidence

- Focused orchestration/copy/SDK tests: 17/17. Real Supabase auth client, mocked
  native storage/network: SIGNED_OUT, Auth route with onboarding false, storage
  failure warnings, both storage backends, and subsequent different-user login.
- AuthProvider race tests: 3/3; late bootstrap success, late refresh and stale
  bootstrap failure cannot overwrite a newer auth state.
- Final typecheck passed including provider tests. Dual-path 27/27; catalogue
  357 rows / zero governance issues; wrapper tests 14/14. Full verbose suite with
  the recorded 30-second timeout workaround: **137 files / 844 tests PASS** (140.55 s).
- AVD cold restart succeeded only at boot/package checks. Metro `/status` was
  healthy but Reload input timed out and the app ANRed. UNABLE_TO_VERIFY;
  `N0046_DEVICE_CHECK.md` records exact evidence and follow-up. N-0056 chartered.

Review uses the frontend, test, UX/accessibility and verification skill contracts.
Same-session review is not independent-person verification. No source-only visual
approval, live account wipe, or successful AVD journey is claimed here.
