# Comprehensive Notification System Audit
**Date**: January 28, 2026  
**Platform**: Android (Samsung Galaxy) + Wear OS (Samsung Watch)  
**App**: Reclaim v0.1.0

---

## Executive Summary

The Reclaim app uses an **intent-based local notification architecture** with centralized reconciliation. The system is well-designed with debouncing, fingerprinting, and idempotency, but has **critical gaps** preventing training notifications from working and several **compatibility issues** that may block notifications on Android and Wear OS.

### Critical issues found:
1. **Training notifications broken** – Only schedule when app is backgrounded
2. **Channel importance conflict** – Duplicate setup causes non-deterministic behavior
3. **Missing permission checks** – Health triggers and meditation lack permission verification
4. **Android notification volume** – Approaching practical limits (50-100)
5. **No push notification infrastructure** – All notifications are local scheduled

---

## 1. Notification Permissions

### Current implementation

**Permission request flow**:
1. Onboarding (`PermissionsScreen.tsx`) – explicit user request
2. App boot (`useNotifications.ts:529`) – checks and requests if needed
3. Before scheduling (`ensurePermissionsAndChannels()`) – verifies permissions

**Permission states handled**:
- ✅ GRANTED – full permissions
- ✅ PROVISIONAL (iOS) – temporary permissions
- ✅ DENIED – user rejected
- ✅ UNDETERMINED – not asked yet

### Issues

| Issue | Impact | Severity |
|-------|--------|----------|
| **Permission requested on every app start** | May annoy users if previously denied | Medium |
| **Health triggers skip permission check** | Notifications fail silently | High |
| **Meditation schedulers skip permission check** | Notifications fail silently | High |
| **No update/reinstall handling** | Permissions may be revoked without detection | Medium |

### What happens on app updates?

**Current behavior**:
- Permissions persist across updates (Android/iOS standard)
- Channels are recreated via `ensureReclaimChannels()` on app start
- Reconciliation runs on boot
- No explicit permission reverification

**Gap**: If permissions are revoked between updates, the app won't detect it until scheduling fails.

---

## 2. Notification Scheduling by Module

### Summary table

| Module | Count | Type | Repeating | Trigger | Max/cap |
|--------|-------|------|-----------|---------|---------|
| **Meds** | 8 per med | Local | No | Dose times | iOS 64 limit |
| **Mood** | 2 | Local | Daily | Fixed times (8 AM, 8 PM) | 2 |
| **Sleep** | 2 | Local | Daily | Settings-based | 2 |
| **Morning review** | 1 | Local | Daily | Wake time + 30 min | 1 |
| **Meditation (fixed)** | 1 per rule | Local | Daily | User-defined time | 1–3 |
| **Meditation (wake)** | 1 per rule | Local | One-shot | After wake detection | 1–3 |
| **Refill reminders** | 1 per med | Local | Weekly | 2 hrs before first dose | N meds |
| **Training (rest)** | 1–2 active | Local | No | During session | Dynamic |
| **Training (sets)** | 1–2 active | Local | No | During session | Dynamic |
| **Health triggers** | 0–2 per day | Local | No | HR/stress threshold | 2 |

**Total typical count**: 10–15 repeating + 8–64 medication doses + training (dynamic)

### Medication (Meds)

**Scheduler**: `scheduleMedReminderActionable()` in `useNotifications.ts:727`

**Cap**: 8 doses per med (code comment: "to stay under iOS 64-scheduled-notification limit")

**Actions**:
- TAKE (`opensAppToForeground: false`)
- SNOOZE_10 (`opensAppToForeground: false`)
- SKIP (`opensAppToForeground: false`)

**Intent keys**: `med:${medId}:${doseTimeISO}`, `med:${medId}:${doseTimeISO}:snooze`

**Triggers**: Med save/edit, "Schedule All", settings screen, med details

**Channel**: `reminder-chime` or `reminder-silent`

✅ **Status**: Working

---

### Training

**Schedulers**: `scheduleTrainingRest()`, `scheduleTrainingSet()`, `scheduleTrainingSetImmediate()`

