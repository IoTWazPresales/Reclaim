# N-0072 Android renders — 2026-11-04/05

Fresh local release APK from source `407bb27` (same recipe as 2026-11-01: `gradlew :app:assembleRelease -PreactNativeArchitectures=x86_64 --max-workers=2`, NODE_ENV=production, SENTRY_DISABLE_AUTO_UPLOAD=true), BUILD SUCCESSFUL 9m 4s, 121273000 bytes, SHA-256 `a579009ab42ada0b92c905fc2099d24ecbe3d65bda8bb3aff6c9c02122e94c71`, 1.0.5 / vc15, not debuggable. `adb install -r` over the existing release on AVD Medium_Phone_API_36.1 (signed-in operator account retained).

| Render | Shows |
| --- | --- |
| 03-training-week.png | Saved programme (policy v3, built 2026-11-02) replays under the new build: Week 1 unresolved · 28 warnings · **0 errors**; region line now counted once per region (Chest 10 · Back 25 · Shoulders 26 · Arms 26 · Legs 26). |
| 05-preview-mon-review.png | Session Preview (Monday, saved v3): one block "Set starting weights for 2 exercises — Dumbbell Flyes · Lat Pulldown"; no issue codes, ids or source paths (release build). |
| 06-preview-mon-exercises.png | Same preview, exercises: saved v3 prescriptions unchanged (bench 3 × 7 at 92.5 kg) — existing programmes are not rewritten. |
| 08-setup-outcome-preview.png | Setup dry-run of a new v4 build (unsaved): Monday 19 sets, primary 5 reps, accessory 9, "Barbell Bench Press: 5 reps @ 97.5kg". |
| 11-setup-upper-lower-selected.png | Draft changed to Mon/Thu only: Weekly split Auto / Full body / Upper-Lower with the one-line Upper/Lower note. |
| 12-setup-upper-lower-outcome.png | Upper/Lower dry run: Upper Body 24 sets (12 primary, 3 accessory, 9 isolation). |

**No Save** on the operator account: setup was left with Exit. Read-only check afterwards: training_profiles.updated_at still 2026-11-02 15:34:27, one programme (created 2026-11-02), 5 sessions. No session started, no set logged, nothing to delete.
