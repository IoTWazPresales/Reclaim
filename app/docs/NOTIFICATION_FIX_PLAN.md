# Notification System Fix Plan
**Based on**: NOTIFICATION_SYSTEM_AUDIT_COMPREHENSIVE.md  
**Date**: January 28, 2026

---

## Fix Priority Matrix

| Priority | Issues | Impact if not fixed |
|----------|--------|---------------------|
| **P0 (Critical)** | Training notifications broken, channel conflict | Core feature doesn't work, watch notifications unreliable |
| **P1 (High)** | Permission checks, notification volume | Silent failures, Android blocking |
| **P2 (Medium)** | Grouping, performance, missing actions | UX degradation, slower reconciliation |
| **P3 (Low)** | Wear OS explicit bridging, push infrastructure | Nice-to-have improvements |

---

## Phase 1: Fix Training Notifications (P0 - Critical)

### Root causes
1. AppState gating blocks scheduling when app is active
2. Rest completion cancels notification instead of showing it
3. Mode restriction (only works in 'timed' mode)
4. Missing "set done" and "session complete" notifications

### Fixes

#### 1a. Remove AppState gating

**File**: `app/src/components/training/TrainingSessionView.tsx`

**Lines to change**: 273, 299

**Current**:
```typescript
if (AppState.currentState === 'active') return;
```

**Fix**: Remove this check or invert logic:
```typescript
// Schedule regardless of app state - notifications work even if app is active
// They just won't show while app is in foreground (system behavior)
```

**Why**: Notifications should be scheduled even if the app is active. The OS will handle showing them when appropriate.

#### 1b. Fix rest completion flow

**File**: `app/src/components/training/TrainingSessionView.tsx:1580`

**Current**:
```typescript
onComplete={() => {
  // ... rest timer ends
  cancelRestFinishNotification().catch(() => {});
}}
```

**Fix**: Don't cancel the notification. Instead:
```typescript
onComplete={() => {
  setRestTimer(null);
  setRestTimerPaused(false);
  setRestTimerRemaining(null);
  restNotificationContextRef.current = null;
  restStartNotifiedRef.current = null;
  // Don't cancel - let notification show
  // It will be dismissed when user taps NEXT_SET or app becomes active
}}
```

**Why**: The "rest complete" notification should show when rest finishes, even if the app is active.

#### 1c. Support manual mode notifications (optional)

**File**: `app/src/components/training/TrainingSessionView.tsx:704`

**Current**: Only schedules if `mode === 'timed'`

**Fix**: Remove mode restriction or add user preference:
```typescript
// Allow notifications in manual mode too
if (plannedSets.length > 0) {
  // ... notification scheduling
}
```

**Why**: Manual mode users also benefit from rest/set notifications.

#### 1d. Add "session complete" notification

**File**: `app/src/components/training/TrainingSessionView.tsx:1264-1271`

**Current**: Clears intents, no notification

**Fix**: Schedule session complete notification before clearing:
```typescript
await setIntent({
  logicalKey: `training_complete:${sessionId}`,
  kind: 'immediate',
  title: 'Session complete!',
  body: `Great work! ${completedSets} sets done.`,
  channelId: 'reminder-chime',
  categoryIdentifier: 'TRAINING_COMPLETE',
  data: { action: 'VIEW_SUMMARY', sessionId },
  appTag: 'reclaim',
});
await reconcileNotifications();
// Then clear training intents...
```

**Why**: User gets confirmation that the session is logged.

---

## Phase 2: Fix Channel Configuration (P0 - Critical)

### Root cause
Duplicate channel setup in `App.tsx` and `NotificationScheduler.ts` with conflicting importance levels.

### Fix

#### 2a. Remove duplicate channel setup

**File**: `app/App.tsx:415-422`

**Current**:
```typescript
Notifications.setNotificationChannelAsync('default', {
  importance: Notifications.AndroidImportance.DEFAULT,  // ❌ CONFLICT
  lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  vibrationPattern: [0, 250, 250, 250],
});
```

**Fix**: Delete lines 415-422

**Why**: `NotificationScheduler.ensureReclaimChannels()` is the single source of truth for channel configuration.

#### 2b. Verify channel consistency

**File**: `app/src/lib/notifications/NotificationScheduler.ts:112-162`