**Notifications**:
- Rest started (immediate)
- Rest complete (interval, delayed by rest duration)
- Next set (immediate)

**Actions**:
- SET_DONE (`opensAppToForeground: false`)
- EDIT_SET (`opensAppToForeground: true`)
- NEXT_SET (`opensAppToForeground: false`)

**Intent keys**: `training_rest:${sessionId}:${exerciseId}:${setIndex}`, `training_set:${sessionId}:${exerciseId}:${setIndex}`

**Channel**: `reminder-chime`

❌ **Status**: **BROKEN** – see section 3 for detailed analysis

---

### Meditation

**Scheduler**: `useMeditationScheduler.tsx`

**Types**:
- Fixed-time (daily repeating)
- After-wake (one-shot, recomputed on reconcile)

**Intent keys**: `meditation:fixed_time:${type}:${hour}:${minute}`, `meditation:after_wake:${type}:${offsetMinutes}`

**Channel**: `meditation`

⚠️ **Status**: Missing permission checks

---

### Mindfulness (health triggers)

**Scheduler**: `triggerMindfulnessNotification()` in `notificationTriggers.ts`

**Triggers**:
- Heart rate spike (Google Fit)
- High stress (Google Fit)

**Deduplication**: Once per day per trigger type

**Actions**:
- START (`opensAppToForeground: true`)
- SNOOZE_15 (`opensAppToForeground: false`)

**Channel**: `mindfulness-health`

⚠️ **Status**: Missing notification permission checks (checks health permissions only)

---

### Sleep (wind down, wake up)

**Scheduler**: `buildNotificationPlan()` in `NotificationScheduler.ts`

**Notifications**:
- Bedtime suggestion (calculated from wake time - target sleep - 60 min, then 30 min before)
- Morning confirm (at typical wake time)

**Repeating**: Daily

**Intent keys**: `sleep_bedtime`, `sleep_confirm`

**Channel**: `reminder-chime` or `reminder-silent`

✅ **Status**: Working

---

### Mood check-ins

**Scheduler**: `scheduleMoodCheckinReminders()` in `useNotifications.ts:782`

**Times**: 08:00, 20:00 daily

**Repeating**: Daily

**Intent keys**: `mood_morning`, `mood_evening`

**Channel**: `reminder-chime` or `reminder-silent`

✅ **Status**: Working

---

### Refill reminders

**Scheduler**: `scheduleRefillReminders()` in `refillReminders.ts:26`

**Timing**: Weekly, 2 hours before first dose on first scheduled day

**Channel**: `reminder-chime`

⚠️ **Status**: Missing permission checks, **missing `appTag`** (not managed by reconciler)

---

## 3. Training Notifications — Root Cause Analysis

### Why training notifications don't work

**Critical Bug #1: AppState gating**

```typescript
// TrainingSessionView.tsx:273
if (AppState.currentState === 'active') return;
```

Notifications **only schedule when the app is backgrounded**. If the user keeps the app open during training (normal behavior), no notifications are scheduled.

**Critical Bug #2: Rest completion cancels notification**

```typescript
// TrainingSessionView.tsx:1580
onComplete={() => {
  // ... rest timer ends
  cancelRestFinishNotification().catch(() => {});
  // ❌ Cancels the "rest complete" notification instead of showing it
}}
```

When the rest timer completes, the scheduled notification is cancelled instead of being shown.

**Critical Bug #3: Mode restriction**

```typescript
// TrainingSessionView.tsx:704
if ((session as any).mode === 'timed' && plannedSets.length > 0) {
  // Only schedules if mode is 'timed'
}
```

Manual mode gets no notifications.

**Critical Bug #4: Missing "set done" notification**

The `handleSetComplete` function logs the set but doesn't schedule a "set done" notification. It only schedules rest notifications if the app is backgrounded.

**Critical Bug #5: No "session complete" notification**

Session completion clears training intents but doesn't schedule a summary notification.

### Flow trace

