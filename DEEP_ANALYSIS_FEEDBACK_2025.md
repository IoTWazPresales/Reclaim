# Deep Analysis: User Feedback (Jan 2025)

This document summarizes issues identified from user feedback, root cause analysis, and proposed fixes. **Review and approve before implementation.**

---

## 1. Loading Screen / ReclaimLogo

### Issue
- **R position**: The "R" appears at the top-left of the orb instead of centered.
- **Rings**: The rings don't overlap the orb like the logo (splash.png) – they should pass through the central orb.

### Root Cause
- **R position**: The R path has viewBox ~0–26 × 0–48. Centering uses `translateX: -14, translateY: -24`. The path’s visual center may be off (e.g. left‑heavy). Correct center is likely `-13, -24` or needs to be derived from the path’s bounding box.
- **Rings**: Rings are drawn as ellipses; render order and/or stroke width may make them appear to sit outside the orb. In the splash, rings visually pass through the central orb.

### Proposed Fix
1. **R centering**: Measure the R path’s bounding box; use half width and half height for translate values. Or compare with `splash.png` and adjust until the R aligns with the center orb.
2. **Rings**: Adjust z-order so rings overlap the orb, or increase ring stroke width/opacity so they clearly pass through the center.
3. **Reference**: Use `splash.png` (or equivalent asset) as the visual reference and align ReclaimLogo to match.

---

## 2. Random Bench / Prep Notifications Without Active Session

### Issue
Training “bench start” (or similar) notifications fire when no session is running.

### Root Cause
1. **Stale intents**: If the user force-closes or navigates away during a guided session without completing or cancelling, intents remain. The next `reconcileNotifications` can still schedule them, and OS notifications can fire later.
2. **Missing `training_first` clear**: Session end clears `training_rest:` and `training_set:` but not `training_first:`. The “Session started” intent (`training_first:`) is not cleared on session end (though it usually fires immediately).
3. **No startup cleanup**: There is no app startup cleanup that clears training intents when there is no in-progress session.

### Proposed Fix
1. **Clear `training_first` on session end**: In `TrainingSessionView` (handleComplete and handleCancelSession), also call `clearIntentsByPrefix(\`training_first:\${sessionId}:\`)`.
2. **Startup/foreground cleanup**: On app launch or foreground, if there is no in-progress training session, call `clearIntentsByPrefix('training_rest:')`, `clearIntentsByPrefix('training_set:')`, `clearIntentsByPrefix('training_first:')`, then `reconcileNotifications()`. This removes stale training intents and cancels orphaned notifications.

---

## 3. Mood Screen Hero – Text Cut Off, Drawing Too Small

### Issue
- Hero text is cut off.
- Hero drawing (MoodWeatherVisualization) is smaller than on other screens (e.g. Sleep, Meds).

### Root Cause
- MoodHero uses the same constants as SleepHero (e.g. `ORB_WIDTH_RATIO`, `ORB_MIN`, `ORB_MAX`, `centerSize = orbSize * 0.70`), but MoodScreen layout or content may differ.
- Text overflow: title at `top: 28` with `variant="titleLarge"` may be clipped if the container has `overflow: hidden` or insufficient height.
- Diagram height `DIAGRAM_SIZE = 390` might be too small for content on some devices.

### Proposed Fix
1. Align MoodHero with SleepHero and MedsHero: use the same orb/ring sizing and center size.
2. Ensure the hero container uses `overflow: 'visible'` and avoid clipping the title.
3. Ensure title and context text use `numberOfLines` and `ellipsizeMode` only if truncation is desired; otherwise increase height or adjust layout.
4. Consider increasing `PADDING_TOP` or using `minHeight` so the full title and subtitle fit.

---

## 4. Meds Screen Hero – Text Cut Off

### Issue
Meds hero text is cut off (similar to Mood).

### Root Cause
Same structural issues as Mood hero: layout and sizing not matching other screens.

### Proposed Fix
1. Match MedsHero layout to SleepHero (e.g. orb size, ring ratios, center size).
2. Add `overflow: 'visible'` and adjust padding/height so title and context lines are not clipped.
3. Verify text containers have enough space; increase `PADDING_TOP` if needed.

---

## 5. Meds Showing “High Consistency” When Not Taking Regularly

### Issue
Insight “meds-high-consistency” appears and meds adherence looks high even when the user has not been taking medications regularly.

### Root Cause
- `computeAdherence(logs)` uses:
  - `scheduled = logs.length`
  - `taken = logs.filter(l => l.status === 'taken').length`
  - `pct = taken / scheduled`
- `meds_log` only contains user-recorded events (Taken/Skip). There are no automatic “missed” rows.
- So if a user logs 6 taken doses in 7 days, we get 6 logs, 6 taken → 100% adherence.
- The real expectation is: **expected doses from schedule** vs **taken**. With 14 expected (e.g. 2/day × 7) and 6 taken, adherence should be ~43%, not 100%.

### Proposed Fix
1. Change `computeAdherence` to be schedule-based:
   - New function: `computeAdherenceFromSchedule(logs, meds)`:
     - `expected =` sum over meds of `upcomingDoseTimes(med.schedule, N)` for the last N days (count only past doses).
     - `taken =` logs with `status === 'taken'` in that window.
     - `pct = expected > 0 ? round((taken / expected) * 100) : 0`