**Action**: Verify all channels use HIGH importance for actionable notifications:
- `default`: HIGH ✅
- `reminder-chime`: HIGH ✅
- `mindfulness-health`: HIGH ✅
- `meditation`: HIGH ✅
- `reminder-silent`: DEFAULT ✅ (intentional)

**Why**: HIGH importance ensures notifications appear on lock screen and watch.

---

## Phase 3: Add Missing Permission Checks (P1 - High)

### Gaps
Health triggers and meditation schedulers don't check notification permissions.

### Fixes

#### 3a. Add permission check to health triggers

**File**: `app/src/lib/health/notificationTriggers.ts:162`

**Current**:
```typescript
async function triggerMindfulnessNotification(...) {
  // ... checks health permissions but not notification permissions
}
```

**Fix**: Add notification permission check:
```typescript
async function triggerMindfulnessNotification(...) {
  const notifGranted = await Notifications.getPermissionsAsync();
  if (!notifGranted.granted && notifGranted.status !== 'granted') {
    logger.warn('[HEALTH_TRIGGER] Notification permission not granted; skipping');
    return;
  }
  // ... rest of function
}
```

#### 3b. Add permission check to meditation schedulers

**File**: `app/src/hooks/useMeditationScheduler.tsx:67, 97`

**Fix**: Check permissions before calling `setIntent`:
```typescript
const granted = await ensureNotificationPermission();
if (!granted) {
  logger.warn('[MEDITATION] Notification permission not granted; skipping schedule');
  return;
}
```

#### 3c. Add permission check to refill reminders

**File**: `app/src/lib/refillReminders.ts:26`

**Fix**: Same as 3b.

---

## Phase 4: Reduce Notification Volume (P1 - High)

### Problem
50–100 scheduled notifications approaching Android's practical limit.

### Strategies

#### 4a. Reduce medication dose cap

**File**: `app/src/hooks/useNotifications.ts:762`

**Current**: `upcomingDoseTimes(med.schedule, 8)` — 8 doses per med

**Option 1**: Reduce to 4 doses (next 24–48 hours only)
```typescript
upcomingDoseTimes(med.schedule, 4)
```

**Option 2**: Reduce to 2 doses (next 12–24 hours only)
```typescript
upcomingDoseTimes(med.schedule, 2)
```

**Recommendation**: Start with 4, monitor feedback.

**Why**: Reduces total notification count by 50%. Users don't need reminders 7 days out.

#### 4b. Group medication notifications

**File**: `app/src/hooks/useNotifications.ts:727-775`

**Current**: Each dose is a separate notification

**Fix**: Add grouping for meds:
```typescript
await Notifications.scheduleNotificationAsync({
  content: {
    // ... existing
    data: {
      // ... existing
      group: 'meds',  // Group all med notifications
      tag: medId,     // Tag by med (allows updating instead of stacking)
    },
  },
  trigger,
});
```

**Why**: Stacks med notifications in Android tray, reduces visual clutter.

#### 4c. Stack training notifications

**File**: `app/src/lib/notifications/trainingNotificationScheduler.ts`

**Fix**: Add group and tag:
```typescript
data: {
  // ... existing
  group: 'training',
  tag: sessionId,
}
```

**Why**: Training rest + set notifications stack instead of cluttering tray.

---

## Phase 5: Add Missing `appTag` (P1 - High)

### Problem
Refill reminders and meditation notifications don't have `appTag: 'reclaim'`, so they're not managed by the reconciler.

### Fixes

#### 5a. Add `appTag` to refill reminders

**File**: `app/src/lib/refillReminders.ts:46`

**Current**:
```typescript
data: {
  action: 'refill',
  medId: med.id,
  logicalKey,
},
```

**Fix**:
```typescript
data: {
  action: 'refill',
  medId: med.id,
  logicalKey,
  appTag: 'reclaim',  // ← Add this
},
```

#### 5b. Add `appTag` to meditation notifications

**File**: `app/src/hooks/useMeditationScheduler.tsx:78, 108`

**Current**:
```typescript
data: {
  action: 'meditation',
  // ... no appTag
}
```

**Fix**:
```typescript
data: {
  action: 'meditation',
  appTag: 'reclaim',  // ← Add this
  // ...
}
```

**Why**: Ensures these notifications are managed by reconciliation and cleared when stale.

