# Audit & Fix Plan — January 2025

Root cause analysis and proposed fixes for the five reported issues. **Do not implement until approved.**

---

## 1. Sleep Data Not Getting Written to Supabase

### Problems Identified

1. **First-load / onboard gap**
   - `syncHealthData` writes to Supabase via `upsertSleepSessionFromHealth` when it runs.
   - SleepStepScreen (onboarding) does **not** trigger any health sync after connecting a provider. It only connects and navigates.
   - IntegrationsScreen calls `syncHealthData` after connecting **only for Health Connect** (`id === 'health_connect'`), not for Samsung.
   - Samsung import runs only when `getIntegrationStatus('samsung_health')?.connected` in `syncHealthData`, and `importSamsungHistory` is only called from SleepScreen (manual) or IntegrationsScreen (manual).

2. **No automatic daily sync**
   - Sync runs only when: app opens (SyncEngine, Dashboard), user pulls-to-refresh, or comes to foreground (Dashboard AppState listener).
   - There is no background/scheduled “log previous night’s sleep” job.

3. **Inconsistent / broken-sleep data (e.g. Sunday 00:14–03:14)**
   - `toDateKey` uses `startTime` for deduplication, so a segment starting Sunday 00:14 maps to Sunday.
   - Health providers (Samsung, Health Connect, Google Fit) can return **sleep segments** (e.g. light/deep/REM phases) as separate sessions. Each segment is imported as a separate row.
   - A 3-hour segment (00:14–03:14) is valid as a phase but looks like “broken sleep” when shown alone.
   - `sleepDateKeyFromSession` (importSamsungHistory) uses `endTime ?? startTime` for keys, while `syncHealthData` uses `toDateKey(startTime)` for Health Connect. Inconsistent key logic can cause duplicates or skips.

### Proposed Fixes

| Fix | Type | Description |
|-----|------|-------------|
| **1a** | Proper | After connecting any health provider in **SleepStepScreen** and **IntegrationsScreen**, call `syncHealthData()` (and, for Samsung, `importSamsungHistory(30)`) and invalidate sleep-related queries. |
| **1b** | Proper | Add a daily sync path: `expo-background-fetch` or `expo-task-manager` to run `syncHealthData()` once per day (e.g. after wake). Keeps previous night’s sleep in Supabase even when the app isn’t opened. |
| **1c** | Proper | **Aggregate sleep segments** before insert: if a provider returns multiple sessions within a single night (e.g. overlapping or adjacent 00:14–03:14, 03:14–05:00, etc.), merge them into one “sleep night” and upsert that. Use a consistent “sleep night” key (e.g. date of evening before, or date of `endTime` for overnight sleep). |
| **1d** | Proper | Standardize date keys: use one convention (e.g. “sleep night” = date of evening before midnight for sessions ending after midnight) across `importSamsungHistory`, Health Connect, and Google Fit sync. |

---

## 2. Training No Longer Gets Scheduled in the Calendar

### Problems Identified

1. **Calendar events only at setup**
   - `createWorkoutEventsForDates` runs **only** in `TrainingSetupScreen` mutation `onSuccess`, for the dates returned by `createProgramDays`.
   - No path adds new calendar events when a new week starts or when the user views/accepts routine suggestions.

2. **Routine Accept does not create calendar events**
   - `handleAcceptRoutine` only persists to local/remote routine state. It never calls `createCalendarEvent`.
   - Training routine suggestions appear in the Dashboard “Today” view, but are not written to the device calendar.

3. **Silent failure**
   - `createWorkoutEventsForDates(...).catch(() => {})` swallows errors. If permissions fail or `createEventAsync` fails, there is no logging or user feedback.

4. **No recurring sync**
   - `generateWeeklyTrainingPlan` creates routine suggestions, not program days or calendar events. When a new week starts, no new calendar events are created.

### Proposed Fixes

| Fix | Type | Description |
|-----|------|-------------|
| **2a** | Proper | When user **Accepts** a training routine (or any routine with time), call `createCalendarEvent` to add it to the device calendar. Ensure we request calendar write permission before creating events. |
| **2b** | Proper | When `generateWeeklyTrainingPlan` runs (TrainingSetupScreen or a weekly job), call `createWorkoutEventsForDates` for the suggested workout dates so training appears in the device calendar for the whole plan. |
| **2c** | Patch | Add logging in `createWorkoutEventsForDates`: log success count and errors instead of swallowing them. |
| **2d** | Proper | Add a weekly job (or run when TrainingScreen loads and detects a new week) to regenerate training suggestions and create calendar events for the new week. |

---

## 3. Intent Adjustment Modal — Cannot Move/Select Item

### Problems Identified

1. **“Adjust” only accepts at the suggested time**
   - `handleAdjustRoutine` opens `ScheduleOverlay` with a draft item whose `onPress` is `handleAcceptRoutine(tpl, start, end)`.
   - Tapping the draft accepts at the **suggested** `start`/`end`. There is no way to choose a different time.

2. **Misleading copy**
   - Subtitle says “Tap to place” but tapping places at the fixed suggestion, not at a user-selected slot.

