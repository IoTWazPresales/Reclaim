# Maestro Auto-Test Setup — Giving the Tester Everything It Needs

This document explains how to set up Maestro so it can test **every aspect** of the Reclaim app, over and over, without changing app code first. It also summarizes handover context and gaps.

**→ For a straight runbook to get Maestro running now, use [MAESTRO_QUICKSTART.md](./MAESTRO_QUICKSTART.md).**

---

## 1. Handover Context & Gaps (from HEALTH_CONNECT_INTEGRATION_HANDOVER.md)

**You’re up to speed on:**

- **Health layer**: `integrations.ts` (registry), `healthConnectService.ts`, `SyncCoordinator`, `sleepSyncPipeline`, IntegrationsScreen.
- **Planned direction**: Android = Health Connect only; hide Google Fit/Samsung from UI; expand HC permissions; single upstream for sleep/activity/vitals.
- **Concrete TODOs**: Hide non-HC providers on Android, expand `HealthMetric`/`METRIC_RECORD_MAP`, add “Open Health Connect” UX, make Android sync read only from Health Connect.

**Gaps to be aware of (for testing and implementation):**

- **Sync entry point**: The handover doesn’t show the exact file that builds `SleepPipelineInput` and calls Google Fit / Samsung. You’ll find it where `syncHealthData` is implemented (e.g. `src/lib/sync.ts` or similar) — that’s where to restrict Android to Health Connect only.
- **IntegrationsScreen filtering**: The doc says filter `integrations` on Android so only `health_connect` is shown; the filtering can live in `IntegrationsScreen` or in the hook that feeds it (`getIntegrationsWithStatus` / definitions).
- **Deep links**: Routes are in `src/routing/RootNavigator.tsx` (`linking.config`). All main screens are under `reclaim://` (home, sleep, mood, meds, training, mindfulness, meditation, integrations, etc.). Meditation also supports `?source=...&autoStart=true` and `?type=...&autoStart=true`; mindfulness uses `?intervention=...&autoStart=true`.

---

## 2. Current Maestro State

- **Location**: `app/.maestro/`
- **Flows**:
  - `smoke.yaml` — launch, wait, screenshot.
  - `alpha-smoke.yaml` — launch + deep links to home, sleep, mood, meds, training, mindfulness, meditation, integrations; screenshot per screen.
- **App ID**: `com.fissioncorporation.reclaim` (used in flows).
- **Limitation**: Flows assume the app is **already past Auth and Onboarding**. If the device starts logged out or in onboarding, deep links may land on the right route but the UI might still show Auth/Onboarding on top. So the “everything it needs” setup must account for **app state**: either a dedicated test user + persisted session, or flows that handle both states.

---

## 3. What the Auto Tester Needs (No Code Changes Yet)

**Alpha approach (recommended for now):** Use your **current alpha Supabase** and **current build**. No separate test project or build profile — just install Maestro, use the app you already build and run against alpha, and go.

To run Maestro “over and over” and hit every aspect of the app:

| Need | What to provide (alpha) |
|------|-------------------------|
| **App binary** | Your **current build** — same APK/simulator build you use for alpha (EAS preview or `expo run:android` / `expo run:ios`). Maestro drives the installed app; no extra deps. |
| **Device / emulator** | Android emulator or physical device; for iOS, simulator or physical. Maestro CLI runs on the host. |
| **Supabase** | **Alpha Supabase** — the same `EXPO_PUBLIC_SUPABASE_*` your build already uses. Tests hit alpha data; no separate project. |
| **App state** | Whatever state the device has: if you’re already signed in and onboarded, existing flows work. If not, sign in once on that device and run again. |
| **Maestro CLI** | Installed on the machine that runs the tests. No Maestro package inside the app. |
| **Flow files** | All under `app/.maestro/`. Add more YAML as you want more coverage. |

If you later want a dedicated test project or build (e.g. for CI or to avoid touching alpha data), you can add that then. For alpha, keep it simple.

---

## 4. Setup Steps (Before Changing Code)

### 4.1 Install Maestro CLI

- **Windows**:  
  `powershell -c "irm https://get.maestro.mobile.dev | iex"`  
  Or install via Chocolatey / winget if available.
- **macOS**:  
  `curl -Ls "https://get.maestro.mobile.dev" | bash`
- **Linux**:  
  Same as macOS.

Then:

```bash
maestro --version
```

### 4.2 Use your current alpha build and Supabase

No separate test env. Use the same build and alpha Supabase you already use:

