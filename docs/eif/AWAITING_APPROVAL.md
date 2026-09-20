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
