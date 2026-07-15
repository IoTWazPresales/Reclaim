# Cold-start audit (Phase 8 / X-26)

**Date:** 2026-07-15  
**Branch:** `chore/reclaim-uiux-audit-pilot`  
**Finding:** X-26 — Cold deep link → long splash (“Notification setup…”) before shell screens render  
**Scope:** Evidence and diagnosis **only**. **Do not implement a startup-gate fix from this document.**  
**Device:** emulator-5554 · package `com.fissioncorporation.reclaim` · `versionName=1.0.3` / `versionCode=8`  
**ADB:** `C:\Users\warren_eliason\AppData\Local\Android\Sdk\platform-tools\adb.exe`  
**Scenario:** `am force-stop` → `am start -a VIEW -d reclaim://home` (COLD)

---

## Verdict

**Dominant contributor:** the startup **notifications phase** — specifically `runStartupNotificationPermissionGate()` awaiting **`reconcileNotifications()`** while the splash holds with message `"Notification setup..."`.

Auth restore, onboarding status, fonts, and the health-disclaimer check are **not** the long pole on this signed-in, already-onboarded, permission-granted account. Permission itself is already granted (`POST_NOTIFICATIONS`), so the visible multi-second hold is reconcile work blocked on the splash, not a permission dialog.

**Fix is not implemented here** (Phase 8 = diagnosis only).

---

## Instrumentation status

### Existing `[ENTRY_CHAIN]` / startup markers (left unchanged)

| Marker | Location | Emitter |
|--------|----------|---------|
| `[ENTRY_CHAIN] RootNavigator mounted` | `app/src/routing/RootNavigator.tsx` | `logger.debug` |
| `[ENTRY_CHAIN] AppNavigator mounted` | `app/src/routing/AppNavigator.tsx` | `logger.debug` |
| `[ENTRY_CHAIN] TrainingScreen mounted` | `app/src/screens/TrainingScreen.tsx` | `logger.debug` |
| `[STARTUP_GATE] core resolved → …` | `app/src/startup/useStartupGate.ts` | `logger.debug` |
| `[STARTUP_GATE] disclaimer skipped → notifications` | same | `logger.debug` |
| `[STARTUP_GATE] notifications complete → ready` | same | `logger.debug` |
| `[STARTUP_GATE] notification permission gate complete` | `app/src/startup/notificationStartupGate.ts` | `logger.debug` |
| `[ONBOARD] …` / `[AUTH_TRUTH] …` | `RootNavigator` / `AuthProvider` | `logger.debug` |

### Why logcat has **zero** `ENTRY_CHAIN` / `STARTUP_GATE` hits on this APK

`logger.debug` is gated by `__DEV__` (`app/src/lib/logger.ts`). The installed build is a **release/preview APK** (`1.0.3` / build 8), so JS debug markers are stripped/no-op.

```
debug_marker_hits=0  (cold-start-x26-logcat.txt + cold-start-x26-logcat-run2.txt)
```

**No temporary instrumentation was added** for this audit (would not appear on this APK anyway without a DEV/`__DEV__` or always-on marker change). Existing markers were not modified.

### How to get phase-level numbers next time

1. Install a **DEV** client or a preview build that logs startup phases with `console.log` / `logger.info` (not only `logger.debug`), **or** temporarily promote `[STARTUP_GATE]` / `[ENTRY_CHAIN]` to an always-on preview channel logger.  
2. Re-run: force-stop → `reclaim://home` → filter logcat for `ENTRY_CHAIN|STARTUP_GATE|ONBOARD|AUTH_TRUTH`.  
3. Diff timestamps between: RootNavigator mount → core resolved → notifications start → gate complete → AppNavigator mount.

---

## Gate chain (code path)

Splash hold (`shouldHoldSplash`) stays true until:

1. **`splash_core`:** `fontsReady && !authLoading && (!session || onboardStatus !== 'unknown')`  
   - Auth: `AuthProvider` → `getSession()`  
   - Fonts: `ReclaimFontsProvider` / `useFonts` (5 faces)  
   - Onboarding: local `getHasOnboarded` then optional remote `profiles.has_onboarded` (6s timeout)  
