# Operator provenance gate - 2026-11-01

Operator approved Monday-Friday as real schedule, but explicitly requires proof that running/loaded app code is 0cecd15 before saving; stop if that cannot be proved.

Read-only checks: running PID 8611 and foreground MainActivity persist. HEAD 35ce1e82382df886ed700daead2220e68fc4b464 directly parents 0cecd15e2509a35e9551407b0de7ef689e27ba50; child commit is documentation-only. git diff --name-only 0cecd15..35ce1e8 -- app scripts/prepare-android-metro.js is empty. This supports committed product-source equivalence, not loaded runtime identity.

Local release APK and previously pulled installed APK both SHA256 dd288c3fba18b3807875b7805ac63cba772be0782fcd70801cb780f5e7dd1987. Embedded assets/index.android.bundle SHA256 9eb9bc49cdfae59437404d10e9799af6a7c19de559154deb0bd31642ace0d4f0. Embedded manifest has id/commitTime/assets, no source-commit identity. Native Expo updates is enabled. No runtime selected-update/loaded-bundle hash or executed commit marker was obtained. Installed/embedded identity is not asserted as executed identity.

Launch was a fresh local assembleRelease APK install, then adb shell am start -W -n com.fissioncorporation.reclaim/.MainActivity. No Expo dev-client URL, no Metro server, no tcp:8081 reverse. Same process retained after operator sign-in. Native Android logcat remains readable; no JS inspector/full development-console access was established.

STOPPED at operator gate 1. No UI actions, schedule/profile changes, save, start, set logging or deletion performed this turn. Monday-Friday authorization retained for later execution after proven loaded identity. Step 2 full unchanged-state report and steps 3-8 remain unexecuted; prior screenshots are partial observations only. No EIF action/acceptance or source edits.
