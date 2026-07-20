# Play Console — Health Connect + Data safety draft (2026-07-20)

Paste/adapt into Play Console for the next upload. **Keep** `READ_STEPS` and `READ_ACTIVE_CALORIES_BURNED` (Human lock). Align Console with the APK.

## Health Connect permission justifications

| Permission | In-app purpose (honest) |
|------------|-------------------------|
| `READ_SLEEP` | Sleep import + Sleep screen |
| `READ_HEART_RATE` | Sleep enrichment + optional elevated-HR mindfulness nudge |
| `READ_OXYGEN_SATURATION` | Overnight vitals on Sleep |
| `READ_RESPIRATORY_RATE` | Overnight vitals on Sleep |
| `READ_BODY_TEMPERATURE` | Overnight vitals on Sleep |
| `READ_STEPS` | **Only** inactivity confirmation before optional elevated-HR breathing nudge — **not** a step tracker |
| `READ_ACTIVE_CALORIES_BURNED` | Read-back overlapping a completed training session window after finish |
| `WRITE_EXERCISE` | Write ExerciseSession for completed training sessions |

## Data safety / listing notes

- Steps: describe as safety/inactivity gate for an optional mindfulness nudge, not fitness competition or step goals.
- Active calories: post-workout energy from Health Connect when available; no live Wear calorie coaching claim.
- Default connect still focuses on sleep + overnight vitals; steps/calories are requested on feature paths (Integrations screen copy explains this).

## In-app truth (this build)

Integrations “Connect & sync” caption + info card document steps + active-calorie feature paths. Signal graph + ledger explanations consume activity/training factors when present.

## Human checklist

- [ ] Export current Console forms to `docs/memory/raw/play-console/` after submit
- [ ] Confirm every HC type in the declaration matches the table above
- [ ] Listing screenshots do not claim RHR/HRV/total calories from HC if not product features
- [ ] Privacy policy URL live and matches `storeCompliance.ts`
