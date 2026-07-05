# Defects — 2026-07-04 device QA

### DEF-20260704-01
- **Severity:** P0 (blocks QA)
- **Surface:** Dev client / emulator
- **Repro:** `npx expo start --dev-client --android` with `REACT_NATIVE_PACKAGER_HOSTNAME=10.0.2.2`; bundle reaches 100%; Reload from dev menu.
- **Expected:** App renders (login or home).
- **Actual:** White screen persists; “Bundling 100.0%…” bar remains.
- **Screenshot:** `manual/14_wait_long.png`
- **Fix owner:** Backlog — investigate on physical device first (emulator may be resource/bridgeless); may need Opus if native/bridgeless hang.
- **Blocked by:** Physical device not on adb; emulator-only repro inconclusive.

### DEF-20260704-02
- **Severity:** P2
- **Surface:** Expo dev launcher
- **Repro:** Tap Connect with `localhost:8081` on emulator without reverse.
- **Expected:** Connects to Metro.
- **Actual:** “Invalid URL host” when URL mangled via adb `input text`.
- **Screenshot:** `manual/03_connected.png`
- **Fix owner:** Composer — document `REACT_NATIVE_PACKAGER_HOSTNAME=10.0.2.2` + `adb reverse` in `DEVICE_QA_WORKFLOW.md` (done in script).
- **Blocked by:** —

### QA-INFRA-01
- **Severity:** Process
- **Note:** `adb devices` empty for physical phone during agent session. User must attach phone for logged-in QA + Play screenshots.
