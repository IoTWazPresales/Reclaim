# N-0040 — Strength / Running / Hybrid

## Mapping (existing JSON, no new column)

| Stored field | Values | Used for |
|---|---|---|
| `constraints.trainingMode` | `strength`, `running`, `hybrid`, or absent | Profile. Absent or unknown resolves to strength. |
| `profile_snapshot.trainingMode` | same | The plan build that was saved. |
| `constraints.runningGoal` / snapshot | `5k`, `10k`, `custom`, or absent | Distance label from RUNNING_DESIGN.md RD-003. Not a pace. Omitted in strength. |
| `constraints.runningDistanceKm` / snapshot | positive number, or absent | Kilometres typed for a custom goal. The planner does not turn this into minutes. |
| Plan day `template` | `run` on a running day | TEXT `template_key` already exists. No CHECK constraint was added and no migration was run. |
| Plan day `scheduledRun` | `true` only on hybrid `push`, `pull`, or `upper` | A separate run on that day. Absent on strength plans, so those day objects stay as they were. |

## Behaviour

- Unset mode and explicit strength produce the same plan.
- Running replaces each selected day with label `Run`, template `run`, and empty intents. `buildSessionFromProgramDay` does not call the lifting engine. Duration is 0.
- Hybrid keeps lifting labels, templates, and intents. `scheduledRun` is set only when the template is push, pull, or upper. Legs, lower, full body, and conditioning do not get a run. A 2-day full-body hybrid week therefore has no run day. No extra weekday is added.
- Setup save still abandons the active program and creates a new 4-week instance. Started session items are not rewritten.
- Running's Next on the schedule step saves. Strength and hybrid continue into equipment. The setup screen does not request location.

## Harness

Focused mode tests 4/4. Typecheck 0. Dual-path 31/31. Catalogue 357 rows / 0 governance issues. Full Vitest with `--testTimeout=30000`: 164 files / 1017 tests PASS in 546.82s.

## Visual

UNABLE_TO_VERIFY. `adb devices` showed emulator-5554. The screen was the Expo development launcher (`http://10.0.2.2:8081`). A following UI dump said "Error loading app" / "timeout". The dialog was dismissed. Metro was not rebuilt and the app was not reinstalled. The mode chips were not seen in the product.