---

## Phase 6: Improve Action Coverage (P2 - Medium)

### Add actions to passive notifications

#### 6a. Mood notification quick actions

**File**: `app/src/lib/notifications/NotificationScheduler.ts`

**Fix**: Add category with mood scale actions:
```typescript
await Notifications.setNotificationCategoryAsync('MOOD_REMINDER', [
  { identifier: 'MOOD_1', buttonTitle: '😔 1', opensAppToForeground: false },
  { identifier: 'MOOD_3', buttonTitle: '😐 3', opensAppToForeground: false },
  { identifier: 'MOOD_5', buttonTitle: '😊 5', opensAppToForeground: false },
]);
```

**Handler**: Add to `processNotificationResponse()` in `useNotifications.ts`

**Why**: Users can log mood without opening app.

#### 6b. Sleep confirmation action

**Fix**: Add "I'm awake" action to morning confirm notification

**Why**: Confirms wake time without opening app.

#### 6c. Meditation quick-start action

**Fix**: Add "Start now" action to meditation reminders

**Why**: Launches meditation from notification.

---

## Phase 7: Performance Optimizations (P2 - Medium)

### 7a. Parallelize cancellation

**File**: `app/src/lib/notifications/NotificationScheduler.ts:713-715`

**Current**: Sequential cancellation

**Fix**:
```typescript
await Promise.all(
  appNotifs.map(n => Notifications.cancelScheduledNotificationAsync(n.identifier))
);
```

**Why**: Reduces cancellation time from 1–2s to <500ms with 50+ notifications.

### 7b. Parallelize scheduling

**File**: `app/src/lib/notifications/NotificationScheduler.ts:722-728`

**Fix**: Batch schedule operations (careful: may hit OS limits)

**Why**: Faster reconciliation.

### 7c. Cache health data for meditation after-wake

**File**: `app/src/lib/notifications/NotificationScheduler.ts:574`

**Current**: Calls `getLatestWakeTime()` on every reconciliation

**Fix**: Cache result with 5-minute TTL

**Why**: Reduces expensive health data queries.

---

## Phase 8: Notification Grouping & Stacking (P2 - Medium)

### Android notification groups

**Concept**: Group related notifications so they stack in the tray.

**Implementation**:
- Meds: `group: 'meds'`, `tag: medId`
- Training: `group: 'training'`, `tag: sessionId`
- Refill: `group: 'meds'`, `tag: 'refill'`

**Why**: Reduces notification tray clutter, improves UX.

---

## Phase 9: Wear OS Explicit Bridging (P3 - Low, Future)

### Current limitation
Relies on Expo auto-mirroring, which may not work reliably on all Wear OS devices.

### Future enhancement

**Option 1**: Use Expo config plugin for Wear OS
- Check if Expo supports Wear OS notification extensions
- Configure via `app.config.ts`

**Option 2**: Native Wear OS module
- Create custom native module with `WearableExtender`
- Requires Android native development
- Allows custom watch layouts and actions

**Recommendation**: Test auto-mirroring thoroughly first. Only implement native extension if mirroring fails.

---

## Phase 10: Push Notifications (P3 - Future, Not Recommended Now)

### When to introduce push

**Don't introduce yet** for:
- Med reminders (predictable schedule)
- Training (session-driven)
- Sleep/mood (fixed times)

**Consider later** for:
- Server-side insights (ML-generated recommendations)
- Social features (team challenges, sharing)
- Real-time coaching (if added)
- Emergency alerts (if needed)

### Infrastructure needed if added

1. Expo push token registration
2. Server-side push sending (Supabase Edge Functions or Node.js service)
3. Token storage and management
4. Fallback to local if push fails
5. FCM/APNs configuration

**Recommendation**: **Not needed now**. Local notifications are sufficient.

---

## Implementation Order

### Immediate (this sprint)

1. **Fix training notifications** (Phase 1: 1a-1d)
   - Remove AppState gating
   - Fix rest completion flow
   - Support manual mode
   - Add session complete notification

2. **Remove duplicate channel setup** (Phase 2: 2a)
   - Delete `App.tsx:415-422`

3. **Add missing permission checks** (Phase 3: 3a-3c)
   - Health triggers
   - Meditation schedulers
   - Refill reminders

