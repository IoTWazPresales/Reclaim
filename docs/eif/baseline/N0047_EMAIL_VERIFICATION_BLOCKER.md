# N-0047 throwaway journey — email-verification blocker

Date: 2026-09-22. Environment: the operator-started canonical
`npm run android` workflow on `emulator-5554`.

The existing signed-in account was not deleted. It was signed out normally so
the required throwaway signup journey could begin. The app's Sign Up UI was
used with a unique test address and non-reused test password. Google Password
Manager initially interrupted the form; the emulator autofill service was
temporarily disabled and restored to its exact prior value immediately after
the signup attempt.

Supabase accepted the signup and the app rendered:

> Account created! Please check your email to verify your account.

The generated test mailbox is not operator-controlled, so its verification
link cannot be received. No authenticated throwaway session was created. No
mood, medication, training, routine, or sleep data was seeded, no delete action
was attempted, and no zero-row/auth-absence result is claimed.

Human continuation:

1. In Supabase Authentication, remove the unverified test user created around
   2026-09-22 12:57 Africa/Johannesburg if present. Its address begins
   `reclaim.eif.20260922.1305` and ends `@gmail.com`.
2. Supply an operator-controlled throwaway email address, or configure an
   approved test-only confirmation path, then sign up through the AVD and open
   the verification link.
3. Resume N-0047 only after the verified throwaway session is visible. Seed all
   five required domains through app journeys, delete through the UI, then run
   the snapshot verifier and auth-user absence check.

Local screenshots under `.eif/audit/delete-account/` are diagnostic only and
must not be committed because some captures contain account identifiers. The
canonical blocker evidence is this redacted document.
