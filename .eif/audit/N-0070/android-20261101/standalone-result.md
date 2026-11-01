# Standalone Android reinstall - 2026-11-01

Result: **INSTALLED AND LAUNCHED** to Reclaim login screen. Operator uninstalled previous app and explicitly requested a fresh standalone install without a development-server dependency. This supersedes the earlier same-day launch blocker for startup only; authenticated N-0070 verification remains pending login.

Source HEAD: `35ce1e82382df886ed700daead2220e68fc4b464`, branch `fix/training-confident-ux`, existing workspace/native source. No application source edits, prebuild, native regeneration, data clear, schema change or account write. Built current source locally; no historical APK reused.

Build: app/android/gradlew.bat :app:assembleRelease -PreactNativeArchitectures=x86_64 --max-workers=2 --console=plain, NODE_ENV=production, SENTRY_DISABLE_AUTO_UPLOAD=true. Build log explicitly reports BUILD SUCCESSFUL in 42m 56s; 1228 actionable tasks (1128 executed, 100 up-to-date). PowerShell enclosing command returned 1 after native stderr warnings, despite Gradle success; actual artifact independently checked. Unit/type harness not rerun for install-only work.

APK: app/android/app/build/outputs/apk/release/app-release.apk (121249432 bytes). SHA256 `dd288c3fba18b3807875b7805ac63cba772be0782fcd70801cb780f5e7dd1987`. ZIP integrity passed. Includes assets/index.android.bundle (8123560 bytes), app.manifest and assets. AAPT confirms com.fissioncorporation.reclaim, 1.0.5/vc15, x86_64; no application-debuggable marker. Installed package flags omit DEBUGGABLE. Local release uses repository debug signing key; this is an emulator install, not store publication.

Stopped prior Metro via Ctrl+C and removed tcp:8081 reverse. Prelaunch reverse list empty and host had no listening tcp:8081 server. adb install returned Success. Normal explicit MainActivity launch (no dev-client URI) returned Status ok, COLD, TotalTime 1665 ms / WaitTime 1680 ms. These Android activity timings are not measured product first-render timings.

Directly inspected standalone-launch.local.png: actual Reclaim login UI with Email/Password, Sign Up and auth controls. No development launcher or loading-error surface. PID 8611 startup logcat captured locally (897 lines); zero FATAL EXCEPTION/Fatal signal/JavascriptException/Unable to load script markers and zero 8081/10.0.2.2/Unable to connect to Metro markers in that snapshot. No ReactNativeJS-tagged lines in this release capture; native Android logs are accessible, but full development console/debugger parity is not claimed.

Emulator retained with app open at login. No credentials entered. No authenticated journey, plan generation, session/set write, EIF acceptance or programme completion claimed. Local screenshots/APK/raw logs not staged or published. This bounded install task does not validate a programme node.
