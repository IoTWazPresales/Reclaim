# Standalone Android verification continuation - 2026-11-01

Result: **PARTIAL RUNTIME VERIFICATION; schedule clarification pending**. Signed-in Home, Training, saved setup, Session Preview and exercise illustration rendered in the retained standalone process (PID 8611). No reinstall/restart/Metro was needed. Installed base.apk pulled and SHA256 exactly matches fresh local release `dd288c3fba18b3807875b7805ac63cba772be0782fcd70801cb780f5e7dd1987`. This proves installed artifact identity; no runtime JavaScript inspector or OTA-selection identity proof was available and these are not equated.

Observed directly from private local screenshots:
- Signed-in Home and responsive Training navigation.
- Training shows Next Session rather than an active-session banner. No existing session was ended. This is a UI observation, not an exhaustive live DB open-session audit.
- Existing programme review says unavailable because weekly diagnostics are missing from the older programme. Completed/frozen/provisional distinctions render.
- Saved setup has Tuesday/Thursday selected (2 days/week), Strength, Intermediate. Available equipment and optional empty baseline inputs inspected without editing/saving. Pending historic replay expected five days; current schedule therefore differs materially. Operator asked whether to use Monday-Friday or keep two days. No selection answer received during this continuation.
- Existing programme Session Preview opens, shows six exercises and estimated duration; bench row shows total-bar load and another row asks to enter a weight rather than portraying an unspecified load as calibrated zero. Exercise illustration/help opens successfully. These observations concern the existing programme; no new-policy load/count parity is inferred.

No Save/Skip baselines/Delete program/Start/Done was tapped. No profile/program/session/set mutation was initiated. Setup closed via Exit. Exercise help and preview closed via Android back at end; retained app remains available. No new test records require cleanup. Raw screenshots/logs/installed APK retained locally only because Home contains personal health information.

Fresh process log snapshot crash-marker count: 0. No app defect was established. UIAutomator dump failed to obtain idle state (animated screen); actual screenshot pixels inspected instead. Coordinates mapped to actual 1080x2400 screen, with settled screenshots after navigation.

Remaining: schedule choice; new-build generation and exact five-day replay (only if chosen and equivalent inputs established); confirmation/history explanations; frozen-session/guidance/persistence/cleanup checks. No N-0070 acceptance, complete, source edits, live DB reads through administrative tools, migrations, R12 or independent rendered review.
