# Phase 0 — two answers first

**Recorded:** 2026-09-17  
**Branch:** `fix/training-confident-ux` @ `c63cdd9`  
**Host:** `C:\Reclaim`  
**Evidence class:** mixed — (a) executable observation; (b) source read.

This file is the Phase 0 commit artifact. Later EIF discovery must treat these answers as measured, not as memory.

---

## (a) Can this agent run the app and read live runtime?

**Short answer:** Partially. I can boot an emulator, launch Reclaim, and read `adb logcat`. I cannot attach Expo Metro / a debug JS bundle / React Query Devtools / `[GUIDED_TRACE]` to **current HEAD**. Downstream diagnosis of current-branch behaviour is therefore **source-only plus a stale production APK**, and is weaker than a debug session of this tree.

### What I ran (VERIFIED)

1. `adb` is not on PATH. It exists at `%ANDROID_HOME%\platform-tools\adb.exe` (`C:\Users\warren_eliason\AppData\Local\Android\Sdk`).
2. No physical device was attached. AVD `Medium_Phone_API_36.1` exists.
3. Started headless emulator:

```text
emulator.exe -avd Medium_Phone_API_36.1 -no-window -no-audio -gpu swiftshader_indirect
```

4. `adb devices -l` after boot:

```text
List of devices attached
emulator-5554          device product:sdk_gphone16k_x86_64 model:sdk_gphone16k_x86_64 device:emu64xa16k transport_id:1
```

5. `sys.boot_completed=1`. Package already installed: `package:com.fissioncorporation.reclaim`.
6. Package dumpsys (not current tree):

```text
versionCode=8 minSdk=29 targetSdk=36
versionName=1.0.4
lastUpdateTime=2026-07-27 17:03:06
pkgFlags=[ HAS_CODE ALLOW_CLEAR_USER_DATA ALLOW_BACKUP KILL_AFTER_RESTORE ]
```

`DEBUGGABLE` is absent. This is a **release** APK from 2026-07-27, not HEAD (`app.config.ts` local floor is version `1.0.5` / `versionCode` 15).

7. Launched: `adb shell am start -n com.fissioncorporation.reclaim/.MainActivity`. Process pid `3162`. Top activity:

```text
topResumedActivity=ActivityRecord{156812690 u0 com.fissioncorporation.reclaim/.MainActivity t243}
```

8. Screenshot (Home, authenticated session, overlay “Bluetooth keeps stopping”): `docs/eif-bootstrap/phase0-emulator-launch.png`.

### Logcat (pasted, live process)

React Native JS tags from this launch (`docs/eif-bootstrap/phase0-logcat-rn.txt`):

```text
09-17 12:12:47.465 W/ReactNativeJS( 3162): [expo-av]: Expo AV has been deprecated and will be removed in SDK 54. Use the `expo-audio` and `expo-video` packages to replace the required functionality.
09-17 12:12:47.547 I/ReactNativeJS( 3162): Running "main"
09-17 12:13:04.233 I/ReactNative( 3162): [GESTURE HANDLER] Initialize gesture handler for root view com.facebook.react.runtime.ReactSurfaceView{541ba02 V.E...... .......D 0,0-1080,2400 #1}
```

Native/Expo excerpt from pid `3162`:

```text
09-17 12:12:42.760 I/Zygote  ( 3162): Process 3162 created for com.fissioncorporation.reclaim
09-17 12:12:43.606 W/FirebaseApp( 3162): Default FirebaseApp failed to initialize because no default options were found.
09-17 12:12:43.674 W/SoLoader( 3162): Initializing SoLoader: 0
09-17 12:12:46.042 I/ExpoModulesCore( 3162): AppContext was initialized
09-17 12:12:46.474 I/ExpoModulesCore( 3162): JSI interop was installed
09-17 12:12:46.479 I/ExpoModulesCore( 3162): Constants were exported
09-17 12:12:47.547 I/ReactNativeJS( 3162): Running "main"
09-17 12:12:48.022 I/dev.expo.updates: Updates state change: Check ...
09-17 12:12:48.263 I/dev.expo.updates: Updates state change: CheckCompleteUnavailable ...
09-17 12:12:50.718 I/Choreographer( 3162): Skipped 115 frames!  The application may be doing too much work on its main thread.
09-17 12:13:33.421 W/unknown:ReactNative( 3162): Unsupported type for radius property: Null
```