**Desired flow**:
1. User completes a set → notification: "Set 1 complete! Rest for 90s or tap to continue"
2. Rest starts → notification: "Rest started (90s)"
3. Rest completes → notification: "Rest done! Ready for set 2?"
4. User taps SET_DONE → next set scheduled

**Actual flow**:
1. User completes set → no notification (app is active)
2. If user backgrounds the app during rest → notification scheduled
3. If rest completes while app is active → notification cancelled
4. User never sees notifications

---

## 4. Wearable Compatibility (Wear OS / Samsung Watch)

### Android channel configuration

**Correct configuration** (`NotificationScheduler.ts:112-162`):
- `lockscreenVisibility: PUBLIC` ✅
- `importance: HIGH` for actionable notifications ✅
- Vibration patterns defined ✅

**Conflict** (`App.tsx:415-422`):
- Duplicate channel setup with **DEFAULT importance** ❌
- Last setup wins → non-deterministic channel config
- May downgrade importance to DEFAULT, reducing watch visibility

### Notification actions for wearables

All actions configured with `categoryIdentifier`:
- `MED_REMINDER`: TAKE, SNOOZE_10, SKIP
- `TRAINING_SET`: SET_DONE, EDIT_SET
- `TRAINING_REST`: NEXT_SET
- `MINDFULNESS_REMINDER`: START, SNOOZE_15

Actions use `opensAppToForeground: false` for background execution.

✅ **Good**: Actions should work on watch  
⚠️ **Risk**: Depends on Expo Notifications auto-mirroring

### Wear OS bridging

**Current approach**: Relies on Android OS automatic mirroring
- No explicit Wear OS extension (`WearableExtender`)
- No native Wear OS APIs
- No custom watch layouts

**Risk**: Auto-mirroring is not guaranteed
- Expo Notifications may not expose Wear OS-specific APIs
- Custom watch UIs require native code

**User feedback** (from docs):
> "training didnt show any notifications on rest, or next set, or complete set"

**Root cause**: Not Wear OS compatibility — training notifications aren't being scheduled at all (see section 3).

---

## 5. Notification Rescheduling Architecture

### Reconciliation flow

```
reconcileNotifications() [debounced 250ms]
  → runReconcileImmediate() [mutex guarded]
    → ensurePermissionsAndChannels()
    → buildNotificationPlan() [settings-based]
    → buildPlanFromIntents() [intent-based]
    → merge plans
    → computePlanFingerprint()
    → compare with stored fingerprint
    → if unchanged: early return
    → if changed:
      → cancel all app-tagged notifications
      → schedule merged plan
      → save new fingerprint
```

### Fingerprint system

**Purpose**: Avoid unnecessary rescheduling when plan hasn't changed

**How it works**:
- Creates deterministic string from notification plan
- Sorts by `logicalKey`, encodes trigger details
- Stores in AsyncStorage
- Early exits if fingerprint matches

✅ **Effective**: Prevents flicker and reduces API calls

### Debounce (250ms trailing)

**Purpose**: Batch rapid successive reconciliation calls

**How it works**:
- Each call resets 250ms timer
- Only executes after 250ms of quiet
- `forceRescheduleNotifications()` bypasses debounce

✅ **Effective**: Coalesces rapid updates

### Performance concerns

**Sequential cancellation** (lines 713-715):
```typescript
for (const n of appNotifs) {
  await Notifications.cancelScheduledNotificationAsync(n.identifier);
}
```

With 50+ notifications, this can take 1–2 seconds.

**Sequential scheduling** (lines 722-728):
```typescript
for (const planned of merged) {
  const id = await scheduleNotification(planned);
  // ...
}
```

Also sequential, adds overhead.

**Reconciliation call frequency**:
- ~20+ call sites across the codebase
- AppState listener (foreground)
- Every med/mood/sleep/meditation action
- Protected by debounce + mutex, but still frequent

---

## 6. Android & iOS Limits

### iOS: 64 scheduled notifications

**Limit**: 64 total scheduled notifications (Apple documented)

**Current app count**:
- Repeating: ~6–10 (mood, sleep, meditation, refill)
- Meds: 8 per med × N meds (capped at 8)
- Training: Dynamic (not persistent)
- **Total**: Can reach 50+ with 5+ meds

