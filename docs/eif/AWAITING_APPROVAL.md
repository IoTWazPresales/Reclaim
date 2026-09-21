# Awaiting visual approval — PRG-20260917T222550

UI that changed what the user sees. **Do not treat these as shipped** until you reply with approve / reject per node. Production chrome redesign (N-0030) stays parked.

## N-0007 training loading query truth

**What changed:** If `activeSessionId` is set and the session query **settles empty**, Training no longer stays on the “Opening session…” spinner. The id is cleared and the today list returns. Error still shows Try again + Back to training. Pending still shows spinner + Cancel.

**Renders:** AVD capture **UNABLE_TO_VERIFY** this pass (no logged-in HEAD session). Source + vitest: `app/src/lib/training/activeSessionQueryTruth.ts`.

**Approve?** N-0007

## N-0016 stale session timer (guided overnight trap)

**What changed:** Stale “Resume this session?” no longer shows a 15h+ header clock or blocks the whole app. Header shows **Paused** while the prompt is open; **Resume** starts a fresh display clock from now (`started_at` unchanged); **Minimize** / backdrop dismiss uses the existing session minimize path; dialog is dismissable.

**Renders:** AVD capture **UNABLE_TO_VERIFY** this pass (no overnight stale session on device). Source + vitest: `staleSessionTimerDisplay.ts`, `staleSessionTimerDisplay.test.ts`, `TrainingSessionView.tsx`.

**Approve?** N-0016

## N-0046 S1 separate account deletion and data reset

**What changed:** Settings and Data & privacy now explicitly say "Delete account", warn that it cannot be undone, suggest exporting first, and explain that returning requires a new account. Missing server functions no longer fall back to a partial wipe. Confirmed deletion signs out before onboarding reset; device-cleanup failures are reported separately. Review in the final build as requested; no intermediate approval stop.

**Renders:** `.eif\audit\N-0046\product-renders (UNABLE_TO_VERIFY — renders missing)`

The captures in the parent directory show only dev-launcher failure / ANR, not product UI. Exact retry and review steps: `baseline/N0046_DEVICE_CHECK.md`; N-0056 owns recovery.

**Approve?** N-0046

## N-0058 Bind account deletion and cleanup to confirmed identity across auth races

**What changed:** N-0058 binds deletion to the confirmed account and blocks navigation/new sign-in through device cleanup. The busy screen uses a live-region/busy accessibility state. 900 tests pass; actual AVD rendering remains UNABLE_TO_VERIFY (N-0056 EOF/ANR). Device steps: `baseline/N0058_DEVICE_CHECK.md`. Review in Warren's final build; no intermediate approval stop.

**Renders:** `.eif\audit\N-0058 (UNABLE_TO_VERIFY — renders missing)`

**Approve?** N-0058
