# Phase 3 — insets, notifications, empty catches

**Recorded:** 2026-09-18  
**Branch:** `fix/training-confident-ux`  
**Host:** `C:\Reclaim`  
**Evidence class:** mixed — source read, Expo SDK 54 docs (dated page `docs.expo.dev/versions/v54.0.0/config/app`), no live HEAD APK.

Item 4 (tab bar + AppScreen + enumeration) is implemented in this commit. Items 5–6 are recorded as they land.

Every claim below is **VERIFIED** (read the file / ran a command / fetched the Expo v54 config page in this session) or **ASSERTED**.

---

## Where edge-to-edge is actually enabled

`edgeToEdgeEnabled` does **not** appear in `app/` ts/js/json product config. **VERIFIED** (ripgrep). There is also **no committed `app/android/` tree** — native Android is generated at EAS/prebuild time. **VERIFIED** (glob `**/MainActivity.*` under `app/` → 0 files).

It is enabled anyway:

1. **Expo SDK 54 default.** This app is `expo: ~54.0.33` + `react-native: 0.81.5`. **VERIFIED** (`app/package.json`). Expo’s v54 `app.json` reference (`android.edgeToEdgeEnabled`, fetched 2026-09-18 from `https://docs.expo.dev/versions/v54.0.0/config/app/`): *“Enables your app to run in edge-to-edge mode. Defaults to true.”* The field is **deprecated** and “will be removed in SDK 55”. Android 16+ (API 36) “requires edge-to-edge to be enabled. This feature can't be disabled anymore.” **VERIFIED** against that page.
2. **Target SDK 36 on the last measured binary.** Phase 0 dumpsys: `targetSdk=36`. **ASSERTED** (Phase 0, 2026-09-17; not re-adb’d here). React Native 0.81 defaults new apps to `targetSdk 36`. **ASSERTED** from RN 0.81 release notes. On API 36, the OS draws the app under the system bars whether or not the config key is present.
3. **Transitive `react-native-is-edge-to-edge`.** Present in `app/package-lock.json` as a dependency of other RN packages, not as an app-level flag. **VERIFIED** (lockfile name only). It is not how this app opts in.

`SafeAreaProvider` wraps the tree in `app/App.tsx`. **VERIFIED**. `useSafeAreaInsets` is therefore valid anywhere under that provider.

`mcp.browser` is `none` in `AUTONOMY_POLICY.md` and there is no debug HEAD APK, so this session **cannot** screenshot the nav-bar overlap on current source. Layout claims below are source-derived. **ASSERTED** for the visual overlap magnitude (~10px); the padding arithmetic is **VERIFIED**.

---

## Tab bar bug (fixed)

`TabsNavigator` previously:

```text
height: 64 + insets.bottom
paddingBottom: 10
paddingTop: 10
```

The extra `insets.bottom` pixels were added to **height** but not to **paddingBottom**, so they sat *above* the icons and ate content. Icons sat `paddingBottom: 10` off the physical bottom of the tab-bar view, which itself sits on the display edge under the system nav.

**Fix (this commit):** `height: RECLAIM_TAB_BAR_BODY_HEIGHT + insets.bottom`, `paddingBottom: insets.bottom`. The inset is now below the icons. `RECLAIM_TAB_BAR_BODY_HEIGHT = 64` lives in `reclaimScreenLayout.ts` so AppScreen and the tab bar cannot drift.

Not runtime-verified on a device this session.

---

## AppScreen (fixed)

Previously defaulted `paddingBottom = RECLAIM_SCREEN_TAB_BAR_INSET` (**140**, hardcoded) and, when that matched, applied the static `reclaimStandardScreenScroll` object (also 140). Only **AnalyticsScreen** uses `<AppScreen>`. **VERIFIED**.

**Fix:** `useSafeAreaInsets()`; default padding is `reclaimLiveTabBarScrollInset(insets.bottom)` = `64 + insets.bottom + 16`. Explicit `paddingBottom` still overrides. The static 140 constant remains for ScrollViews that cannot call the hook.

---

## Enumeration — bottom-anchored controls vs inset status

`useSafeAreaInsets` call sites before this commit: **TrainingSessionView**, **SessionPreviewModal**, **TrainingSetupScreen**, **TabsNavigator**. **VERIFIED**. This commit adds **AppScreen**.