2. **`disclaimer`:** `needsHealthDisclaimer()` (AsyncStorage) — skipped when already seen  
3. **`notifications`:** `runStartupNotificationPermissionGate()` → `ensureNotificationPermission()` → `clearBadge()` → **`await reconcileNotifications()`** (250 ms debounce + full plan build / native schedule pass)  
4. **`ready`:** splash fade (~350 ms) → `splashDismissed` → **`AppNavigator` mounts** (`canMountApp && splashDismissed`)

Splash copy while in notifications: **`"Notification setup..."`** (`useStartupGate.ts`).

`AppNavigator` (first real shell navigator) **cannot** mount until step 4 completes — by design.

---

## Measured wall-clock (real numbers)

### Method

- Full logcat captures: `docs/audits/evidence/cold-start-x26-logcat.txt` (run 1), `cold-start-x26-logcat-run2.txt` (run 2)  
- Timed UI dumps + screencaps: `cold-start-x26-t{2..18}s.png` + `*-ui.xml`  
- `am start -W` reports **native** Activity display only — **not** JS splash end

### Logcat timeline (T0 = `START reclaim://home`)

| Event | Run 1 (13:48) | Run 2 (13:50) |
|-------|---------------|---------------|
| `START` deep link | T0 = 13:48:27.643 | T0 = 13:50:06.446 |
| `Start proc` | **+143 ms** | **+40 ms** |
| `Displayed … MainActivity` | **+1 679 ms** (`+1s705ms`) | **+1 325 ms** (`+1s353ms`) |
| Android `Splash Screen … EXITING` | (present run 1 ~+2.2 s) | **+1 877 ms** |
| `ReactNativeJS: Running "main"` | **+3 366 ms** | **+2 224 ms** |
| `[GESTURE HANDLER] Initialize … ReactSurfaceView` (first large RN surface) | **+14 400 ms** | **+11 938 ms** |
| `ENTRY_CHAIN` / `STARTUP_GATE` | **absent** | **absent** |

`am start -W` (run 2): `LaunchState: COLD`, `TotalTime: 1353`, `WaitTime: 1358` — matches ATM “Displayed”, not shell-ready.

### UI / accessibility timeline (run 3, host T0 ≈ 13:51:42)

uiautomator text on splash / shell (independent of stripped JS logs):

| Host elapsed | Visible phase (UI text) |
|--------------|-------------------------|
| **4 s, 6 s, 8 s, 10 s** | **`Notification setup...`** |
| **12 s, 14 s, 16 s, 18 s** | **Home shell** (`Home`, greeting, tiles) |

So on this run: splash still showing **Notification setup** at **10 s**; **Home by 12 s**. Combined with gesture-handler ≈ **12–14 s** on prior logcat runs → cold deep-link to interactive shell ≈ **10–14 s** here (audit lore of 14–18 s is consistent on slower runs / colder emulator).

### Attribution table (best-effort; release APK)

Per-phase JS timestamps are **unavailable** on this APK. Bounds below use logcat + UI + gate code.

| Stage | Bound / measured | Evidence | Notes |
|-------|------------------|----------|-------|
| Native process + first Activity frame | **1.3–1.7 s** | ATM `Displayed` | Not the user-facing long splash |
| Hermes / RN until `Running "main"` | **2.2–3.4 s** from START | ReactNativeJS | Bundle + native module load |
| Auth restore + fonts + onboard (`splash_core`) | **≤ ~1.8 s after JS start** (done by wall **≤4 s**) | UI already past core messages by 4 s | Never saw `Checking sign-in...` / `Loading fonts...` in 2 s+ dumps |
| Health disclaimer | **~0 s (skipped)** | Code + no `Before you start...` in UI | Storage key already set for this user |
| **Notification permission + reconcile (splash hold)** | **~6–8 s** (UI **4 s → 10 s** on “Notification setup…”) | UI dumps | Permission **already granted**; await includes **`reconcileNotifications()`** |
| Splash dismiss + first navigator / Home | Home by **12 s**; gesture surface **~12–14 s** | UI + GESTURE HANDLER | `AppNavigator` only after `phase === 'ready'` |

