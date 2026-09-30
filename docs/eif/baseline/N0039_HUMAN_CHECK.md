# N-0039 — late Health Connect calorie re-read

Source tests cover the decision. This check is the worn-watch case.

1. On a phone with Health Connect, wear the watch and finish a Reclaim session. Note the session start and end.
2. Confirm Reclaim is allowed to read Active calories.
3. If ActiveCaloriesBurned for that window appears in Health Connect only after the session ends, that is hypothesis (b).
4. Leave Reclaim open for about a minute, or open Training history within 30 minutes of the end. The session summary should gain `activeCaloriesKcal`, `energySource` = `health_connect`, `energyReadAt`, and `energyWindow` for that same start and end.
5. Confirm the session items do not gain a per-set calorie field. Health Connect active-calorie records are intervals, not sets.
6. If the first read was already the full total, a later smaller read must not reduce it.

Do not mark the node complete from this file alone. Record what the phone showed.
