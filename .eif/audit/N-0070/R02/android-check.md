# R02 Android visual and saved-profile check — UNABLE_TO_VERIFY locally

On 2026-10-14, `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe devices` returned no device and `http://127.0.0.1:8081/status` was unreachable. No current AVD render was captured. Do not infer visual acceptance from source or earlier screenshots.

On a current development build with a test account:

1. Open Training setup. Choose Hybrid, three days, equipment, a restriction, Advanced experience, and skill work. Enter a 60 kg bench baseline for 8 reps.
2. On the final baselines step, inspect the preview before Save and capture a screenshot. Save, reopen setup, and confirm 60 kg and 8 reps remain. Compare the saved programme snapshot and profile constraints with the preview input; the estimated baseline should be 76 kg in both.
3. Repeat with Skip baselines after entering a weight; confirm the saved profile and programme snapshot contain no baseline input from the skipped values.
4. Choose Running and a custom distance. On the final schedule step, capture the preview and confirm it states the distance goal does not prescribe pace or duration. Save and inspect the persisted mode, goal, selected days, and snapshot.

Keep N-0070 open pending the remaining mapped tasks and its separate acceptance gates.
