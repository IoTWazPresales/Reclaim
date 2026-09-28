# N-0060 — notification intent serialization and acknowledgements

Authority: NotificationIntentStore owns the AsyncStorage intent document;
NotificationScheduler owns OS scheduling. Current unguarded read/modify/write
operations lose concurrent updates; fire-and-forget acknowledgement rewrites the
logical key with planned display data, so a late result can overwrite a replacement
or resurrect a cleared prompt. Timed receive also acknowledges by session only.

Serialize store operations, attach a unique revision to new writes, and compare
the delivered snapshot before marking firedAt. Preserve original payload/TTL and
await acknowledgement inside reconciliation. Bind timed receive to delivery
identity, including a safe legacy payload comparison. Keep canonical Done and
alive/FGS transport untouched. Native delivery remains separately unverified.

## Findings and boundaries

- The replacement-during-schedule test initially failed because the fingerprint
  ignored prompt identity. Include revision in the fingerprint and native plan
  signature, so a replacement reaches its own scheduling/acknowledgement pass.
- `guidedRestEndTimer` separately reads an intent, awaits a session fetch, then
  promotes the old payload through unconditional setIntent. That is a producer
  stale-snapshot race, not delivery acknowledgement. N-0066 owns a conditional
  promotion and the post-await now-slot dismissal race, coordinated with N-0059.
- Store serialization is within this JS runtime, not a cross-process database
  transaction. OS presentation and disk acknowledgement cannot be atomic; a disk
  failure after delivery is logged and remains a native reliability limitation.

## Observed verification

- Focused suite: 3 files / 26 tests PASS, including 12 new deferred store and actual
  reconciler tests, training timed-plan tests and guided duplicate-dismiss guards.
  Only AsyncStorage/native/settings boundaries are mocked; scheduler/store code is
  exercised together for delayed acknowledgement, replacement and clear races.
- Typecheck: 0 errors. Git Bash dual-path audit: 27/27 PASS.
- Full verbose Vitest: 150 files / 953 tests PASS in 183.23 seconds. Local logs:
  `.eif/audit/N0060-{focused,typecheck,vitest}.txt`.
- Same-session self-verification (R2 limitation): queue serializes load/prune/write/
  clears; failures reject without poisoning later operations; snapshot revision
  comparison is inside the queued operation; acknowledgement retains original TTL,
  timestamp and payload; old timed delivery cannot mark a newer prompt fired.
- No canonical set completion, plan writer, permission, FGS transport or foreground
  cancellation changes. N-0017/N-0059/N-0061 remain release blockers; focused
  duplicate-dismiss tests do not certify the whole watch-alive invariant.
- Native checks remain queued in `N0060_DEVICE_CHECK.md`. This is not independent
  model or device verification. No blanket exactly-once OS delivery claim.