✅ **Mitigation**: Meds capped at 8 doses per med
⚠️ **Risk**: Approaching limit with many meds + refills + rules

### Android: ~50–100 practical limit

**Official limit**: None documented by Google  
**Practical limit**: 50–100 notifications (per API 23 source code, developer reports)  
**Samsung limit**: 500 scheduled alarms (AlarmManager)

**Current app count**: Same as iOS (~50+ notifications)

⚠️ **Risk**: May hit Android's soft limit with many meds

### Notification volume analysis

**Fixed daily/weekly** (always scheduled):
- Mood: 2
- Sleep: 2
- Morning review: 1
- Meditation: 1–3
- **Subtotal**: 6–8

**Dynamic repeating**:
- Refill reminders: 1 per med (weekly)
- **Subtotal**: N meds

**One-time per-med**:
- Medication doses: 8 per med
- **Subtotal**: 8 × N meds

**Dynamic training** (session-only):
- Rest/set: 1–4 active
- **Subtotal**: 1–4

**Total with 5 meds**: 6 + 5 + 40 + 2 = **53 notifications**  
**Total with 10 meds**: 6 + 10 + 80 + 2 = **98 notifications**

❌ **Verdict**: **Approaching Android's practical limit** (50–100)

---

## 7. Push Notifications vs Local Notifications

### Current implementation

**Type**: 100% local scheduled notifications  
**No push infrastructure**: No Expo push tokens, no FCM/APNs, no server-side triggers

### Should push notifications be introduced?

| Use case | Local | Push | Recommendation |
|----------|-------|------|----------------|
| **Med doses** | ✅ Scheduled | ❌ | **Keep local** – predictable times |
| **Training rest** | ✅ Dynamic | ❌ | **Keep local** – session-driven |
| **Health triggers** | ✅ Threshold | ⚠️ Server event | **Keep local** – privacy first |
| **Insights** | ❌ None | ✅ Server analysis | **Consider push** – server-side ML |
| **Social/team** | ❌ None | ✅ Real-time | **Push if added** – not applicable yet |
| **Scheduled events** | ❌ None | ⚠️ Calendar sync | **Keep local** – routine system |

**Recommendation**: **Do not introduce push notifications yet**
- Current use cases fit local notifications
- Adds complexity (token management, server infrastructure)
- Privacy concern (server knows user activity)
- Local notifications are sufficient for health/wellness app

**Exception**: If you add server-side insight generation or social features, push may be needed.

---

## 8. Notification Actions & Interaction

### Action configuration

All notification categories use `opensAppToForeground`:
- **Background actions** (`false`): TAKE, SNOOZE, SKIP, SET_DONE, NEXT_SET
- **Foreground actions** (`true`): START_SESSION, EDIT_SET, START (mindfulness)

✅ **Good**: Background actions don't disrupt user flow
✅ **Good**: Foreground actions open app when needed

### Action handling

**Entry point**: `processNotificationResponse()` in `useNotifications.ts:168`

**Flow**:
1. Extract action identifier
2. Check idempotency (prevent double-tap)
3. Route to handler (meds, training, mindfulness)
4. Log to Supabase (with retry/queue)
5. Dismiss notification
6. Clear last response

**Idempotency**: ✅ Uses `ActionIdempotencyStore` to prevent duplicate execution

**Retry/persistence**: ✅ Meds and training use offline queues

**Queued responses**: ✅ Processes `getLastNotificationResponseAsync()` on foreground

### Issues

| Issue | Impact | Severity |
|-------|--------|----------|
| **Training actions work, but notifications don't appear** | Can't test action flow | Critical |
| **No session complete action** | User can't mark session done from notification | Medium |

---

## 9. Android Notification Best Practices

### Current compliance

