# Notification System Audit — Post-Implementation

## Summary of Changes

### 1. Migrated Refill Reminders to Intent System
- **refillReminders.ts**: Replaced direct `scheduleNotificationAsync` with `setIntent` + `reconcileNotifications`
- Intent key format: `med_refill:{medId}`
- Intent data: `type: 'MED_REFILL'`, `weekday`, `hour`, `minute`, `medId`, `medName`
- `cancelRefillReminders` now clears intents and reconciles
- Added `buildPlanFromIntents` case for MED_REFILL with weekly trigger
- Added `buildTriggerForSchedule` support for `weekday` (weekly trigger)
- Tap handler: added `dest: 'Meds'` and MED_REFILL fallback for navigation

### 2. Migrated Meditation Reminders to Intent System
- **useMeditationScheduler.tsx**: Replaced direct scheduling with intent-based flow
- `scheduleMeditationAtTime`: writes MEDITATION_FIXED intent, reconciles
- `scheduleMeditationAfterWake`: writes MEDITATION_AFTER_WAKE intent, reconciles
- `cancelMeditationRule`: clears intent, reconciles
- Intent keys: `meditation:fixed_time:type:hour:minute` or `meditation:after_wake:type:offsetMinutes`
- buildPlanFromIntents: MEDITATION_FIXED (daily), MEDITATION_AFTER_WAKE (recomputes wake time each reconcile)
- Meditation notifications now get appTag via reconcile

### 3. TAKE/SKIP Clear Intent
- Added `logicalKey` to MED_REMINDER notification data in buildPlanFromIntents
- `handleMedReminderAction`: TAKE and SKIP now call `clearIntent(data.logicalKey)` and `reconcileNotifications`

### 4. cancelRemindersForMed Clears Intents
- Now calls `clearIntentsByPrefix(\`med:${medId}:\`)` and `reconcileNotifications`
- Ensures deleted med intents don't reschedule

### 5. Phase 2: Wear OS–Appropriate Android Channels
- **ensureReclaimChannels()** in NotificationScheduler: single source of truth for all Reclaim channels
- Channels: default, reminder-chime, reminder-silent, mindfulness-health, meditation
- Wear OS config: `lockscreenVisibility: PUBLIC`, `importance: HIGH` for actionable types
- useNotifications: calls `ensureReclaimChannels()` instead of per-channel setup
- useMeditationScheduler: removed duplicate `ensureMeditationChannel`; relies on centralized setup
- Ensures consistent visibility and behavior on Samsung Galaxy + Samsung Watch (Wear OS)

### 6. Phase 3: Reliability (Retry, Offline Queue, Debounce)
- **logMedDose retry**: TAKE/SKIP retries 3x with 500ms delay before enqueueing
- **MedDoseOfflineQueue**: Failed doses enqueued, replayed on app start, foreground, and sync
- **syncMedDoseQueue**: Called from useNotifications (start + foreground) and SyncEngine (runOncePush, reconcile)
- **Debounce reconcile**: 250ms trailing debounce to coalesce rapid successive calls
- **forceRescheduleNotifications**: Bypasses debounce for explicit user-triggered reschedule
- **Idempotency**: wasActionProcessed/markActionProcessed already applied to all actions

### 7. Previous Fixes (from earlier session)
- Med snooze: clear original intent before setting snooze intent
- Reconcile: only cancel appTag notifications (preserves non-Reclaim during transition)
- Reconcile mutex: prevents race conditions
- Training intents: cleared when session ends/cancelled
- Med reminder cap: 8 doses per med (iOS 64 limit)

---

## Runtime Flow Verification

### App Boot
1. `useNotifications` useEffect → `reconcileNotifications`
2. Reconcile: settings plan + intents → merge → cancel appTag → schedule merged
3. All notification types (mood, sleep, meds, refill, meditation, health, training) now flow through reconcile

