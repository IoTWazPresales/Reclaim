# N-0011 — weekly volume model

Status: source-validated for the caps and the fractional count that the audit actually defines. Not complete. The charter line asks for fractional sets/muscle/week bands and a session cap of 10. Those bands are not in the audit or the rules, so they were not added. This does not make the routine scientifically correct. Weeks 1–4 are still copies. Started and guided planned sets stay frozen.

Executor: Grok 4.7.

## Mapping

| Source | Value | What the evidence supports | What was not applied |
|---|---|---|---|
| `rules.v1.json` `volumeCaps.perIntent.primary` | 25 | Planned sets of primary-priority exercises in the session being built | Not a muscle/week band |
| `volumeCaps.perIntent.accessory` | 15 | Planned sets of accessory-priority exercises in that session | Not a muscle/week band |
| `volumeCaps.perIntent.isolation` | 10 | Planned sets of isolation-priority exercises in that session | Not a session cap of 10 |
| `volumeCaps.perSession.total` | 120 | Planned sets in that one session | Not 10 |
| `ROUTINE_AUDIT.md` RA-006 user-impact sentence | “e.g. 10–20 sets/muscle/week” | An example of the missing allocator | Not an accepted band |
| Harness credit, now `fractionalSetsByMuscle` | 1.0 × sets per primary tag, 0.5 × sets per secondary tag | The count. A tag in both lists receives both credits | Not a minimum or maximum |
| `experienceLevels.*.maxExercises` | 6 / 8 / 10 | Already applied by N-0022 as an exercise count | Not changed into a set cap |

`perIntent` children are the same primary / accessory / isolation keys as `setsPerIntent`. They are exercise priorities, not movement intents and not muscles. RA-006 records `volumeCaps` as unused by the engine. The unit read as sets is the unit of `setsPerIntent`. The JSON names a session scope only on `perSession.total`. The role caps are applied to the same new session, because the file does not name a week scope.

A full-gym probe before the clamp, week totals for omitted/beginner experience:

| Plan | Primary sets in one session | Accessory | Isolation | Session total | Week primary | Week isolation |
|---|---|---|---|---|---|---|
| Muscle, 3 days | 12 | 0–4 | 0–6 | 16–18 | 36 | 12 |
| Strength, 6 days | 12–16 | 0–9 | 0–4 | 18–22 | 92 | 12 |
| Advanced strength, 6 days | 12–16 | 6–9 | 0–5 | 21–27 | 92 | 20 |

No measured session crossed 25 primary, 15 accessory, or 120 total. Advanced muscle push isolation landed on 10, not above it. Week role totals do cross 25 and 10. Treating 25/15/10 as weekly ceilings would be a scope the JSON does not state, so new plans were not cut that way. `docs/training/ROUTINE_VOLUME_BASELINE.md` was regenerated and its scenario numbers did not change.

## What a new plan does

`buildSession` reads `volumeCaps` and shortens or omits the next exercise when another set would pass a role ceiling or the session total. Product builds do not pass a substitute cap. A test can pass a tighter cap and the new session stops inside it. `plannedItemsForSession` still returns the stored snapshot for a started session and for a guided session that already has items.

The weekly sets line is unchanged. It still adds one count per primary tag. The fractional count is the separate account N-0020 left for this node.

## Proof

- Focused: `weeklyVolumeModel.test.ts` 6/6, plus golden quality, the volume harness, and `buildProgramDaySession` (20 tests in that Python run).
- `npm run typecheck`: 0 errors.
- Git Bash dual-path audit: 29/29.
- Default full Vitest: 160 files, 999 passed / 1000 tests, 268.55s. The one failure was a 5-second timeout in `smallModuleMirrors.read` (`dedupes duplicate local_id rows`). That default run is not a pass. It is N-0052.
- Full retry, `--testTimeout=30000`: 160 files / 1000 tests PASS in 322.60s.
- Catalogue QA: 357 rows, 0 governance issues.

No screen changed on the measured plans, so there is no approval render. The Training “Couldn’t load this session” error from 2026-09-29 is a different failure and was not touched. Do not mark N-0011 complete from this source work.