| Best practice | Status | Notes |
|---------------|--------|-------|
| **Use channels** | ✅ | 5 channels defined |
| **Channel importance** | ⚠️ | Conflict: duplicate setup |
| **Lockscreen visibility** | ✅ | PUBLIC on all channels |
| **Actions on notifications** | ✅ | All actionable types have actions |
| **Group notifications** | ❌ | No grouping/stacking |
| **Limit notification volume** | ⚠️ | Approaching 50–100 limit |
| **Cancel old notifications** | ✅ | Reconciliation cancels stale |
| **Handle permission denial** | ⚠️ | Inconsistent error handling |

### Gaps

1. **No notification grouping**
   - With 8+ med doses, notifications can overwhelm notification tray
   - **Recommendation**: Group med notifications by day or type

2. **No notification stacking**
   - Training notifications (rest + set) should stack
   - **Recommendation**: Use `tag` and `group` for training notifications

3. **High notification volume**
   - 50–100 notifications may trigger Android rate limiting
   - **Recommendation**: Reduce med dose cap (8 → 4?) or use push for non-urgent

---

## 10. iOS Notification Best Practices

### Current compliance

| Best practice | Status | Notes |
|---------------|--------|-------|
| **Request permission explicitly** | ✅ | Onboarding + settings |
| **Handle PROVISIONAL** | ✅ | Code checks PROVISIONAL status |
| **Respect 64 notification limit** | ✅ | Meds capped at 8 doses |
| **Use categories for actions** | ✅ | All actionable types have categories |
| **Handle app in background** | ✅ | Queued response processing |
| **Critical alerts** | ❌ | Not used |

✅ **Verdict**: iOS implementation is solid

---

## 11. Wear OS Best Practices

### Current compliance

| Best practice | Status | Notes |
|---------------|--------|-------|
| **PUBLIC visibility** | ✅ | All channels PUBLIC |
| **Action-driven** | ✅ | All types have actions |
| **Short titles** | ⚠️ | Some titles/bodies may be long |
| **Use WearableExtender** | ❌ | Not used (requires native code) |
| **Standalone watch app** | ❌ | Not applicable |

### Issues

1. **Duplicate channel setup causes importance conflict**
   - `App.tsx` sets `default` to DEFAULT importance
   - `NotificationScheduler.ts` sets `default` to HIGH importance
   - **Impact**: Watch may not show notifications if DEFAULT wins

2. **No explicit Wear OS bridging**
   - Relies on Expo auto-mirroring
   - **Risk**: Actions may not work on watch if mirroring fails

3. **No watch-specific layouts**
   - Uses default Android notification appearance
   - **Impact**: May not look optimal on small watch screens

---

## 12. Architecture Assessment

### Strengths

✅ **Intent-based system**: Flexible, testable, traceable  
✅ **Centralized reconciliation**: Single source of truth  
✅ **Fingerprinting**: Prevents unnecessary rescheduling  
✅ **Debouncing**: Batches rapid updates  
✅ **Idempotency**: Prevents double-execution  
✅ **Offline queues**: Retry on network failure  
✅ **Action-driven**: Reduces need to open app  

### Weaknesses

❌ **Training notifications broken**: AppState gating prevents scheduling  
❌ **Duplicate channel setup**: Conflicts in `App.tsx` vs `NotificationScheduler.ts`  
❌ **Missing permission checks**: Health triggers and meditation  
❌ **No grouping/stacking**: High volume can overwhelm tray  
❌ **Sequential cancellation**: Performance bottleneck with 50+ notifications  
❌ **Approaching volume limits**: 50–100 notifications with many meds  
❌ **Missing `appTag` on refill/meditation**: Not managed by reconciler  

### Does it follow protocol correctly?

**Expo Notifications**: ✅ Uses correct APIs  
**Android**: ⚠️ Channels good, but duplicate setup and no grouping  
**iOS**: ✅ Respects limits, uses categories correctly  
**Wear OS**: ⚠️ Basic compatibility, but no explicit bridging  

### Compatibility verdict

| Platform | Status | Notes |
|----------|--------|-------|
| **Android phone** | ✅ Works | Volume approaching limits |
| **iOS phone** | ✅ Works | Solid implementation |
| **Wear OS watch** | ⚠️ Partial | Depends on auto-mirroring, channel conflict |
| **Apple Watch** | ❓ Untested | Not in scope yet |

