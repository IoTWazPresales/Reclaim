# N-0046 rendered account-deletion review — 2026-09-22

Environment: the operator-started canonical `npm run android` workflow on
`emulator-5554`; no restart, reinstall, app-data clear, or product change.

Observed:

- Settings → Data & Privacy renders a destructive **Delete account** action.
- The separate Data & Privacy screen describes permanent account and personal
  data removal, device clearing, and sign-out; its action is also **Delete
  account**.
- Tapping the separate-screen action opens the native confirmation titled
  **Delete account?**. Its copy says the Reclaim account and personal data are
  permanently deleted, local data is cleared, the user is signed out, the
  operation cannot be undone, and export should be done first if desired.
- UIAutomator hierarchy exposes focusable, clickable **CANCEL** and **DELETE
  ACCOUNT** buttons. Cancel returned to the Data & Privacy screen; the Reclaim
  PID and focused MainActivity remained present. No deletion was invoked on the
  existing signed-in account.

Evidence (local, binary-safe ADB transfer):

- `.eif/audit/N-0046/product-renders/privacy-open.png`
- `.eif/audit/N-0046/product-renders/privacy-screen.png`
- `.eif/audit/N-0046/product-renders/privacy-bottom.png`
- `.eif/audit/N-0046/product-renders/delete-confirm.png`
- `.eif/audit/N-0046/product-renders/delete-confirm.xml`
- `.eif/audit/N-0046/product-renders/after-cancel.png`

Result: rendered copy, cancel behavior, and basic accessibility semantics are
verified. Account deletion itself was not executed here; N-0047 owns the
throwaway destructive journey. Operator acceptance remains pending for the
final review build.
