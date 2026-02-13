# PHASE 1 — Issue confirmation (read-only)

Evidence for each issue **A–F** with file path, function, snippet (≤25 words), and approximate line numbers.

---

## A) SleepScreen import modal: does it call `syncHealthData`?

**No.** It only updates UI and invalidates caches.

| Location | Evidence |
|----------|----------|
| `app/src/screens/SleepScreen.tsx` | `processImport` (lines 486–575) loops over `connectedIntegrations`, updates `setImportSteps` with status messages, never calls `syncHealthData` or `syncAll`. |
|同上 | Per-provider it sets `status: 'success', message: 'Sleep and activity imported successfully.'` (557) without any sync. |
|同上 | After loop: `qc.invalidateQueries({ queryKey: ['sleep:last'] })`, `qc.invalidateQueries({ queryKey: ['sleep:sessions:30d'] })` (564–565), then `refreshInsight('sleep-health-import')` (571). |

**Quote (line 564–571):**  
*"await qc.invalidateQueries(...); ... await refreshInsight('sleep-health-import');"* — invalidate + refresh only, no sync.

**Imports:** `syncAll` is imported (31) but **not used** in `processImport`. `syncHealthData` is not imported.

---

## B) SleepScreen connect-count effect: does it call `syncAll` and not `syncHealthData`?

**Yes.**

| Location | Evidence |
|----------|----------|
| `app/src/screens/SleepScreen.tsx` | `useEffect` depending on `connectedIntegrations.length` (941–964). |
|同上 | `await syncAll();` at line 949. `syncHealthData` is never called. |
|同上 | After sync: invalidates `sleep:last`, `sleep:sessions:30d`, then `refreshInsight('sleep-auto-sync')` (950–953). |

**Quote (948–952):**  
*"await syncAll(); ... invalidateQueries ... refreshInsight('sleep-auto-sync')"*

`syncAll` syncs mood + meditation only (`mood_entries`, `meditation_sessions`), not health providers.

---

## C) IntegrationsScreen import: does it call `syncHealthData`?

**Yes.**

| Location | Evidence |
|----------|----------|
| `app/src/screens/IntegrationsScreen.tsx` | `processImport` (265–298) calls `syncResult = await syncHealthData();` at line 287. |
|同上 | Then invalidates `sleep:last`, `sleep:sessions:30d`, `dashboard:lastSleep` and conditionally `refreshInsights('integrations-import')` (292–297). |

**Quote (286–287):**  
*"syncResult = await syncHealthData();"*

---

## D) Morning Review: scheduled when permissions granted but session null/unknown?

**Yes.** Scheduling can run with no auth check.

| Location | Evidence |
|----------|----------|
| `app/src/lib/notifications/NotificationScheduler.ts` | `buildNotificationPlan` (110–169) uses `getNotificationPreferences`, `getUserSettings`, `loadSleepSettings` only. No `session` or auth check. |
|同上 | `morning_review` is added when `typicalWakeTime` exists (156–169). |
|同上 | `reconcileNotifications` (303–338) calls `ensurePermissionsAndChannels` then `buildNotificationPlan`. No auth check. |
| `app/src/hooks/useNotifications.ts` | Effect (278–369): `ensureNotificationPermission` → then `reconcileNotifications()` at 326. No session check. |
| `app/App.tsx` | `useNotifications` runs in `AppShell` (421). `AppShell` renders `AuthProvider` as a **child** (497–505). Hook runs **outside** auth context. |
| `app/App.tsx` | Separate `useEffect` (448–450): `reconcileNotifications()` on boot. No session check. |
| `useNotifications.ts` | AppState `active`: `reconcileNotifications().catch(...)` (395). No session check. |

**Entrypoints:** (1) `useNotifications` init, (2) AppShell boot `reconcile` useEffect, (3) AppState active. None gate on session.

**Quote (`buildNotificationPlan`):**  
*"getNotificationPreferences, getUserSettings, loadSleepSettings"* — no session.

---

## E) Onboarding flash: RootNavigator gating + `flowKey` remount

**Confirmed.** Mechanism that can show Onboarding briefly:

| Location | Evidence |
|----------|----------|
| `app/src/routing/RootNavigator.tsx` | `flowKey = \`${navKey}:${session ? (hasOnboarded ? 'ON' : 'OFF') : 'NA'}\`` (301). `Stack.Navigator` has `key={flowKey}` (339). |
|同上 | `effectiveHasOnboarded = localHasOnboarded \|\| remoteOnboarded === true` (304–305). |
|同上 | `shouldHoldSplash` holds when `!appReady`, `hasOnboarded === null`, or `(session && !localHasOnboarded && remoteOnboarded === null && !failsafeTriggered)` (311–316). |
|同上 | Failsafe (79–93): after 8s with remote still unknown, `setFailsafeTriggered(true)` → splash can end, onboarding UI allowed. |
|同上 | Render: `session && !effectiveHasOnboarded` → `Onboarding` (346–347); `effectiveHasOnboarded` → `App` (343–344). |

**Sequence:** Splash holds until app ready + (known onboarding or failsafe). Failsafe fires → show Onboarding. Remote later resolves → `hasOnboarded`/`remoteOnboarded` update → `flowKey` flips OFF→ON → stack remounts → switch to App. Brief Onboarding flash.

**Quote (301, 339):**  
*"flowKey = ... hasOnboarded ? 'ON' : 'OFF' ... key={flowKey}"*

---

## F) Notifications reliability: schedule proof and reconcile vs actual?

**No proof in reconcile; no verification of actual vs plan.**

| Location | Evidence |
|----------|----------|
| `app/src/lib/notifications/NotificationScheduler.ts` | `reconcileNotifications` (303–338): builds plan, compares `lastFingerprint` vs `newPlan.fingerprint`, cancels all, schedules from plan, saves fingerprint. Does **not** read back scheduled notifications. |
|同上 | `getNotificationDiagnostics` (355–376) calls `getAppScheduledNotifications()`, returns `scheduledCount`, `scheduled`, `lastFingerprint`, etc. |
|同上 | Diagnostics used only in `DiagnosticsScreen` (23, 92). **Not** called inside `reconcileNotifications`. |
|同上 | Reconcile does not compute or store `plannedCount` / `scheduledCount` / `cancelledCount` or compare plan vs actual. |

**Quote (317–328):**  
*"if (lastFingerprint === newPlan.fingerprint) return; ... cancelAllAppNotifications; for (planned) scheduleNotification; saveFingerprint"* — no post-schedule verification.

---

## Summary

| Issue | Confirmed | Notes |
|-------|-----------|-------|
| A | ✅ | SleepScreen import modal: no sync, UI + invalidate only |
| B | ✅ | Connect-count effect calls `syncAll`, not `syncHealthData` |
| C | ✅ | IntegrationsScreen import calls `syncHealthData` |
| D | ✅ | Morning Review (and daily plan) can schedule without auth; entrypoints have no session check |
| E | ✅ | `flowKey` remount + failsafe can show Onboarding briefly before App |
| F | ✅ | No schedule proof in reconcile; no verify actual vs plan |