---

## 13. Why Notifications Wouldn't Work

### Training (current issue)

1. **AppState gating** – Notifications only schedule when backgrounded
2. **Rest completion** – Cancels notification instead of showing it
3. **Mode restriction** – Manual mode gets no notifications

### General risks

1. **Permission denial** – User denies permissions → no notifications
2. **Channel conflict** – Duplicate setup may downgrade importance
3. **Android volume limit** – Too many notifications → Android blocks
4. **Missing permission checks** – Health triggers and meditation fail silently
5. **Wear OS mirroring** – Auto-mirroring may not work reliably
6. **Background restrictions** – Android Doze/App Standby may delay notifications

---

## 14. Driving Action from Notifications

### Current action coverage

| Module | Notification has action | Action works in background | Opens app if needed |
|--------|------------------------|----------------------------|---------------------|
| **Meds** | ✅ TAKE, SNOOZE, SKIP | ✅ | ❌ |
| **Training** | ✅ SET_DONE, NEXT_SET | ✅ | ✅ EDIT_SET |
| **Mindfulness** | ✅ START, SNOOZE | ✅ | ✅ START |
| **Mood** | ❌ | N/A | Opens app |
| **Sleep** | ❌ | N/A | Opens app |
| **Meditation** | ❌ | N/A | Opens app |

### Gaps for action-driven flow

1. **Mood notifications** – No quick-log action
   - **Fix**: Add "Log Mood" action with mood scale (1–5) or quick buttons
   
2. **Sleep notifications** – No quick actions
   - **Fix**: Add "Mark awake" or "Snooze 15 min" actions

3. **Meditation** – No quick-start action
   - **Fix**: Add "Start now" action to launch meditation from notification

4. **Training "rest complete"** – Notification never shows
   - **Fix**: Show notification when rest completes (currently cancelled)

5. **Training "session complete"** – No summary action
   - **Fix**: Add "View summary" or "Log recovery" action

---

## 15. Additional Modules Found

### Modules using notification architecture:
1. ✅ Medications (meds)
2. ✅ Training (broken)
3. ✅ Meditation
4. ✅ Mindfulness (health triggers)
5. ✅ Sleep (wind down, wake up)
6. ✅ Mood check-ins
7. ✅ Morning review
8. ✅ Refill reminders

### Modules NOT using notifications:
- Analytics/Insights – No notifications scheduled
- Routines/Schedule – No dedicated notification system (handled via morning review)
- Recovery stages – No notifications
- Streaks/badges – No notifications

---

## Summary of Critical Issues

| # | Issue | Module | Severity | Impact |
|---|-------|--------|----------|--------|
| 1 | AppState gating prevents scheduling when active | Training | **CRITICAL** | Training notifications never appear |
| 2 | Rest completion cancels notification | Training | **CRITICAL** | "Rest done" never shows |
| 3 | Duplicate channel setup causes importance conflict | All | **HIGH** | Watch notifications may not appear |
| 4 | Missing permission checks | Health, Meditation | **HIGH** | Silent failures |
| 5 | Notification volume approaching Android limit | Meds | **HIGH** | Android may block |
| 6 | No notification grouping/stacking | Meds, Training | **MEDIUM** | Notification tray overwhelm |
| 7 | Sequential cancellation overhead | All | **MEDIUM** | Performance with 50+ notifications |
| 8 | Missing `appTag` on refill/meditation | Refill, Meditation | **MEDIUM** | Not managed by reconciler |
| 9 | No action on mood/sleep/meditation | UX | **LOW** | Requires app open |
| 10 | No Wear OS explicit bridging | Wear OS | **LOW** | Relies on auto-mirror |

---

## Next: Fix Plan

The audit is complete. Key findings:
1. **Training is broken** due to AppState gating and rest cancellation
2. **Duplicate channel setup** causes Wear OS issues
3. **Notification volume** is approaching Android limits
4. **Missing permission checks** in several modules
5. **Architecture is solid** but needs fixes for edge cases

Ready to proceed with fix recommendations?
