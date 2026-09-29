# N-0023 — four-week progression

Status: source-validated for the week index and the deload exclusion that the rules and the audit actually define. Not complete. The charter line asks for week 1–4 sets, load, and RIR. `ROUTINE_AUDIT.md` RA-001 names week multipliers only as an example of a later fix. RA-010 names an RIR field and does not give targets. `rules.v1.json` has no week multiplier and no RIR key. Those numbers were not invented. This does not make the routine scientifically correct. Started and guided planned sets stay frozen.

Executor: Grok 4.7.

## Mapping

| Source | What it defines | What a new plan does | What was not applied |
|---|---|---|---|
| Planner `week_index` 1–4 | Which week the program day belongs to | Recorded on `SessionPlan.weekIndex` | Not a load or set scale |
| `acceptedProgramWeekIndex` | Only 1, 2, 3, or 4 | Any other value is omitted | Not coerced into a week |
| RA-001 suggested fix | “apply week multipliers or template variants (e.g. intensity/volume/deload)” | The example is not a table | No week multiplier |
| RA-010 | Planned sets have no RIR field | Still no `targetRir` | No RIR target by priority or goal |
| `progressionRules` | When to add reps or weight; linear increment 2.5% with a 10% cap | Unchanged. The engine still uses the existing double-progression decision | Not turned into a four-week wave |
| `decideDoubleProgression` deload | Two holds → 10% , step-rounded, `incrementKg` 0 | `suggestLoading` returns that deload weight | The increase step is not added on top |

Week 1 and week 4 of the same new build keep the same exercises, set counts, target reps, suggested weights, and rest. The reactive 10% deload after two holds stays the deload action. It is not a second pass of the increase.

## Proof

- Focused: `fourWeekProgression.test.ts` 3/3.
- `npm run typecheck`: 0 errors.
- Git Bash dual-path audit: 29/29.
- Catalogue QA: 357 rows, 0 governance issues.
- Default full Vitest: 161 files, 1002 passed / 1003 tests, 441.21s. The one failure was a 5-second timeout in `smallModuleMirrors.read` (`dedupes duplicate local_id rows`). That default run is not a pass. It is N-0052.
- Full retry, `--testTimeout=30000`: 161 files / 1003 tests PASS in 476.93s.

No screen copy changed. The week index is not a new visible control. Do not mark N-0023 complete from this source work.