Status key:

- **LIVE** — reads `insets.bottom` (or equivalent) for the bottom chrome
- **FUDGE** — `RECLAIM_SCREEN_TAB_BAR_INSET` (140) or another hardcoded bottom pad
- **NONE** — bottom-anchored control with no system-inset padding
- **N/A** — no bottom-anchored chrome (scroll only / centered modal)

### Tab navigator (Home / Analytics / Settings)

| Surface | Bottom chrome | Status | Notes |
|---------|---------------|--------|-------|
| `TabsNavigator` tab bar | Icons + labels | **LIVE** (fixed this commit) | Was height+inset / padding 10 |
| `Dashboard` | Scroll (`reclaimHeroBleedScroll`); no FAB usage despite import | **FUDGE** 140 | Drawer screen-as-tab. Last cards sit above hardcoded 140, not live tab+inset |
| `AnalyticsScreen` | `<AppScreen>` scroll | **LIVE** (fixed this commit) | Only AppScreen consumer |
| `SettingsScreen` | Scroll (`reclaimStandardScreenScroll`); test-notification button is in-flow | **FUDGE** 140 | Tab child; not AppScreen |

### Drawer / stack screens using the 140 fudge

| Surface | Bottom chrome | Status |
|---------|---------------|--------|
| `TrainingScreen` list / history | Scroll `reclaimStandardScreenScroll`; one branch `paddingBottom: RECLAIM_SCREEN_TAB_BAR_INSET` | **FUDGE** 140 |
| `MedsScreen` | Hero scroll `reclaimHeroBleedScroll` | **FUDGE** 140 |
| `MoodScreen` | Hero scroll `reclaimHeroBleedScroll` | **FUDGE** 140 |
| `SleepScreen` | Hero scroll `reclaimHeroBleedScroll` | **FUDGE** 140 |
| `MindfulnessScreen` | Scroll `reclaimStandardScreenScroll` | **FUDGE** 140 |
| `MeditationScreen` | Scroll `reclaimStandardScreenScroll`; Start/play in-flow | **FUDGE** 140 |
| `IntegrationsScreen` | Scroll `reclaimStandardScreenScroll` | **FUDGE** 140 |
| `NotificationsScreen` | Scroll `reclaimStandardScreenScroll` | **FUDGE** 140 |
| `DataPrivacyScreen` | Scroll `reclaimStandardScreenScroll` | **FUDGE** 140 |
| `AboutScreen` | Scroll `reclaimStandardScreenScroll` | **FUDGE** 140 |
| `TrainingAnalyticsScreen` | Scroll `reclaimStandardScreenScroll` | **FUDGE** 140 |
| `SignalGraphScreen` | Scroll + extra `paddingBottom: 40` | **FUDGE** 140 + 40 |
| `EvidenceNotesScreen` | `paddingBottom: 120` | **FUDGE** 120 (not the 140 constant) |

These clear a guessed tab bar. On a tall gesture inset they can still clip; on a short inset they over-pad. Not changed this item.

### Sticky / absolute bottom chrome (not tab bar)