No `[GUIDED_TRACE]` lines in this session. The Home UI was visible (greeting, Daily signal, meds insight). The system ANR-style sheet “Bluetooth keeps stopping” sat on top of it (`phase0-window-dump.xml`).

### Expo Metro from this workspace (VERIFIED)

From `c:\Reclaim\app`:

```text
env: load .env.local .env
Starting project at C:\Reclaim\app
Metro is running in CI mode, reloads are disabled. Remove CI=true to enable watch mode.
Starting Metro Bundler
› Opening exp+reclaim-app://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081 on Medium_Phone_API_36.1
Waiting on http://localhost:8081
Logs for your project will appear below.
```

Metro started. It deep-linked the **development client** URL at the release APK. That APK is not a debug/dev-client binary of this checkout. Metro produced **no** subsequent bundle log for the running process. I did not run `expo run:android` (native rebuild) in this phase.

### What I cannot do from this session

| Surface | Status |
|---------|--------|
| Emulator boot + `adb` | Yes |
| Launch Reclaim UI | Yes — stale **1.0.4 / vc8** |
| `adb logcat` including `ReactNativeJS` | Yes — release JS log is almost empty |
| Expo Metro serving **this** tree into the running app | No (needs a debug/dev-client install of HEAD) |
| React Query Devtools | No — `QueryClientProvider` exists in `app/App.tsx`; no Devtools component in `app/src` |
| `[GUIDED_TRACE]` live | Not observed; not in this session; release APK may strip it |
| Current-branch live app state | No |

**Implication for later phases:** bug reproduction against current generator/notification/onboarding code is **source-and-test**, not live-device on HEAD, until a debug build of this branch is installed.

---

## (b) Is the training-program generator rule-based in the app, in Supabase, or a model?

**Answer:** Rule-based **in the app**. It does not call a model. Supabase stores the generated plan; it does not generate it.

### Exact functions (VERIFIED by reading the files)

| Role | File | Function |
|------|------|----------|
| 4-week split / day labels / intents | `app/src/lib/training/programPlanner.ts` | **`buildFourWeekPlan`** (public). Split choice is private **`determineSplit`**. |
| Materialise calendar rows | `app/src/lib/training/programPlanner.ts` | **`generateProgramDays`** |
| Persist instance + days | `app/src/lib/api.ts` | `createProgramInstance`, `createProgramDays` (insert only) |
| Setup orchestration | `app/src/screens/training/TrainingSetupScreen.tsx` | calls `buildFourWeekPlan` then `generateProgramDays` then insert |
| Per-session exercise + load | `app/src/lib/training/engine/index.ts` | **`buildSession`**, **`buildSessionFromProgramDay`**, **`chooseExercise`**, **`suggestLoading`** |
| Dry-run / preview | `app/src/lib/training/preview/index.ts` | `dryRunTrainingGeneration` / `generatePreview` |

Call chain for program creation (read `TrainingSetupScreen.tsx`):

```text
buildFourWeekPlan(profile, selectedWeekdaysJs, startDate)
  → createProgramInstance({ plan, profile_snapshot, ... })
  → generateProgramDays(programInstance.id, user_id, plan, startDate)
  → createProgramDays(programDays)
```

Session construction later uses `buildSessionFromProgramDay` → `buildSession` against a static catalog (`app/src/lib/training/catalog/exercises.v1.json`) and rules (`app/src/lib/training/rules/rules.v1.json`).

### Not a model, not a Supabase generator (VERIFIED)

- Grep of `app/src` for `openai`, `anthropic`, `gemini`, `gpt-`, `generateContent`, `invokeModel`, `llm`: **no matches**.
- Grep for `chat/completions` / `generateObject`: **no matches**.
- Only `supabase.functions.invoke` in `app/src` is `verify-play-integrity` (`app/src/lib/playIntegrity/monitor.ts`). The only edge function file found is `app/supabase/functions/verify-play-integrity/index.ts`.
- `buildFourWeekPlan` is a deterministic TypeScript function: sort goal weights, pick split from `daysPerWeek` + goals + `muscle_frequency_preference`, replicate four weeks.

### Precision for later generator audit

“The generator” is two layers, both in-app rules:

1. **Program skeleton** — `buildFourWeekPlan` / `determineSplit`.
2. **Exercise + load prescription** — `buildSession` / `chooseExercise` / `suggestLoading`.

A symptom about arms/shoulders/core/weights/progression can live in either layer. Phase 3 must not collapse them.