### Next sprint

4. **Reduce notification volume** (Phase 4: 4a)
   - Cap meds to 4 doses (down from 8)

5. **Add notification grouping** (Phase 4: 4b-4c, Phase 8)
   - Group meds
   - Stack training

6. **Add `appTag` to all notifications** (Phase 5: 5a-5b)
   - Refill reminders
   - Meditation

### Future

7. **Performance optimizations** (Phase 7)
   - Parallelize cancellation/scheduling
   - Cache health data queries

8. **Action coverage** (Phase 6)
   - Mood quick-log
   - Sleep confirmation
   - Meditation quick-start

9. **Wear OS explicit bridging** (Phase 9)
   - Only if auto-mirroring proves unreliable

---

## Testing Checklist

After each phase:

### Phase 1 (Training) verification
- [ ] Start training session in app
- [ ] Complete a set → "Set done" notification appears
- [ ] Rest starts → "Rest started" notification appears (or silent if desired)
- [ ] Rest completes → "Rest complete" notification appears with NEXT_SET action
- [ ] Tap NEXT_SET → next set notification appears
- [ ] Complete session → "Session complete" notification appears
- [ ] Test in 'timed' and 'manual' modes
- [ ] Verify on Samsung Galaxy and Samsung Watch

### Phase 2 (Channels) verification
- [ ] Check Android notification settings → all channels present
- [ ] Verify `default` channel importance is HIGH
- [ ] Test notification appears on watch
- [ ] Test actions work from watch

### Phase 3 (Permissions) verification
- [ ] Revoke notification permissions
- [ ] Trigger health threshold → notification should not appear (logged)
- [ ] Schedule meditation → notification should not appear (logged)
- [ ] Grant permissions → notifications work

### Phase 4 (Volume) verification
- [ ] Add 10 meds with different schedules
- [ ] Verify total notification count ≤ 50
- [ ] Check Android doesn't block notifications
- [ ] Verify grouping works (meds stack in tray)

---

## Risk Mitigation

### Training notification fixes

**Risk**: Notifications may show even when app is active  
**Mitigation**: This is normal OS behavior — notifications queue and show when app backgrounds

**Risk**: Too many rest/set notifications  
**Mitigation**: Cancel old training notifications when session ends (already implemented)

### Channel configuration

**Risk**: Changing channel importance may affect existing users  
**Mitigation**: Channels are recreated on app start with new config

### Notification volume reduction

**Risk**: Users may miss doses if cap is too low  
**Mitigation**: Start with 4 doses (24–48 hours), monitor feedback

---

## Success Metrics

1. **Training notifications appear** during sessions (rest complete, next set)
2. **Watch notifications work** on Samsung Galaxy Watch
3. **Notification volume** stays under 50 on Android
4. **Zero permission errors** in logs
5. **Users can complete training** without opening app (via notification actions)

---

## Architecture Changes

### Before
- Training: AppState gating, notifications only when backgrounded
- Channels: Duplicate setup, importance conflict
- Permissions: Missing checks in 3 modules
- Volume: 50–100 notifications

### After
- Training: Always schedule, show when appropriate
- Channels: Single source of truth, consistent HIGH importance
- Permissions: All modules check before scheduling
- Volume: <50 notifications, grouped by type

---

## Open Questions

1. **Should training notifications be silent by default?**
   - Option A: Use `reminder-chime` (current)
   - Option B: Create `training-silent` channel, let user choose in settings
   - **Recommendation**: Keep chime, add setting later if needed

2. **Should we add a "max notifications" setting?**
   - Let users cap med doses (2, 4, or 8)
   - **Recommendation**: Not yet — reduce to 4 globally first, add setting if users request more

3. **Should rest notifications be immediate or delayed?**
   - Option A: Immediate "Rest started" (current)
   - Option B: Only show "Rest complete"
   - **Recommendation**: Keep "Rest started" for now, make it optional later

4. **Should we add push notifications for insights?**
   - **Recommendation**: No — not needed yet, adds complexity

---

## Next Steps

1. **Review this plan** with the user
2. **Prioritize phases** (recommend: 1, 2, 3 first)
3. **Implement fixes** in order
4. **Test on Samsung Galaxy + Watch** after each phase
5. **Monitor notification volume** in production

Ready to proceed with implementation?