| Surface | Bottom chrome | Status | Notes |
|---------|---------------|--------|-------|
| `TrainingSessionView` sticky footer | Done / Save & close / Minimize | **LIVE** | `paddingBottom: Math.max(insets.bottom, spacing.md)`. Scroll also adds 140 **plus** `insets.bottom` — double-counts vs the footer. Report, not fixed |
| `TrainingSetupScreen` sticky footer | Back / Next / Save | **LIVE** | `paddingBottom: Math.max(insets.bottom, spacing.md)` |
| `SessionPreviewModal` action row | Confirm / Cancel | **LIVE** | sheet margins use `insets.top/bottom`; action pad `Math.max(insets.bottom, spacing.md)` |
| `MedsScreen` history sheet | `position: 'absolute', bottom: 0`, `paddingBottom: 32` | **NONE** (32px fudge, no insets) | Will sit under the system nav on edge-to-edge |
| `AppNavigator` drawer | `DrawerContentScrollView` `paddingBottom: 18` | **NONE** | Drawer tiles, not a page CTA |
| `GuidedPrepScreen` | Cancel / Start on a centered Paper Modal card | **N/A** | Centered card, not bottom-anchored |
| `PaywallModal` | Purchase / restore in-card footer | **N/A** | Centered / column, no `insets.bottom` |
| `HealthDisclaimerModal` | Centered card, `padding: 24` | **N/A** | |
| `StartupSplashDisclaimer` | Centered card, `padding: 24` | **N/A** | |
| `DashboardMoodCheckInModal` / Forecast / Sleep snapshot | Paper Portal modals | **N/A** | In-card padding only (`paddingBottom: 12` on mood check-in) |
| `SessionDetailModal` / `ExerciseDetailsModal` / `FullSessionPanel` / `PostSessionMoodPrompt` / `RecoveryResetModal` / `ReplaceExerciseDialog` / `ExerciseCard` dialogs | Paper Modal/Dialog | **N/A** | No live bottom inset. Dialogs may still sit above the nav via Paper defaults — **ASSERTED**, not measured |
| `MeditationLibraryModal` / `ExternalMediaModal` / `MeditationSessionOptions` | Portal/Dialog | **N/A** | |
| `SetFocusOverlay` / `MilestoneCelebrationModal` | Overlay | **N/A** | |
| `RootNavigator` splash | Centered splash, not a CTA bar | **N/A** | `position: 'absolute'` is the loading halo, not a control |

### Auth + onboarding (no tab bar)

| Surface | Bottom chrome | Status |
|---------|---------------|--------|
| `AuthScreen` | Submit in a centered `ScrollView` (`paddingVertical: 16` only) | **NONE** for system nav — centered so usually clear; not live |
| `WelcomeScreen` | Continue/skip in a column with `paddingVertical: 16` | **NONE** |
| `CapabilitiesScreen` / `MoodCheckinScreen` / `ResetScreen` / `MedsStepScreen` / `SleepStepScreen` / `FinishScreen` | In-flow Continue/Save at the bottom of the scroll/column | **NONE** | Buttons are last children, not sticky. On a small screen + IME they can sit in the system nav. **ASSERTED** from structure, not device |

### Dashboard schedule overlay

`ScheduleOverlay` scroll `paddingBottom: 8` — **NONE**. Hosted in a Portal. Not a sticky page footer.

---

## What was not changed (item 4)

- Static `reclaimStandardScreenScroll` / `reclaimHeroBleedScroll` (still 140) on the drawer screens listed above.
- `TrainingSessionView` double-count (140 + insets on scroll **and** live footer).
- `MedsScreen` history sheet `paddingBottom: 32`.
- Onboarding / Auth.
- No device screenshot of HEAD (release APK is 1.0.4/vc8).

---

## Item 5 — bare `scheduleNotificationAsync` routed through the reconciler

**AS-IS before this commit (VERIFIED):** four product call sites scheduled OS notifications without a `logicalKey`, so the next `reconcileNotifications()` pass cancelled them:

| Site | Was | Now |
|------|-----|-----|
| `MindfulnessScreen.tsx` `testNow` | `scheduleNotificationAsync({ trigger: null })` | `setIntent('meditation_test_now', { type: 'ONE_SHOT', seconds: 1, url })` + `reconcileNotifications()` |
| `SettingsScreen.tsx` `sendTestNotifications` | four bare `scheduleNotificationAsync` with `seconds` 10–16 | four `setIntent('test_notif:*', { type: 'ONE_SHOT', seconds })` then one reconcile |
| `moodTrendAlert.ts` ~77 and ~105 | `scheduleNotificationAsync` + `cancelScheduledNotificationAsync` by identifier | `setIntent` / `clearIntent` + reconcile; keys `mood_checkin_nudge` / `mood_safety_alert` |

**Writer (VERIFIED):** `NotificationScheduler.buildPlanFromIntents` now materializes `data.type === 'ONE_SHOT'`. Dated (`triggerDate`) skips once past; delayed (`seconds`) is measured from `intent.createdAt` and skipped once past; neither → immediate only if created < 30s ago. Canonical OS write remains `Notifications.scheduleNotificationAsync` inside `NotificationScheduler.ts` (the reconciler). **VERIFIED** by reading the file after the edit.

`app/src/screens/**` has **zero** remaining `scheduleNotificationAsync` call sites. **VERIFIED** (ripgrep).

Not device-smoked (HEAD APK not installed).

---

## Items 6

Pending in a later commit of this pass.
