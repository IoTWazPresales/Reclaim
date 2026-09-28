# N-0027 source of truth — U5 Sentry events

## Product surface

U5 is the opt-in `evening_wind_down` behavioral experiment. Its user-facing surfaces are
the Behavioral experiments switch in Settings and the experiment card on Home. The
experiment remains off by default and never concerns medication.

## Event contract

Sentry event names are closed constants with the versioned form
`reclaim.u5.experiment.<action>.v1`:

- `reclaim.u5.experiment.preference_changed.v1`
- `reclaim.u5.experiment.assignment_created.v1`
- `reclaim.u5.experiment.completion_recorded.v1`

The event name, schema version, feature and experiment identifier are Sentry tags. Only
low-cardinality state is attached as event context. User identifiers, dates, notes,
medication data and other free text are excluded from the new event properties. The
existing Sentry SDK scope and error-monitoring configuration are unchanged; this is
not a claim that global Sentry user context or breadcrumbs have been anonymized.

Capture is best effort and must never change whether a preference, assignment or
completion is persisted. Existing Supabase `app_logs` telemetry remains unchanged.

## Verification

Focused Vitest must prove the closed names match the schema, captured events use those
names/tags, and assignment/completion captures occur only after the corresponding local
write succeeds. Source grep must show U5 surfaces call the closed capture helper rather
than free-form Sentry APIs.

## Observed gates (interrupted run resumed 2026-09-28)

- Typecheck: exit 0 on 2026-09-22, unchanged product source on resume.
- Focused experiment suites: 3 files / 7 tests passed.
- Full `npm test -- --reporter=verbose`: 147 files / 923 tests passed in 418.69 s.
  Local output: `.eif/audit/N-0027/vitest.txt` (retained, not bulk-committed).
- Git Bash `npm run audit:training-dual-paths`: 27 passed / 0 failed on resume.
- Full suite includes catalogue QA (357 rows / zero governance issues), schema-drift
  and permission-use tests.
- Same-writer verification-controller review: notification/FGS/set completion/plan
  authorities are untouched; captures follow awaited persistence and ordinary repeat
  reads / duplicate-day completion do not emit again. SDK capture failure is caught.
  These events are best-effort observations, not an exactly-once accounting stream.
- No screen layout or copy changes. No AVD journey or live Sentry receipt claimed.
  `initSentry` disables delivery in `__DEV__`; release-build receipt remains a final
  operator check (enable experiment, create assignment, log one completion, inspect
  the three versioned names). Existing Settings telemetry remains unchanged.
