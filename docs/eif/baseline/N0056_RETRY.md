# N-0056 bounded emulator retry — 2026-09-21

Source of truth: the installed Android debug client and observed rendered UI,
not Metro health alone. Existing failure evidence is in N0046_DEVICE_CHECK.md.

Warren requested a fresh attempt, with a new stop condition: if Reclaim still
does not work, stop and report so he can uninstall it, then resume to reinstall.
Do not clear app data or uninstall during this attempt. No product code changes.

Run R20260921B; lease N-0056 through scripts/eif_node.py. One writer; hooks off.
Self-verification only; no independent review claimed.

Attempt: cold headless Medium_Phone_API_36.1, installed client, local Metro,
ADB reverse 8081. Processes have 900-second lifetime bounds; individual device
commands also have timeouts.

Result: FAILED / UNABLE_TO_VERIFY. Android eventually reported
`sys.boot_completed=1`; package inspection confirmed 1.0.5/versionCode 15,
DEBUGGABLE, with the expected exp+reclaim-app scheme. Metro initially returned
`packager-status:running` (a later request timed out after 10 seconds).
The post-boot activity launch returned Status: ok, but the binary-safe captured
and visually inspected `.eif/audit/N-0056/launch.png` shows **System UI isn't
responding**, not usable Reclaim UI. An earlier intent attempt before boot
completion could not resolve the activity. No product journey passed.

Stop per Warren's latest instruction. No uninstall, app-data clearing, native
rebuild, or product source changes were performed. A Reclaim reinstall is not
proven to fix an Android System UI ANR; root cause remains undiagnosed.
After Warren removes the emulator's Reclaim app and says continue, reinstall
the debug client, retry the device gate, then resume wave 2 at N-0026.

## Post-uninstall reinstall attempt — R20260921C / 2026-09-22

The interrupted run was reconciled before continuing. Revision 195 contained
only the R20260921C N-0056 lease; there were no product-code edits and no APK
install had occurred. The AVD was no longer attached. Astra's last command had
observed a booted emulator with no package path, consistent with Warren having
removed Reclaim.

The visible `Medium_Phone_API_36.1` AVD was started once with
`-no-snapshot-load`, reached `sys.boot_completed=1`, and the existing checked
debug APK was installed successfully. Package inspection confirmed Reclaim
1.0.5 / versionCode 15 / DEBUGGABLE. Metro returned
`packager-status:running`; `adb reverse --list` showed
`tcp:8081 -> tcp:8081`.

The development-client intent launched successfully at the Android activity
level, but the rendered screen was **There was a problem loading the project**
with `java.net.SocketTimeoutException: Read timed out`. Reclaim product UI did
not render. Binary-safe evidence is local at
`.eif/audit/N-0056/reinstall-launch.png` and the hierarchy at
`reinstall-launch.xml`. Unlike the prior attempt, Android System UI remained
responsive.

Targeted logcat also showed the installed dev launcher failing during startup
to resolve `expo.modules.splashscreen.SplashScreenManager` with a
`ClassNotFoundException`. This is evidence of a possible stale or inconsistent
native debug client, not a proven root cause of the socket timeout. No native
rebuild, app-data manipulation, emulator restart, or reload loop was attempted.

**Result: BLOCKED / UNABLE_TO_VERIFY.** Per Warren's explicit stop condition,
stop and report rather than repeat the failed recovery loop. A fresh native
debug build is the next distinct recovery action if he asks to continue. No
N-0046/N-0047 journey passed and no visual product approval is claimed.
