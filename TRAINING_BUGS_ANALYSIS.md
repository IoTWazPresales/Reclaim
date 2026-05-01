# Training Module Bug Analysis & Fix Plan

## Issue 1: Week 2+ Scheduling on Sunday When Not Selected

### Root Cause Analysis
**Location**: `app/src/lib/training/programPlanner.ts` - `generateProgramDays()` function

**Problem**: The date calculation logic at line 326:
```typescript
dayDate.setDate(normalizedStart.getDate() + (weekIndex - 1) * 7 + (weekday - 1));
```

**Issue**: When `normalizedStart` is Monday (day 1), and we add `(weekIndex - 1) * 7 + (weekday - 1)`:
- Week 1, Monday (weekday=1): `0 * 7 + 0 = 0` days → Monday ✓
- Week 2, Monday (weekday=1): `1 * 7 + 0 = 7` days → Next Monday ✓
- BUT: If `weekday` somehow becomes 7 (Sunday), then `1 * 7 + 6 = 13` days from Monday = Sunday

**Actual Root Cause**: The validation at line 338 checks if weekday is in selectedWeekdays, but the iteration at line 321 uses `Object.entries(weekPlan.days)` which iterates over ALL keys in the days object. If the days object somehow contains a key for weekday 7 (Sunday) that wasn't selected, it will generate dates for it.

**However**, looking more carefully: `buildFourWeekPlan` only adds entries for selected weekdays (line 59-63). So the days object should only contain selected weekdays.

**Real Issue**: The date calculation might be producing dates that fall on Sunday even when weekday key is not 7. This could happen if:
1. The date calculation wraps around incorrectly
2. The weekday validation is checking the wrong thing

**Fix Strategy**:
1. Add explicit filtering: Only iterate over weekdays that are in `plan.selectedWeekdays`
2. Add defensive check: Verify calculated date's weekday matches expected weekday BEFORE adding to programDays
3. Add logging to catch when this happens

**Proposed Fix**:
```typescript
for (const weekday of plan.selectedWeekdays) { // Only iterate selected weekdays
  const dayPlan = weekPlan.days[weekday];
  if (!dayPlan) continue; // Skip if no plan for this weekday
  
  // Calculate date...
  const dayDate = new Date(normalizedStart);
  dayDate.setDate(normalizedStart.getDate() + (weekIndex - 1) * 7 + (weekday - 1));
  
  // Verify weekday matches
  const calculatedWeekday = dayDate.getDay() === 0 ? 7 : dayDate.getDay();
  if (calculatedWeekday !== weekday) {
    throw new Error(`Weekday mismatch...`);
  }
  
  // Only add if weekday is selected
  if (!plan.selectedWeekdays.includes(weekday)) {
    continue; // Skip non-selected weekdays
  }
  
  programDays.push({...});
}
```

---

## Issue 2: Cancel Session (No Recording)

### Root Cause Analysis
**Location**: `app/src/components/training/TrainingSessionView.tsx`

**Problem**: Currently, `onCancel` just closes the view (line 425, 1490). There's no way to cancel a session without saving anything.

**Fix Strategy**:
1. Add a "Cancel Session" button that shows a confirmation dialog
2. If confirmed, delete the session and all its data (set logs, items)
3. Call `onCancel()` to close the view
4. Only show cancel option if session hasn't ended yet

**Proposed Fix**:
- Add cancel handler that:
  1. Shows confirmation: "Cancel session? All logged sets will be deleted."
  2. If confirmed: Delete session via API (or mark as cancelled)
  3. Invalidate queries
  4. Call `onCancel()`

---

## Issue 3: Multiple Sessions Running

### Root Cause Analysis
**Location**: `app/src/screens/TrainingScreen.tsx`

**Problem**: Line 244-303 `startSessionMutation` doesn't check if there's already an active session before starting a new one.

**Current State**: Line 197-200 detects `inProgressSession` but only shows a "Resume" card. It doesn't prevent starting a new session.

**Fix Strategy**:
1. In `handleDayPress` or `handleConfirmSession`, check for `inProgressSession`
2. If exists, show alert: "You have a session in progress. Would you like to resume it or end it?"
3. Options: "Resume", "End & Save", "Cancel"
4. Only allow new session if no active session OR user explicitly ends the active one

