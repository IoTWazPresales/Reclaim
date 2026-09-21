# N-0018 mood check-in single-flight control

Source of truth remains `createMoodCheckin` in the existing MoodScreen save
callback. The new MoodCheckinSaveButton adds a synchronous ref guard before the
first await, plus disabled/loading/busy state; it does not introduce another
write path, ID generator, or clinical copy. The guard lasts through the existing
save/refresh callback and releases in finally for failure/retry.

Tests invoke the actual component's press callback repeatedly in one render,
across parent rerender and through deferred success/failure. They check that only
one callback executes, accessibility progress is exposed, and later saves work.
The screen wiring test confirms the canonical write remains under this control.

AVD visual/runtime proof remains unavailable under N-0056. After recovery, rapidly
double-tap Save check-in, verify exactly one new history record/outbox row, check
the busy label with TalkBack/large text, then exercise failure/retry. Renders go
to `.eif/audit/N-0018/`; journey evidence to `.eif/audit/wave-2/mood-checkin/`.

## Executed evidence — 2026-09-21

Focused 4/4; full verbose **142 files / 904 tests PASS**, 135.03 seconds (existing
30-second timeout workaround; N-0052 still open). Typecheck 0, Git Bash dual-path
27/27, catalogue 357/0, wrapper 14/14. Local logs `.eif/audit/N0018-focused.txt`,
`N0018-typecheck.txt`, `N0018-vitest.txt`; no bulk logs or screenshots committed.

Same-agent adversarial review checked stale callbacks and retry release. Separate
pre-existing findings are chartered as N-0062: the caller's catch treats later
refresh failure as failed persistence, and setNote('') can erase newer draft text.
This node fixes repeated in-flight presses only; it does not claim those findings
or cross-unmount/device journey behavior are resolved.
