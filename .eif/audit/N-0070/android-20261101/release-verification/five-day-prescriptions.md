# Five-day saved-input prescriptions — 2026-11-01

Android accessibility text matched replayed sets/reps/weights for all 28 exercise rows. Week 1: Monday 26 October through Friday 30 October, as labelled by the app. Source replay uses the current saved programme and freshly read canonical history; it does not claim ceiling explanation text was rendered inside Session Preview.

All loads below use their stated unit. Unknown loads are confirmation-required, not prescribed zero. Ceiling values are the floor-rounded values generated in the explanation. Raw ceilings are separately recorded in stored-programme-replay.json.

| Day | Exercise | Sets × reps | Unit | Working kg | Rounded ceiling kg | Warning / comparison |
| --- | --- | --- | --- | --- | --- | --- |
| Mon | Barbell Bench Press | 3 × 7 | total_bar | 100 | 107.5 | below rounded ceiling |
| Mon | Dumbbell Flyes | 2 × 13 | per_dumbbell | Confirm weight | — | load_requires_confirmation |
| Mon | Barbell Row | 3 × 7 | total_bar | 65 | 70 | below rounded ceiling |
| Mon | Lat Pulldown | 2 × 13 | cable_stack | Confirm weight | — | load_requires_confirmation |
| Mon | Lateral Raises | 3 × 13 | per_dumbbell | 11 | 11 | EQUAL rounded ceiling; below raw ceiling |
| Mon | Barbell Curl | 3 × 13 | total_bar | 17.5 | 17.5 | EQUAL rounded ceiling; below raw ceiling |
| Tue | Barbell Back Squat | 3 × 7 | total_bar | 85 | 90 | below rounded ceiling |
| Tue | Hack Squat | 2 × 13 | cable_stack | Confirm weight | — | load_requires_confirmation |
| Tue | Conventional Deadlift | 3 × 7 | total_bar | 85 | 90 | below rounded ceiling |
| Tue | Romanian Deadlift | 2 × 13 | per_dumbbell | Confirm weight | — | load_requires_confirmation |
| Tue | Calf Raises | 3 × 13 | per_dumbbell | Confirm weight | — | load_requires_confirmation |
| Wed | Barbell Bench Press | 3 × 7 | total_bar | 100 | 107.5 | below rounded ceiling |
| Wed | Cable Chest Flyes | 2 × 13 | cable_stack | Confirm weight | — | load_requires_confirmation |
| Wed | Overhead Press | 3 × 7 | total_bar | 87.5 | 90 | below rounded ceiling |
| Wed | Lateral Raises | 3 × 13 | per_dumbbell | 11 | 11 | EQUAL rounded ceiling; below raw ceiling |
| Wed | Tricep Pushdown | 3 × 13 | cable_stack | 40 | — | same-unit population default; own ceiling unavailable |
| Wed | Face Pulls | 3 × 13 | cable_stack | Confirm weight | — | load_requires_confirmation |
| Thu | Pull-ups | 3 × 7 | bodyweight | Bodyweight | — | bodyweight; external kg not applicable |
| Thu | T-Bar Row | 2 × 13 | total_bar | 35 | 37.5 | below rounded ceiling |
| Thu | Dumbbell Curl | 3 × 13 | per_dumbbell | 14 | 14 | EQUAL rounded ceiling; below raw ceiling |
| Thu | Rear Delt Flyes | 3 × 13 | per_dumbbell | Confirm weight | — | load_requires_confirmation |
| Thu | Shrugs | 3 × 13 | per_dumbbell | 16 | 17 | below rounded ceiling |
| Fri | Conventional Deadlift | 3 × 7 | total_bar | 85 | 90 | below rounded ceiling |
| Fri | Romanian Deadlift | 2 × 13 | per_dumbbell | Confirm weight | — | load_requires_confirmation |
| Fri | Barbell Back Squat | 3 × 7 | total_bar | 85 | 90 | below rounded ceiling |
| Fri | Leg Press | 2 × 13 | cable_stack | Confirm weight | — | load_requires_confirmation; history_evidence_unverified |
| Fri | Calf Raises | 3 × 13 | per_dumbbell | Confirm weight | — | load_requires_confirmation |
| Fri | Overhead Tricep Extension | 3 × 13 | per_dumbbell | Confirm weight | — | load_requires_confirmation |

Day set totals: **16 / 13 / 17 / 14 / 16 = 76**.

Weekly review observed: **unresolved / 30 warnings / 0 errors**. The twelve per-exercise confirmation locations span 29 planned sets; leg press additionally reports unverified history. Confirmation warnings say no load has been prescribed; external zero is unspecified, not validated bodyweight. Warning provenance cites ROUTINE_AUDIT.md / RUNNING_DESIGN.md.

No cross-unit numeric inheritance observed. Bench/squat/deadlift/OHP use their entered total-bar baseline; named history loads are qualified for the exact exercise/load display mode in the replay. Tricep Pushdown uses its same-unit cable-stack population default, with no own evidence ceiling returned; its below-own-ceiling status is UNVERIFIED. Bodyweight pull-ups are not a kilogram capacity comparison.

The strict rounded-ceiling gate fails for Lateral Raises (Monday and Wednesday), Barbell Curl (Monday), and Dumbbell Curl (Thursday). All evidence-backed positive external loads are strictly below their **raw** target-rep Epley ceiling. This is a rounding/criterion distinction, not proof of a load exceeding estimated capacity or an unsafe prescription. No algorithm change proposed or made.
