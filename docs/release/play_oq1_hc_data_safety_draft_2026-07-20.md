# Play Console — Health Connect + Data safety draft (keep-and-justify)

**Updated:** 2026-08-05  
Paste/adapt into Play Console for the **next** upload after vc11 rejection.  
**Product lock:** Keep HeartRate, ActiveCalories, Steps, SpO2, RR, BodyTemp, Sleep, WRITE_EXERCISE in the AAB.  
**Do not** add RestingHeartRate, HeartRateVariabilityRmssd, or TotalCaloriesBurned to the binary this cycle.

## Console scrub (Human — required)

Delete these declaration rows if present (they are **not** in the AAB / `withHealthConnectPermissions.js`):

- RestingHeartRate / `READ_RESTING_HEART_RATE`
- HeartRateVariabilityRmssd / `READ_HEART_RATE_VARIABILITY`
- TotalCaloriesBurned / `READ_TOTAL_CALORIES_BURNED`

Do **not** include Closed testing “Start full rollout” for old vc6 / 1.0.2 in the same submission batch.

## Health Connect permission justifications (AAB types only)

| Permission | In-app purpose (honest — match Integrations / Data & Privacy map) |
|------------|---------------------------------------------------------------------|
| `READ_SLEEP` | Import sleep sessions and stages for Sleep screen and daily signal |
| `READ_HEART_RATE` | Overnight sleep heart-rate context on Sleep; optional elevated-HR mindfulness breathing nudge |
| `READ_OXYGEN_SATURATION` | Overnight oxygen on Sleep recovery signals when available |
| `READ_RESPIRATORY_RATE` | Overnight breathing rate on Sleep recovery signals when available |
| `READ_BODY_TEMPERATURE` | Overnight temperature on Sleep recovery signals when available |
| `READ_STEPS` | **Only** inactivity confirmation before optional elevated-HR breathing nudge — **not** a step tracker or step goals |
| `READ_ACTIVE_CALORIES_BURNED` | Active calories (Health Connect) overlapping a completed training session window after finish — not a live calorie coach |
| `WRITE_EXERCISE` | Write ExerciseSession for completed guided training workouts |

## Data safety / listing notes

- Steps: safety/inactivity gate for an optional mindfulness nudge only.
- Active calories: post-workout energy from Health Connect when available; no live Wear calorie coaching claim.
- Heart rate: Sleep overnight vitals + optional mindfulness path; not clinical monitoring.
- Explicitly state we do **not** collect RHR / HRV / total calories via Health Connect.
- In-app proof: Integrations + Data & Privacy “Health Connect data we use” map; Sleep overnight vitals labeled Health Connect; session complete line can show active calories + “Saved to Health Connect”.

## Side-by-side validation before Send for review

- [ ] AAB permissions ↔ Console declaration (no ghost RHR/HRV/TotalCalories)
- [ ] Listing + Data safety ↔ same story as in-app map
- [ ] Screenshots show Sleep HR vitals and/or post-session active calories when possible
- [ ] Privacy policy URL live and matches `storeCompliance.ts`
- [ ] New production AAB (versionCode bump) includes in-app proof — Console-only scrub is insufficient for the “excessive” finding on HeartRate / ActiveCalories

## Human checklist

- [ ] Export current Console forms to `docs/memory/raw/play-console/` after submit
- [ ] Confirm every HC type in the declaration matches the table above
- [ ] Listing screenshots do not claim RHR/HRV/total calories from HC