### Med Reschedule (MedsScreen scheduleAllSilent)
1. `cancelAllReminders` — wipes ALL native (clean slate)
2. `scheduleForMed` per med — setIntent + reconcile each
3. `rescheduleRefillRemindersIfEnabled` — clear refill intents, setIntent per med, reconcile
4. Result: meds + refill scheduled (with appTag). Meditation intents persist if set; reconcile includes them.

### Med Snooze
1. User taps Snooze 10m
2. `clearIntent(med:medId:originalTime)` — remove original
3. `setIntent(med:medId:originalTime:snooze, {...})` — add snooze
4. `reconcileNotifications`
5. Result: only snoozed notification scheduled

### Med TAKE/SKIP
1. User taps Taken or Skip
2. `clearIntent(data.logicalKey)` — remove intent
3. `logMedDose`
4. `reconcileNotifications`
5. Result: dose not rescheduled

### Med Deleted
1. `cancelRemindersForMed(id)` — cancel native + `clearIntentsByPrefix(med:id:)` + reconcile
2. Result: no more notifications for that med

### Training Session Ends
1. `clearIntentsByPrefix(training_rest:sessionId:)` + `clearIntentsByPrefix(training_set:sessionId:)`
2. `reconcileNotifications`
3. Result: no stale rest/set notifications

### Refill Toggle Off
1. `cancelRefillReminders` — `clearIntentsByPrefix(med_refill:)` + reconcile
2. Result: no refill notifications

### Meditation Rule Added
1. `scheduleMeditationAtTime` or `scheduleMeditationAfterWake`
2. `setIntent` + reconcile
3. Result: meditation scheduled with appTag

---

## Potential Edge Cases

### 1. Existing Meditation Rules (Pre-Migration)
- **Mitigation**: AutoStartMeditationContent runs a useEffect on mount that syncs all rules from settings to intents. Existing rules get scheduled via reconcile.

### 2. MEDITATION_AFTER_WAKE Recompute
- Each reconcile calls `getLatestWakeTime()`
- If no wake data, uses fallback hour/minute from intent
- Correct behavior for dynamic after-wake scheduling

### 3. iOS 64 Limit
- Cap of 8 doses per med helps stay under limit
- Total: mood (2) + sleep (2) + morning (1) + meds (8×N) + refill (per med) + meditation (per rule) + health + training
- With many meds, could still approach limit; monitor in production

### 4. Mutex Skip
- If reconcile is running and snooze/TAKE triggers, second reconcile is skipped
- Next foreground or other trigger will reconcile with latest intents

---

## Files Modified

- `app/src/lib/refillReminders.ts` — intent-based, removed StoredRefillMap
- `app/src/hooks/useMeditationScheduler.tsx` — intent-based, removed notification ID storage; removed ensureMeditationChannel (uses ensureReclaimChannels)
- `app/src/lib/notifications/NotificationScheduler.ts` — MED_REFILL, MEDITATION_FIXED, MEDITATION_AFTER_WAKE, weekday trigger, logicalKey; ensureReclaimChannels (Phase 2)
- `app/src/hooks/useNotifications.ts` — TAKE/SKIP clear intent, cancelRemindersForMed clear intents, MED_REFILL/dest:Meds tap handling; ensureReclaimChannels (Phase 2)

---

## Verification Checklist

- [x] Refill: schedule → intent → reconcile → native (appTag)
- [x] Refill: cancel → clear intents → reconcile
- [x] Meditation fixed: schedule → intent → reconcile → native (appTag)
- [x] Meditation after-wake: intent with fallback, reconcile recomputes
- [x] Med TAKE: clear intent, log dose, reconcile
- [x] Med SKIP: clear intent, log dose, reconcile
- [x] Med snooze: clear original intent, set snooze intent, reconcile
- [x] cancelRemindersForMed: clear intents by prefix, reconcile
- [x] Tap MED_REFILL → navigate to Meds
- [x] Tap meditation (url) → open deep link