**Dominant share:** notifications-phase splash hold (**majority of post-JS time**; ~half+ of total cold deep-link latency on measured runs).

---

## Dominant contributor (diagnosis)

`RootNavigator` enters `phase === 'notifications'` and **blocks splash dismissal** until:

```ts
await runStartupNotificationPermissionGate(); // permission + badge + await reconcileNotifications()
startup.completeNotifications();              // → ready → canMountApp
```

On this device permission is already granted, so `ensureNotificationPermission()` is a cheap status read. The expensive work is **`reconcileNotifications()`**: 250 ms debounce, then `buildNotificationPlan()` + `buildPlanFromIntents()` + fingerprint / `getAppScheduledNotifications()` / possible cancel+reschedule — all **before** `AppNavigator` mounts.

That matches the user-visible string **“Notification setup…”** for most of the splash duration.

Secondary (smaller) costs that still precede shell:

- Cold RN bootstrap (~2–3 s to `Running "main"`)  
- Core gate (auth / fonts / onboard) — finishes early relative to notifications  

Fonts and auth are **not** the X-26 long pole on this account/build.

---

## Recommended fix strategy (do **not** implement in Phase 8)

### Preferred: unblock splash from reconcile

1. Keep splash (or a short hold) only for **`splash_core`** (+ optional disclaimer if needed).  
2. In the notifications phase: **await permission only** (and optionally `clearBadge`).  
3. Call `completeNotifications()` / allow `canMountApp` **without** awaiting full reconcile.  
4. Fire `reconcileNotifications()` in the background (same pipeline; do not bypass `setIntent` / reconcile architecture).

**Expected impact:** remove most of the **6–8 s** “Notification setup…” hold; cold deep-link to Home should approach **~native + JS + core gate** (~4–6 s class on this emulator), not 12–14 s+.

### Alternatives (weaker / complementary)

- Cap reconcile await with a short timeout, then background the rest (still risk of incomplete schedule briefly).  
- Parallelize reconcile with first paint but still `await` before mount (does **not** fix X-26).  
- Only skip reconcile when fingerprint+keys already match — still pays plan-build cost today; does not remove the await from the splash path.

### Risk assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Home mounts before OS notifications fully reconciled | Medium | Background reconcile still runs; guided training should still call permission/reconcile on session start paths that already exist |
| Race: UI toggles notification settings during first-second reconcile | Low | Existing reconcile mutex / debounce |
| Changing gate order surprises disclaimer / motion staging | Low | Keep disclaimer before ready; only move reconcile off the critical path |
| Masking a slow `buildNotificationPlan` forever | Medium | Still add DEV timing markers; fix slow plan separately if DEV numbers show it |

**Do not** remove the intent → reconcile pipeline or schedule notifications ad hoc from splash.

---

## Explicit non-actions

- **No** startup-gate code changes in this phase  
- **No** git commit  
- **No** temporary DEV logs left in the tree (none added)  
- Existing `[ENTRY_CHAIN]` markers **left alone**

---

## Evidence files

| File | Role |
|------|------|
| `docs/audits/evidence/cold-start-x26-logcat.txt` | Run 1 full logcat (~18 s) |
| `docs/audits/evidence/cold-start-x26-logcat-run2.txt` | Run 2 full logcat (~20 s) |
| `docs/audits/evidence/cold-start-x26-t{2,4,…,18}s.png` | Timed screencaps |
| `docs/audits/evidence/cold-start-x26-t{4,…,18}s-ui.xml` | uiautomator dumps (splash text / Home) |

---

## Next step (after this audit)

Implement the preferred fix on a follow-up remediation unit **only when instructed**, with a DEV build re-measure of `[STARTUP_GATE]` timestamps to confirm notifications-phase duration drops near zero while reconcile still completes in background.
