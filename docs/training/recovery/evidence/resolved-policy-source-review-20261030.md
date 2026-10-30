# Separate source review - 2026-10-30

Scope: D-P2-01 and v2 cap precedence against `DECISIONS_PENDING.md`, R06 and
baseline `1e18694`. A separate read-only reviewer inspected the product diff
and re-reviewed the corrections. Final outcome: **no remaining source blockers**.
This is source review, not independently repeated runtime/replay/test evidence.

Findings corrected and re-reviewed:

- Direct `buildSession` now applies one policy choice to caps and loading.
- A leftover edit timestamp for a cleared baseline is ignored by engine and
  independent validator, so qualified history still supplies its Epley ceiling.
- v1 allocated duration retains its original compound-based estimate; v2 uses
  the same costs for cap enforcement and the returned estimate.
- Inferred compounds use the same six movement intents as the engine; explicit
  isolation overrides retain direct small-muscle ownership. The heavy-plus-fly
  regression exposed and now prevents counting bench work against triceps.
- Owner accounting follows successfully materialized exercises, so rejected
  allocation slots cannot shift owner identity.
- The final validator independently reconstructs the governing baseline/history
  ceiling, including availability, qualification, consistency, barriers, recency
  and unit identity; it independently checks v2 exercise and owner totals.

Timestamp storage uses existing profile constraints/programme snapshot JSON.
Only editing an exercise's weight or reps changes its timestamp. Reopening setup
preserves it; entered values and estimated baselines are never replaced by history.
Undated legacy baselines yield to qualified timestamped history; invalid supplied
baseline timestamps and ties conservatively retain the baseline.

Regression evidence covers v1 load+history replay, historical allocated minutes,
frozen planned items, explicit user priority/session caps, secondary involvement,
and distributing direct weekly totals across once/twice exposure preferences.
The pre-existing helper uses `ceil(weekly / exposures)`: non-divisible exposure
counts can round totals upward. This task does not change decision-4 behavior,
weekly objective tables, frequency routing, or claim exact invariance for every
possible exposure count. D-P2-04 remains open.

No Android, live writes, migration, EIF acceptance, or R12.