2. Update Dashboard, contextBuilder, and MedsScreen to pass `meds` (and date window) into adherence computation.
3. Fallback: if we can’t compute expected from schedule (e.g. no meds), use current behavior but document it as best-effort.

---

## 6. Meds Screen Layout – Too Text-Heavy and Redundant

### Issue
- “Due today” shows meds, times, and days under the header.
- “Active medications” below repeats similar data.
- Layout feels cluttered and text-heavy.

### Proposed Redesign Options

**Option A – Single “Today” Card**
- One card: “Today’s medications”
- Each med: name, dose, times (e.g. “8:00 AM, 9:00 PM”), days (e.g. “Mon–Fri”).
- Per-dose row: time | Taken / Skip / Missed (actionable).
- Remove a separate “Active medications” section, or move it to a collapsible “All medications” area.

**Option B – Swipeable Dose Cards**
- One card per dose slot today (chronological).
- Each card: med name, time, status (Due / Taken / Skipped), quick actions.
- “Active medications” becomes a compact list (names + times) without duplicating dose details.

**Option C – Timeline View**
- Vertical timeline for today.
- Each slot: time, med(s) at that time, status, tap to log.
- “Manage medications” link to add/edit meds.
- Less repetition, clearer at-a-glance view.

**Recommendation**: Option A or C to reduce duplication and make actions clearer.

---

## 7. App Crashes on Navigate / Certain Actions

### Issue
The app sometimes closes when navigating or performing actions.

### Root Cause (Hypotheses)
- Unhandled JS exceptions (partially mitigated by error boundaries and Sentry).
- React Navigation stack issues or invalid routes.
- Heavy work on the main thread during navigation.
- Native module or Skia/Canvas errors (e.g. in hero diagrams).

### Proposed Fix
1. Ensure `ScreenErrorBoundary` wraps all main screens (Dashboard, Exercise, Mood, Sleep, Meds).
2. Add Sentry breadcrumbs for navigation events.
3. Review `navigation.navigate()` and route params; guard against undefined routes or invalid params.
4. Add `try/catch` and error logging around likely crash points (e.g. hero renders, chart components).
5. If Skia is suspected, isolate hero rendering with an error boundary.

---

## 8. Dashboard Mood Node – Not Linked to Brain, Shows “Off” When It Should Show “On”

### Issue
- Mood chip is not visually linked to the brain like Sleep, Meds, Training.
- Mood shows as “off” even when there is mood data.

### Root Cause
1. **Connector**: `NodeToBrainConnectors` draws lines for `['mood', 'sleep', 'training', 'meds', 'insights']`. Mood is included, so the connector should render. If it appears unlinked, it may be due to color (`isActive ? color : dim`) – when status is `'—'`, the line is dim.
2. **Status**: `getLifecycleNodeStatuses` uses `mood: moodStreakCount >= 1 ? 'steady' : '—'`. So mood is active only when `moodStreakCount >= 1` (consecutive days).
3. **Mismatch**: User may have mood check-ins but no streak (e.g. non-consecutive days), so `moodStreakCount === 0` → status `'—'` → dim connector and “off” look.

### Proposed Fix
1. Broaden mood status: treat mood as active if there is any mood data in the last 7 days (e.g. `hasMoodCheckinsLast7Days`), not only when `moodStreakCount >= 1`.
2. Extend `getLifecycleNodeStatuses` with `hasMoodCheckinsRecent?: boolean` and use: `mood: (moodStreakCount >= 1 || hasMoodCheckinsRecent) ? 'steady' : '—'`.
3. In Dashboard, compute `hasMoodCheckinsRecent` (e.g. from `listMoodCheckins` or an existing query) and pass it into `getLifecycleNodeStatuses`.

---

## 9. Log Analysis (From Provided Events)

### Observations
- `insight_shown` events repeat (e.g. `meds-high-consistency`, `mood-below-baseline`) across dashboard, meds, and mood screens.
- `sync_coordinator_completed` with `sleepSyncStatus: "synced"` or `"write_failed"` – sync flow appears to run as designed.
- Multiple rapid `insight_shown` events suggest duplicate renders or multiple insight cards being evaluated in quick succession.

### Potential Actions
1. Add idempotency or debouncing for insight display to avoid duplicate logs.
2. Ensure insight selection runs once per screen mount/focus, not on every render.
3. Re-check `meds-high-consistency` display once adherence logic is fixed (Issue 5).

---

## Implementation Priority

| # | Issue                       | Priority | Effort |
|---|-----------------------------|----------|--------|
| 5 | Meds adherence logic        | High     | Medium |
| 2 | Training notifications      | High     | Low    |
| 8 | Mood node status/connector  | High     | Low    |
| 3 | Mood hero sizing/cutoff     | Medium   | Low    |
| 4 | Meds hero cutoff            | Medium   | Low    |
| 1 | ReclaimLogo R + rings       | Medium   | Medium |
| 6 | Meds screen redesign        | Medium   | High   |
| 7 | App crashes                 | High     | Medium |

---

## Next Steps

1. Review this document and approve or adjust proposed fixes.
2. Decide on Meds redesign direction (A, B, or C).
3. Implement in the order above, or as you prefer.
4. Re-test after each change.