- **Build**: Whatever you normally use — EAS preview APK, or `npx expo run:android` / `expo run:ios` (with your existing `.env` or EAS secrets). Install that build on the device/emulator Maestro will use.
- **Supabase**: Your alpha project — the app is already configured for it.
- **Sign-in**: If the device is already signed in and onboarded, Maestro flows that deep-link to home/sleep/mood/etc. will work. If not, sign in once on that device, complete onboarding, then run Maestro.

### 4.3 Have an APK (or simulator build) installed

- **EAS**: `cd app && eas build --profile preview --platform android`, then download and install the APK on your emulator/device (`adb install path/to/build.apk`).
- **Local**: `cd app && npx expo run:android` (or `expo run:ios`). Same build you use for alpha.

Maestro talks to whatever app is installed; no extra config.

### 4.4 Run Maestro flows

From the **app** directory (so `.maestro/` is the default flow directory):

```bash
cd app
maestro test .maestro/smoke.yaml
maestro test .maestro/alpha-smoke.yaml
```

Run all flows in the directory:

```bash
maestro test .maestro/
```

From the repo you can use npm scripts (run from `app/`):

```bash
cd app
npm run e2e          # all flows in .maestro/
npm run e2e:smoke    # smoke.yaml only
npm run e2e:alpha    # alpha-smoke.yaml only
```

If you use a different app id for a build variant, override in the flow or via env:

```bash
maestro test -e appId=com.fissioncorporation.reclaim .maestro/alpha-smoke.yaml
```

### 4.5 What “everything” needs for full coverage (when you add more flows)

With alpha Supabase + current build you already have enough to run. To expand coverage over time:

- **Auth**: Optional flow that logs in (e.g. pass credentials via Maestro env if you ever want CI to run auth).
- **Onboarding**: Optional “fresh install” flow.
- **Main app**: alpha-smoke already hits home, sleep, mood, meds, training, mindfulness, meditation, integrations. You can add flows or deep links for:
  - **Settings**: `reclaim://settings`
  - **Analytics**: `reclaim://analytics`
  - **Notifications**: `reclaim://notifications`
  - **About**: `reclaim://about`
  - **Data privacy**: `reclaim://privacy`
  - **Meds detail**: `reclaim://meds/:id` (with a known med id if you have one).
- **Deep link variants**: Meditation `?source=...&autoStart=true`, mindfulness `?intervention=...&autoStart=true`.
- **Health/Integrations**: Already in alpha-smoke; deeper Health Connect flows can come later.

“Everything it needs” for alpha = **current build** (pointing at alpha Supabase) + **device/emulator** + **Maestro CLI** + **signed-in state** (once) + **flow coverage**. Add YAML as you go; add `testID`s later if you want more stable taps.

---

## 5. Recommended Layout (Still No App Code Changes)

- **Keep** `appId: com.fissioncorporation.reclaim` in flow files (or in a shared config).
- **Add** a small set of flows so that “run everything” is one command:
  - `smoke.yaml` — launch + screenshot (current).
  - `alpha-smoke.yaml` — deep-link tour (current).
  - (Later) `e2e-auth.yaml` — login with env credentials.
  - (Later) `e2e-onboarding.yaml` — complete onboarding.
  - (Later) `e2e-settings-and-more.yaml` — settings, analytics, notifications, about, privacy (all via deep links + optional taps).

Then:

```bash
maestro test .maestro/
```

runs the full set. You can add the new flows when you’re ready to expand; the **setup** (Maestro install, test Supabase, test user, build + install, `maestro test .maestro/`) is what you do first.

---

## 6. CI (Optional, later)

When you want it: a job that installs Maestro, builds the app (e.g. EAS `preview` or `expo run:android`), installs on an emulator, runs `maestro test .maestro/`. You can use the same alpha Supabase env in CI (via EAS secrets or GitHub secrets) so the build matches what you run locally. Add auth secrets only if you add an automated login flow.

---

## 7. Summary

- **Handover**: You’re aligned with Health Connect–only Android, integrations registry, sync pipeline, and planned UI/permission/sync changes. Small gap: exact file that builds `sessionsByProvider` for sync (search for `syncHealthData` and Google Fit / Samsung reads).
- **Maestro (alpha)**: No separate test env. Install Maestro CLI, use your **current build** and **alpha Supabase**, install that build on device/emulator, sign in once if needed, run `npm run e2e` from `app/`. Existing flows already cover launch and main screens via deep links.
- **“Everything it needs”**: Current build → alpha Supabase, device/emulator, Maestro CLI, and flow coverage. Add YAML flows as you want more coverage; add `testID`s later for stabler selectors. You can introduce a separate test project/build later if you ever need it (e.g. for CI or production).
