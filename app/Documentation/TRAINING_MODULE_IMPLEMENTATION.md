# Training Module Implementation Summary

## Overview

A deterministic, explainable training module that generates intelligent workout sessions based on weighted goals, constraints, and user state. The system is fully explainable with decision traces for every exercise selection.

## Files Created/Modified

### Core Engine & Data
1. **`app/src/lib/training/catalog/exercises.v1.json`**
   - 150+ curated exercises with movement intents
   - Each exercise includes: intents, equipment, muscles, difficulty, contraindications

2. **`app/src/lib/training/rules/rules.v1.json`**
   - Rep ranges per goal bias
   - Sets per intent per session
   - Rest targets
   - Exercise priority rules
   - Volume caps
   - Progression rules

3. **`app/src/lib/training/types.ts`**
   - Complete TypeScript types for the training module
   - MovementIntent, TrainingGoal, SessionTemplate, etc.

4. **`app/src/lib/training/engine/index.ts`**
   - `buildSession()` - Creates complete session plan
   - `chooseExercise()` - Scores and ranks exercises by intent
   - `suggestLoading()` - Suggests weight based on 1RM or last session
   - `adaptSession()` - Adapts session during workout

### Database
5. **`app/Documentation/SUPABASE_TRAINING_TABLES.sql`**
   - `training_sessions` table
   - `training_session_items` table
   - `training_set_logs` table
   - Full RLS policies and indexes

### API Functions
6. **`app/src/lib/api.ts`** (modified)
   - `createTrainingSession()`
   - `updateTrainingSession()`
   - `listTrainingSessions()`
   - `getTrainingSession()`
   - `createTrainingSessionItems()`
   - `updateTrainingSessionItem()`
   - `logTrainingSet()`
   - `getTrainingSetLogs()`
   - `getLastExercisePerformance()`

### UI Components
7. **`app/src/screens/TrainingScreen.tsx`**
   - Main training screen with Today/History tabs
   - Session generation and management

8. **`app/src/components/training/TrainingSessionView.tsx`**
   - Active workout interface
   - Timer, progress tracking, set logging

9. **`app/src/components/training/TrainingHistoryView.tsx`**
   - History of past sessions

10. **`app/src/components/training/ExerciseCard.tsx`**
    - Individual exercise card with:
      - Done/Edit/Skip/Replace/Why buttons
      - Set logging interface
      - Decision trace display

### Navigation
11. **`app/src/navigation/types.ts`** (modified)
    - Added `Training: undefined` to DrawerParamList

12. **`app/src/routing/AppNavigator.tsx`** (modified)
    - Added Training to drawer menu
    - Added Training screen route

13. **`app/src/routing/RootNavigator.tsx`** (modified)
    - Added Training to deep linking config

## Key Features

### 1. Intent-Driven Engine
- Exercises mapped to movement intents (horizontal_press, vertical_pull, etc.)
- Exercise selection based on intent matching, not names

### 2. Deterministic & Explainable
- Every exercise selection includes a `DecisionTrace`:
  - Intent matched
  - Goal bias applied
  - Constraints applied
  - Selection reason
  - Ranked alternatives
  - Confidence score

### 3. Live Session Adaptation
- Adapts during workout based on:
  - Elapsed time vs planned time
  - Completed volume
  - Skipped exercises
  - Equipment availability changes

### 4. User Inputs
- **Weighted goals** (2-3 selected, sum to 1.0):
  - build_muscle
  - build_strength
  - lose_fat
  - get_fitter

- **Constraints**:
  - Available equipment
  - Injuries
  - Forbidden movements
  - Time budget
  - Preferences

- **User state**:
  - Experience level
  - Last session performance
  - Estimated 1RM (optional)
  - Fatigue proxy

- **Session templates**:
  - Push / Pull / Legs
  - Upper / Lower
  - Full body
  - Conditioning

## Verification Steps

1. **Generate session**:
   - Navigate to Training screen
   - Click "Start new session"
   - Verify session plan is generated with exercises

2. **Log sets**:
   - Click "Done" on a set
   - Verify set is logged
   - Edit set if needed

3. **Skip/replace exercise**:
   - Click "Skip" on an exercise
   - Verify exercise is marked skipped
   - Click "Replace" (placeholder for future)

4. **View decision trace**:
   - Click "Why" on an exercise
   - Verify decision trace is displayed with:
     - Selection reason
     - Goal bias
     - Constraints applied
     - Alternatives considered

5. **Save session**:
   - Complete all exercises or click "Finish session"
   - Verify session is saved with summary

6. **View history**:
   - Switch to History tab
   - Verify past sessions are displayed
   - Click on a session to view details

## Database Setup

Run the SQL migration in Supabase:
```sql
-- Run: app/Documentation/SUPABASE_TRAINING_TABLES.sql
```

This creates:
- `training_sessions` table
- `training_session_items` table
- `training_set_logs` table
- All RLS policies and indexes

## Next Steps (Future Enhancements)

1. **Replace functionality**: Implement ranked alternatives when replacing exercises
2. **User preferences**: Store equipment preferences, hated exercises, etc.
3. **Progression tracking**: Automatic 1RM estimation from logged sets
4. **Wearable integration**: Pull HR data from Health Connect
5. **Session templates**: User-customizable templates
6. **Exercise history**: Detailed progression charts per exercise
7. **Scientific insights**: Generate insights from training data

## Notes

- All decisions are deterministic and explainable
- No LLMs or black-box AI
- Follows existing Reclaim UI patterns
- Safe logging (no circular references)
- Full RLS security on all tables
