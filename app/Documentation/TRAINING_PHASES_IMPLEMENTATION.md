# Training Module - Phases A-D Implementation

This document summarizes the implementation of Phases A-D for the Training module enhancements.

## Overview

All four phases have been implemented:
- **Phase A**: Progression Engine v1
- **Phase B**: Training Setup Wizard v1
- **Phase C**: Scheduler Integration v1
- **Phase D**: History/Analytics v1

## Files Created/Modified

### Phase A - Progression Engine

**New Files:**
1. `app/src/lib/training/progression.ts` - e1RM estimation, double progression, autoregulation, PR detection

**Modified Files:**
1. `app/src/lib/training/engine/index.ts` - Updated `suggestLoading` to use progression, enhanced `adaptSession` with fatigue detection, added progression reasons to decision traces
2. `app/src/lib/training/types.ts` - Extended `DecisionTrace` and `SessionSummary` types
3. `app/src/lib/api.ts` - Added `getLastExercisePerformances` and `getExerciseBestPerformance` for batch queries

### Phase B - Training Setup Wizard

**New Files:**
1. `app/src/screens/training/TrainingSetupScreen.tsx` - Multi-step wizard for collecting user preferences
2. `app/Documentation/SUPABASE_TRAINING_PROFILES.sql` - Database schema for training profiles

**Modified Files:**
1. `app/src/lib/api.ts` - Added `getTrainingProfile`, `upsertTrainingProfile`, `deleteTrainingProfile`
2. `app/src/screens/TrainingScreen.tsx` - Added profile check, setup CTA, and profile-based session generation

### Phase C - Scheduler Integration

**New Files:**
1. `app/src/lib/training/scheduler.ts` - Weekly plan generation, routine suggestion creation, scheduled template lookup

**Modified Files:**
1. `app/src/screens/TrainingScreen.tsx` - Uses scheduled template for today when generating sessions
2. `app/src/screens/training/TrainingSetupScreen.tsx` - Generates weekly plan after profile save

### Phase D - History/Analytics

**New Files:**
1. `app/src/components/training/ExerciseDetailsModal.tsx` - Modal showing exercise performance history and trends

**Modified Files:**
1. `app/src/components/training/TrainingHistoryView.tsx` - Added weekly summary view, enhanced session cards with PRs
2. `app/src/components/training/TrainingSessionView.tsx` - Added PR detection on session completion, level up events

## Database Migrations

Run these SQL scripts in Supabase:

1. `app/Documentation/SUPABASE_TRAINING_TABLES.sql` (already exists from MVP)
2. `app/Documentation/SUPABASE_TRAINING_PROFILES.sql` (new for Phase B)

## Key Features

### Phase A Features
- ✅ e1RM estimation (Epley + Brzycki formulas)
- ✅ Double progression with guardrails (weight steps, rep ranges)
- ✅ Autoregulation (fatigue detection, time compression)
- ✅ PR detection (weight, reps, e1RM, volume)
- ✅ Level Up events in session summary
- ✅ Enhanced decision traces with progression reasons

### Phase B Features
- ✅ Multi-step setup wizard (goals, schedule, equipment, constraints, baselines)
- ✅ Training profile storage in Supabase
- ✅ Profile-based session generation
- ✅ Auto-normalization of goal weights

### Phase C Features
- ✅ Weekly training plan generation based on profile
- ✅ Deterministic split selection (2/3/4/5+ days)
- ✅ Routine suggestions created in calendar
- ✅ Scheduled template preference for "Today's Session"

### Phase D Features
- ✅ Exercise details modal with last performance and bests
- ✅ Weekly summary (sessions, sets, volume, PRs)
- ✅ Enhanced history view with PR highlights
- ✅ Batch performance queries for efficiency

## Verification Checklist

### Phase A
- [ ] Generate session and see weight suggestions based on last performance
- [ ] Log sets and verify progression logic (increase weight if hitting top of rep range)
- [ ] Complete session and see PR detection in summary
- [ ] View "Why" button and see progression reason in decision trace

### Phase B
- [ ] Open Training screen without profile → see setup CTA
- [ ] Complete setup wizard (all steps)
- [ ] Verify profile saved in Supabase
- [ ] Generate session and verify it uses profile goals/equipment

### Phase C
- [ ] After profile save, check calendar for training routine suggestions
- [ ] Generate session on scheduled day → should use scheduled template
- [ ] Verify routine suggestions appear in Dashboard "Today" card

### Phase D
- [ ] View history → switch to "Weekly" tab → see summary
- [ ] Complete session with PRs → see PR count in history
- [ ] Tap exercise in history → see details modal with performance data
- [ ] Verify batch queries don't cause N+1 issues

## Notes

- All progression logic is deterministic and explainable
- PR detection happens on session completion (async, doesn't block UI)
- Weekly plan regenerates on profile save (can be improved to handle updates)
- Exercise details modal currently shows last session only (can be extended to show trend chart)
- Scheduler integration uses existing routine system (no reinvention)

## Next Steps (Future Enhancements)

- Add e1RM trend chart in exercise details
- Add compliance tracking (scheduled vs completed sessions)
- Add exercise-level progression graphs
- Improve weekly plan regeneration on profile updates
- Add template customization in setup wizard
