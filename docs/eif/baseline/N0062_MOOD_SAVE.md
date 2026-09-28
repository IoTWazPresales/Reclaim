# N-0062 — mood save outcome and draft preservation

Source of truth: `createMoodCheckin` remains the sole write; the existing
`MoodCheckinSaveButton` ref guards same-frame duplicate submissions. MoodScreen
currently clears any current note after persistence and catches persistence and
subsequent refresh failures together, incorrectly offering a failed-write outcome.

Move the bounded save interaction into `useMoodCheckinSave`, retaining the guarded
button. Clear only the submitted unchanged note. Handle write failure separately;
settle query invalidation, forecast grading and insight refresh independently, then
report saved even when a follow-up fails. No extra write or automatic retry.

Test through a rendered hook/real guarded button with deferred persistence and
refresh, including edits, same-frame presses and real write-failure retry. Source
gates and device acceptance will be recorded separately. N-0018's source behavior
is preserved; its outstanding visual acceptance is not waived by this finding fix.

## Verification

- Focused rendered tests: 2 files / 11 tests PASS, including the existing N-0018
  guard and seven new deferred/refresh scenarios. API, forecast and native Alert
  boundaries are mocked; real React state and the real guarded button are exercised.
- Typecheck: 0 errors. Git Bash dual-path audit: 27/27 PASS.
- Full verbose Vitest: 148 files / 930 tests PASS in 177.25 seconds. Local logs:
  `.eif/audit/N0062-{focused,typecheck,vitest}.txt`.
- Same-session self-verification (R1): one canonical write, no automatic retry,
  submitted rating/tags retained across rerenders, functional note clearing, each
  follow-up attempted even if another rejects, button finally releases after both
  success and true write failure. No new notification/training/data deletion path.
- Device check: no attached ADB device; Metro connection refused on 2026-09-28.
  `N0062_DEVICE_CHECK.md` records the pending journey. Not independent-model or
  AVD verification; no visual acceptance claimed.
