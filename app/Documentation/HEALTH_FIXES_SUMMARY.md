# Health Integration Fixes - Summary

## NOT FOR PLAY CONSOLE / CURRENT RELEASE DECISIONS

This file is a **historical migration note** from earlier integration experiments.
For current release decisions, use:

- `app/Documentation/HEALTH_API_COVERAGE.md`
- `app/plugins/withHealthConnectPermissions.js`
- `app/src/lib/health/healthConnectService.ts` (`HEALTH_CONNECT_DEFAULT_METRICS`)
- `app/app.config.ts`
- `app/android/app/src/main/AndroidManifest.xml`
- `docs/release/reclaim_release_verification_report.md`
- `docs/release/reclaim_manual_submission_gate.md`

---

## CURRENT RELEASE TRUTH (Android launch posture)

- Android health flow is **Health Connect only** for the current release path.
- `ACTIVITY_RECOGNITION` is **not** declared in `app.config.ts` and is **not** present in the main app manifest.
- Declared Health Connect Android read permissions are limited to:
  - `READ_SLEEP`
  - `READ_HEART_RATE`
  - `READ_OXYGEN_SATURATION`
  - `READ_RESPIRATORY_RATE`
  - `READ_BODY_TEMPERATURE`
- Default runtime permission request bundle matches the above via `HEALTH_CONNECT_DEFAULT_METRICS`.

---

## HISTORICAL / OBSOLETE CONTEXT

The original content in this file described an older state that included:

- Samsung Health native setup guidance
- Google Fit OAuth setup steps
- broader/legacy Android permission assumptions

That guidance is **obsolete for the current Android launch path** and must not be used for submission wording or implementation decisions.

If Google Fit or Samsung are reintroduced in a future product decision, create a new doc with updated scope and date instead of reviving this guidance.
