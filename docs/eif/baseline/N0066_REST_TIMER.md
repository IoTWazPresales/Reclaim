# N-0066 — rest-end timer identity

Status: source-validated. Not complete.
A delayed rest-end timer cannot replace a newer timed prompt or recreate a
cleared one. A stale completion cannot dismiss a newer now-slot prompt.
Native watch and foreground-service behaviour is not proven here.

## What changed

`deliverGuidedRestEnd` reads the timed intent, awaits the session, then writes
`deliverNow` only through `setIntentIfCurrent`. That write succeeds only when
the row is still the snapshot taken before the await. A replacement or a clear
during the session read is left as it is. A session that has `ended_at` is not
promoted. Delivery still goes through reconcile, not a second scheduler.

The now-slot dismiss, in the timer and in the timed-receive listener, compares
the prompt captured before the await with the prompt present after it. A newer
revision is not dismissed. A slot that was cleared may still be dismissed,
because there is no newer prompt on that id. Scheduled-row cancellation stays
in `NotificationScheduler`.

`applySetCompletion` is unchanged. The one health foreground service is unchanged.

## Proof

- Focused: `guidedRestEndDelivery.test.ts` and `promptIdentity.test.ts`, 9/9.
- `npm run typecheck`: 0 errors.
- Default full Vitest: 156 files / 979 tests PASS in 177.74s. No 5-second timeout
  this run. The N-0052 allowance is unchanged for later runs.
- Git Bash dual-path audit: 27/27.
- Catalogue QA: 357 rows, 0 governance issues.

Device steps are in `N0066_DEVICE_CHECK.md`. They were not run.
