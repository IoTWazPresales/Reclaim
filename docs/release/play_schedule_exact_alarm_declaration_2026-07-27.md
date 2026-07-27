# Play Console — SCHEDULE_EXACT_ALARM declaration (2026-07-27)

Paste/adapt into Play Console when declaring sensitive permissions for the next upload.

**Do not** declare or use `USE_EXACT_ALARM` (wrong category for this app).

## Permission

| Permission | Declared in APK? | Runtime |
|------------|------------------|---------|
| `SCHEDULE_EXACT_ALARM` | Yes (`app.config.ts` / manifest) | Android 12+; Android 14+ defaults **Alarms & reminders** OFF until the user enables it |

## Use-case justification (honest)

Reclaim schedules **user-initiated guided workout rest / next-set** wall-clock prompts while a training session the user started is open. Exact alarms improve delivery of those rest-end alerts when the phone is idle or locked. They are **not** used for advertising, engagement spam, or background sync.

When exact alarms are denied, guided training still runs: an open-session foreground service timer presents rest-end via the existing notification intent / reconcile path.

## In-app behavior (this build)

- Soft prompt at guided session start if exact alarms are denied (Open settings / Not now).
- Prompt never blocks starting guided mode.
- Settings deep-link uses `ACTION_REQUEST_SCHEDULE_EXACT_ALARM` (package-scoped).

## Human checklist

- [ ] Console permission declaration matches this use case (user-initiated workout rest timing)
- [ ] Confirm APK still has `SCHEDULE_EXACT_ALARM` and **not** `USE_EXACT_ALARM`
- [ ] Locked-phone smoke: Alarms OFF → rest-end still arrives via FGS path; Alarms ON → OS at-alarm best-effort also present