3. **No time/slot picker**
   - `ScheduleOverlay` shows a list of existing items (meds, sleep, routines) and the draft. There is no time picker, slot selector, or drag-to-reorder.

### Proposed Fixes

| Fix | Type | Description |
|-----|------|-------------|
| **3a** | Proper | Add a **time picker** (or slot grid) when the user taps “Adjust”: allow selecting start/end (or preset slots), then accept at the chosen time. |
| **3b** | Proper | Or: open a bottom sheet with a time-range picker; on confirm, call `handleAcceptRoutine(tpl, chosenStart, chosenEnd)`. |
| **3c** | Patch | Update copy: change “Tap to place” to “Tap to accept at suggested time” until proper time selection is implemented. |

---

## 4. Dashboard Sync Takes Too Long

### Problems Identified

1. **Blocking initial sync**
   - On first Dashboard mount (or when `lastSync` is null or older than 5 minutes), `runHealthSync` runs and can block the initial render feeling “ready.”
   - `syncHealthData` runs providers sequentially: Health Connect → Apple → Samsung → Google Fit. Each does async I/O.

2. **Heavy query set**
   - Dashboard triggers many queries: `calendarQ`, `sleepQ`, `sleepSettingsQ`, `medsQ`, `medLogsQ`, `routineState`, `routineSuggestions`, `routineTemplates`, `streaks`, `insights`, etc. They run in parallel via React Query but still add load.

3. **Redundant sync on foreground**
   - AppState listener calls `runHealthSync` every time the app becomes active, with a 60s cooldown. For frequent switching, this can feel sluggish.

### Proposed Fixes

| Fix | Type | Description |
|-----|------|-------------|
| **4a** | Proper | **Defer** initial health sync: render Dashboard immediately with cached data, run `syncHealthData` in the background, then invalidate/refetch when done. Avoid blocking the first paint. |
| **4b** | Proper | Parallelize provider checks where safe: e.g. run Health Connect and Google Fit availability in parallel, then sync the available providers. |
| **4c** | Patch | Increase cooldown for foreground sync (e.g. 2–3 minutes) to reduce churn when app-switching. |
| **4d** | Proper | Mark some queries as lower priority: e.g. insights can load after core dashboard data (meds, sleep, today’s schedule). |

---

## 5. Onboard Screen Still Shows Up / App Loading UX

### Problems Identified

1. **Brief onboarding flash**
   - RootNavigator waits for `getHasOnboarded` (local) and optionally remote `profiles.has_onboarded`. Until both are resolved, it can show a splash. If remote is slow or unknown, an 8s failsafe allows onboarding to show.
   - Users may see a short flash of onboarding or a blank/splash state before the Dashboard.

2. **No preload of critical data**
   - After auth and onboarding resolution, the app navigates straight to Dashboard. Dashboard then triggers its own queries and health sync.
   - There is no shared “app loading” phase that preloads minimal data (e.g. user settings, last sync timestamp) before showing the main UI.

### Proposed Fixes

| Fix | Type | Description |
|-----|------|-------------|
| **5a** | Proper | Introduce an **app loading screen** (splash + spinner or skeleton) that: (1) resolves auth + onboarding, (2) preloads minimal data (user settings, last sync), (3) then navigates to Dashboard or Onboarding. This avoids flashing onboarding and makes the transition to Dashboard feel intentional. |
| **5b** | Proper | Keep the splash visible until `hasOnboarded` is known; only then switch to Onboarding or App. Avoid showing onboarding when `hasOnboarded` is still null. |
| **5c** | Patch | If remote is slow, trust local `hasOnboarded === true` immediately and show App; sync remote in background. (Partially exists; ensure it’s consistent.) |

**Best practice:** A single, branded loading screen that covers auth + onboarding resolution + minimal preload is standard for production apps. It improves perceived performance and avoids jarring transitions.

---

## Summary

| # | Issue | Root Cause | Fix Type |
|---|-------|------------|----------|
| 1 | Sleep not in Supabase | No sync on connect; no daily job; segment vs full-night handling | Proper (1a–1d) |
| 2 | Training not in calendar | Events only at setup; Accept doesn’t create events; silent failures | Proper (2a–2d) + Patch (2c) |
| 3 | Adjust modal can’t move item | No time picker; only accept at suggested time | Proper (3a–3b) or Patch (3c) |
| 4 | Dashboard sync slow | Blocking initial sync; sequential providers; heavy queries | Proper (4a–4d) |
| 5 | Onboard / loading UX | No preload; potential flash; no unified loading phase | Proper (5a–5c) |

---

**Next step:** Review this plan and approve which fixes to implement. Implement in order: 1 (sleep), 2 (training calendar), 3 (adjust modal), 4 (dashboard sync), 5 (loading UX), or as you prefer.

---

## Implementation Log (Partial)

### Implemented 2025-01
- **Sleep sync**: First vs incremental (90 days on first sync, 7 days on subsequent). Sync on connect for all providers (SleepStepScreen, IntegrationsScreen). Writes to Supabase via `upsertSleepSessionFromHealth`.
- **Delete program plan**: Added `deleteProgramPlan()` API and "Delete program" button in TrainingSetupScreen when editing. Allows user to start from scratch.