**Proposed Fix**:
```typescript
const handleConfirmSession = useCallback(() => {
  if (!pendingPlan || !selectedProgramDay) return;
  
  // Check for active session
  if (inProgressSession) {
    Alert.alert(
      'Session in progress',
      `You have an active session from ${new Date(inProgressSession.started_at).toLocaleDateString()}. What would you like to do?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Resume session', onPress: () => setActiveSessionId(inProgressSession.id) },
        { text: 'End & save', onPress: async () => {
          // End the active session first, then start new one
          await endActiveSession(inProgressSession.id);
          startSessionMutation.mutate({ plan: pendingPlan, programDay: selectedProgramDay });
        }},
      ]
    );
    return;
  }
  
  startSessionMutation.mutate({ plan: pendingPlan, programDay: selectedProgramDay });
}, [pendingPlan, selectedProgramDay, startSessionMutation, inProgressSession]);
```

---

## Issue 4: X Next to Numbers in Sessions Screen

### Root Cause Analysis
**Location**: `app/src/components/training/ExerciseCard.tsx`

**Problem**: Line 340-349 shows weight and reps with "×" between them. The "×" is correct (it means "times"), but user says it's wrong because "x already presents itself next to the weight."

**Fix Strategy**: Remove the "×" symbol between weight and reps. Just show: "60kg 8" instead of "60kg × 8"

**Proposed Fix**: Line 343-345, remove the "×" Text component.

---

## Issue 5: Previous Weight/Reps Not Showing Under Sets

### Root Cause Analysis
**Location**: `app/src/components/training/ExerciseCard.tsx` and `app/src/components/training/TrainingSessionView.tsx`

**Problem**: 
1. Line 352-356 in ExerciseCard shows previous set data, but only if `previousSet` exists
2. Line 1326-1352 in TrainingSessionView calculates `previousSetsData` but the mapping logic might not align sets correctly
3. User wants: "Previous: none" even when no previous data exists
4. User wants: Previous data aligned with actual set index (even if exercise structure changes)

**Current Logic Issues**:
- Line 1329-1349: Tries to map by setIndex, but falls back to last set if no match
- This means if last session had 3 sets and current has 4 sets, set 4 will show data from set 3
- User wants: Set 4 should show "Previous: none" if last session didn't have set 4

**Fix Strategy**:
1. Always show "Previous: ..." line (even if "none")
2. Only show previous data if exact setIndex match exists
3. Don't fall back to last set - show "none" instead
4. Move previous display to be directly under each set (not at top of exercise)

**Proposed Fix**:
- In ExerciseCard, line 352-356: Always render previous line, show "Previous: none" if no match
- In TrainingSessionView, line 1329-1349: Remove fallback logic, only match exact setIndex
- Move previous display from top (line 188-195) to inside each set row (line 352-356)

---

## Issue 6: Move Sessions Around (Future Feature)

**Analysis**: User wants ability to reschedule sessions within the week. This would require:
- UI to drag/drop or select new date
- Update program_day.date in database
- Revalidate that new date falls on correct weekday
- Update any dependent data

**Decision**: Defer for now, but note the requirement.

---

## Issue 7: History Session Modal Not Opening

### Root Cause Analysis
**Location**: `app/src/components/training/TrainingHistoryView.tsx`

**Problem**: Line 154-202 shows session cards, but there's no `onPress` handler to open a modal. The cards are just display-only.

**Fix Strategy**:
1. Add `onPress` to Card component (line 154)
2. Create/import a session detail modal component
3. Pass session data to modal
4. Show full session details (exercises, sets, summary)

**Proposed Fix**:
- Add state for selected session: `const [selectedSession, setSelectedSession] = useState<TrainingSessionRow | null>(null);`
- Add `onPress={() => setSelectedSession(session)}` to Card
- Create/use SessionDetailModal component
- Modal shows: exercises, sets, summary, PRs, etc.

---

## Testing Strategy

For each fix, I will:
1. Simulate the logic in code comments
2. Test edge cases (week boundaries, missing data, etc.)
3. Verify no regressions
4. Ensure TypeScript compiles
5. Run vitest tests

## Implementation Order

1. Issue 1 (Sunday scheduling) - Critical bug
2. Issue 3 (Multiple sessions) - UX blocker  
3. Issue 2 (Cancel session) - Feature addition
4. Issue 7 (History modal) - Feature addition
5. Issue 4 (X symbol) - UI polish
6. Issue 5 (Previous sets) - UI improvement
