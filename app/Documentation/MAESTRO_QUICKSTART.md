# Maestro auto-test — full step-by-step

Follow these steps in order to run Maestro against Reclaim (alpha build + alpha Supabase). Commands assume Windows PowerShell unless noted.

---

## Prerequisites (one-time)

- **Node.js** — you already have this for the app.
- **Java 17+** — Maestro needs it. Check: `java -version`. If missing, install [Temurin JDK 17](https://adoptium.net/) and set `JAVA_HOME`.
- **Android SDK / `adb`** — needed so Maestro can talk to the device/emulator.  
  - If you use Android Studio, `adb` is usually at `%LOCALAPPDATA%\Android\Sdk\platform-tools`.  
  - Check: `adb version`.  
  - If `adb` is not in PATH, add it (PowerShell, one-time):
    ```powershell
    [Environment]::SetEnvironmentVariable("Path", $env:Path + ";$env:LOCALAPPDATA\Android\Sdk\platform-tools", "User")
    ```
    Then close and reopen PowerShell.
- **Device or emulator** — physical Android device with USB debugging, or an Android emulator (e.g. from Android Studio). Emulator: open Android Studio → Device Manager → start a virtual device.

---

## Step 1 — Install Maestro CLI

**Option A — Script (if you have Git Bash or WSL)**  
In Git Bash or WSL:
```bash
curl -fsSL "https://get.maestro.mobile.dev" | bash
```
Then add the install dir to PATH (script usually prints it, e.g. `$HOME/.maestro/bin`). In PowerShell you’d add that path to your user PATH.

**Option B — Windows without bash (recommended on plain PowerShell)**

1. Download the latest Maestro zip:  
   https://github.com/mobile-dev-inc/maestro/releases/latest  
   Get **maestro.zip** from the assets.

2. Extract it to a folder, e.g. `C:\maestro` (so you have `C:\maestro\bin\maestro.bat`).

3. Add that `bin` folder to your user PATH. In PowerShell (run once):
   ```powershell
   setx PATH "%PATH%;C:\maestro\bin"
   ```
   Use the path where you actually extracted (e.g. `D:\tools\maestro\bin`).

4. **Close and reopen PowerShell**, then check:
   ```powershell
   maestro --version
   ```
   You should see a version number.

---

## Step 2 — Reclaim app build on the device/emulator

Use the same build you use for alpha (current build + alpha Supabase). Only one of the two options below is needed.

**Option A — Local build (good for quick iteration)**

1. Open a terminal in the repo.
2. From the **app** folder, run:
   ```powershell
   cd c:\Reclaim\app
   npx expo run:android
   ```
   Use your normal `.env` or env that has `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (alpha).

3. When the build finishes, the app installs and launches on the connected device/emulator. Leave the device/emulator on and connected.

**Option B — EAS preview APK**

1. Build:
   ```powershell
   cd c:\Reclaim\app
   eas build --profile preview --platform android
   ```
2. When the build finishes, download the APK from the EAS link.
3. Install on your device/emulator:
   ```powershell
   adb install "C:\path\to\downloaded\build.apk"
   ```
4. Open the Reclaim app once on the device so it’s installed and ready.

---

## Step 3 — App state (signed in and onboarded)

The existing Maestro flows assume you’re **past login and onboarding**.

1. On the **same device/emulator** where the app is installed:
   - Open Reclaim.
   - If you’re not signed in, sign in (alpha Supabase).
   - If you see onboarding, complete it.
2. Get to the main app (tabs / home). You can leave the app in the background or close it — Maestro will launch it again.

---

## Step 4 — Check device is visible to Maestro

Maestro uses the same connection as `adb`.

1. List devices:
   ```powershell
   adb devices
   ```
   You should see your emulator or phone (e.g. `emulator-5554 device`). If you see "unauthorized", unlock the device and accept USB debugging.

2. If you use **multiple devices**, tell Maestro which one (optional):
   ```powershell
   $env:MAESTRO_DEVICE_ID="emulator-5554"
   ```
   Use the device id from `adb devices`.

---

## Step 5 — Run Maestro flows

All commands from the **app** directory so `.maestro/` is found.

The flows **wait for the app to be ready** (up to 30s for “Open navigation menu”) so you don’t get screenshots of a white/rebundle screen. They then **navigate by tapping** (open drawer → tap Sleep, Mood, Meds, etc.) and take a screenshot on each screen. Maestro **logs every step** in the terminal so you can see what it’s doing.

1. Go to the app folder:
   ```powershell
   cd c:\Reclaim\app
   ```

2. Run the **smoke** flow (launch, wait for ready, one screenshot):
   ```powershell
   maestro test .maestro/smoke.yaml
   ```
   - Maestro starts the app, waits until the main UI is visible, then takes one screenshot.  
   - If it passes, you’ll see a success message and a path to the screenshot.

3. Run the **alpha smoke** flow (tap through drawer to every main screen):
   ```powershell
   maestro test .maestro/alpha-smoke.yaml
   ```
   - The app opens, Maestro waits for the header, then opens the **drawer** and taps **Sleep**, **Mood**, **Meds**, **Exercise**, **Mindfulness**, **Meditation**, **Integrations**, **Settings**, **Notifications**, **About** in turn, taking a screenshot on each.  
   - Watch the device/emulator; you should see the menu open and the app switch screens. Each step is printed in the terminal.

4. Run **all** flows in `.maestro/`:
   ```powershell
   maestro test .maestro/
   ```
   Or use the npm script:
   ```powershell
   npm run e2e
   ```

---

## Step 6 — Confirm it worked

- **Smoke**: No errors; one screenshot after the app is ready (path printed in the log).
- **Alpha smoke**: No errors; the app visibly opens the drawer and navigates to each screen; screenshots 01-home, 02-sleep, 03-mood, … 11-about. Terminal shows each tap and screenshot step.
- **Both**: Run `npm run e2e` anytime to re-run the full set (alpha build + alpha Supabase, same device).

---

## Troubleshooting

| Problem | What to try |
|--------|-------------|
| `maestro` not found | PATH not updated after install. Add the `bin` folder to PATH and restart PowerShell. |
| `JAVA_HOME` / Java errors | Install Java 17+, set `JAVA_HOME`, run `java -version`. |
| No devices found | Run `adb devices`. Start emulator or connect phone with USB debugging. |
| App not found / wrong app | Flows use `appId: com.fissioncorporation.reclaim`. Your build must use that package id (default for this project). |
| Flows open Auth or Onboarding | Maestro deep-links into the app, but if the app shows Auth/Onboarding on top, complete sign-in and onboarding once on that device (Step 3). |
| Timeouts / element not found | Device might be slow or UI different. Increase timeouts in the YAML or run with a single flow to see which step fails. |

---

## Next steps

- Run `npm run e2e` (or `maestro test .maestro/`) regularly as a smoke check.
- Add more flows under `app/.maestro/` for settings, analytics, notifications, etc. (see `MAESTRO_AUTO_TEST_SETUP.md`).
- Screenshots are useful for visual regression; they’re under the path Maestro prints (e.g. in `~/.maestro/`).
