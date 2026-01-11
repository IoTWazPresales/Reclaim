// Training module types

export type MovementIntent =
  | 'horizontal_press'
  | 'vertical_press'
  | 'horizontal_pull'
  | 'vertical_pull'
  | 'knee_dominant'
  | 'hip_hinge'
  | 'elbow_extension'
  | 'elbow_flexion'
  | 'trunk_stability'
  | 'carry'
  | 'conditioning';

export type TrainingGoal = 'build_muscle' | 'build_strength' | 'lose_fat' | 'get_fitter';

export type SessionTemplate = 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full_body' | 'conditioning';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export type ExercisePriority = 'primary' | 'accessory' | 'isolation';

export type ProgressionType = 'double' | 'linear';

export type SessionMode = 'timed' | 'manual';

// Equipment classification for preference scoring
export type EquipmentClass = 'machine' | 'free_weight' | 'bodyweight' | 'other';

export interface Exercise {
  id: string;
  name: string;
  aliases: string[];
  intents: MovementIntent[];
  // Legacy field: treated as ANY-of by default (user needs at least one)
  equipment: string[];
  // New field: ALL equipment in this array must be available (e.g., barbell + bench for bench press)
  equipmentAll?: string[];
  // New field: at least ONE of these must be available (explicit ANY-of)
  equipmentAny?: string[];
  musclesPrimary: string[];
  musclesSecondary: string[];
  difficulty: ExperienceLevel;
  contraindications: string[];
  substitutionTags: string[];
  unilateral: boolean;
  notes?: string;
}

export interface GoalWeights {
  build_muscle?: number;
  build_strength?: number;
  lose_fat?: number;
  get_fitter?: number;
}

export interface TrainingConstraints {
  availableEquipment: string[];
  injuries: string[];
  forbiddenMovements: MovementIntent[];
  timeBudgetMinutes: number;
  // Priority intents - these get processed first and receive a scoring bonus
  priorityIntents?: MovementIntent[];
  preferences?: {
    hatesExercises?: string[];
    prefersMachines?: boolean;
    prefersFreeWeights?: boolean;
  };
}

export interface UserState {
  experienceLevel: ExperienceLevel;
  lastSessionPerformance?: Record<string, ExercisePerformance>;
  estimated1RM?: Record<string, number>;
  fatigueProxy?: number; // 0-1, higher = more fatigued
}

export interface ExercisePerformance {
  exerciseId: string;
  sets: SetLog[];
  date: string;
}

export interface SetLog {
  setIndex: number;
  weight: number;
  reps: number;
  rpe?: number;
  completedAt: string;
}

export interface PlannedSet {
  setIndex: number;
  targetReps: number;
  suggestedWeight: number;
  restSeconds: number;
}

export interface PlannedExercise {
  exerciseId: string;
  exercise: Exercise;
  orderIndex: number;
  priority: ExercisePriority;
  intents: MovementIntent[];
  plannedSets: PlannedSet[];
  decisionTrace: DecisionTrace;
}

export interface DecisionTrace {
  intent: MovementIntent[];
  goalBias: GoalWeights;
  constraintsApplied: string[];
  selectionReason: string;
  rankedAlternatives: string[];
  // Top 3 alternatives with reason summary
  alternativesSummary?: Array<{ name: string; reason: string }>;
  confidence: number;
  progressionReason?: string; // Why weight changed from last time
  whyNotTopAlt?: string; // One line: why the best alternative wasn't chosen
}

export interface SessionPlan {
  id: string;
  template: SessionTemplate;
  goals: GoalWeights;
  constraints: TrainingConstraints;
  userState: UserState;
  exercises: PlannedExercise[];
  estimatedDurationMinutes: number;
  createdAt: string;
  sessionLabel?: string; // Optional: label from program day (e.g., "Upper Strength")
}

export interface SessionState {
  sessionId: string;
  plan: SessionPlan;
  startedAt: string;
  currentExerciseIndex: number;
  completedExercises: string[];
  skippedExercises: string[];
  loggedSets: Record<string, SetLog[]>;
  elapsedTimeSeconds: number;
  mode: SessionMode;
}

export interface ExerciseScore {
  exerciseId: string;
  score: number;
  reasons: string[];
}

export interface SessionSummary {
  sessionId: string;
  durationMinutes: number;
  totalVolume: number; // estimated kg
  exercisesCompleted: number;
  exercisesSkipped: number;
  prs: PersonalRecord[];
  topInsights: string[];
  levelUpEvents?: Array<{
    exerciseId: string;
    exerciseName: string;
    metric: string;
    value: number;
    message: string;
  }>;
}

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  metric: 'weight' | 'reps' | 'e1rm' | 'volume';
  value: number;
  previousValue?: number;
  date: string;
}

export interface BuildSessionInput {
  template: SessionTemplate;
  goals: GoalWeights;
  constraints: TrainingConstraints;
  userState: UserState;
}

export interface ChooseExerciseInput {
  intent: MovementIntent;
  constraints: TrainingConstraints;
  userState: UserState;
  goalWeights: GoalWeights;
  alreadySelected: string[]; // exercise IDs already in session
}

export interface SuggestLoadingInput {
  exercise: Exercise;
  userState: UserState;
  goalWeights: GoalWeights;
  plannedReps: number;
  priority?: ExercisePriority; // Added: priority affects rep range used for progression
}

export interface AdaptSessionInput {
  sessionState: SessionState;
  reason: 'skip' | 'fatigue' | 'time_pressure' | 'equipment_unavailable';
}

// ===== PROGRAM LAYER TYPES =====

export interface ProgramInstance {
  id: string;
  user_id: string;
  start_date: string; // YYYY-MM-DD
  duration_weeks: number;
  selected_weekdays: number[]; // 1=Monday, 7=Sunday
  plan: FourWeekProgramPlan;
  profile_snapshot: TrainingProfileSnapshot;
  status: 'active' | 'completed' | 'abandoned';
  created_at: string;
  updated_at: string;
}

export interface ProgramDay {
  id: string;
  program_id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  week_index: number;
  day_index: number;
  label: string;
  intents: MovementIntent[];
  template_key: SessionTemplate;
  created_at: string;
}

export interface PostSessionCheckin {
  id: string;
  user_id: string;
  session_id: string;
  felt: 'energized' | 'neutral' | 'drained' | 'frustrated' | 'proud' | 'accomplished';
  note?: string;
  created_at: string;
}

export interface FourWeekProgramPlan {
  weeks: WeekPlan[];
  selectedWeekdays: number[];
  goals: Record<TrainingGoal, number>;
}

export interface WeekPlan {
  weekIndex: number;
  days: Record<number, ProgramDayPlan>;
}

export interface ProgramDayPlan {
  weekday: number;
  label: string;
  intents: MovementIntent[];
  template: SessionTemplate;
}

export interface TrainingProfileSnapshot {
  goals: Record<TrainingGoal, number>;
  equipment_access: string[];
  constraints?: {
    injuries?: string[];
    forbiddenMovements?: string[];
  };
  baselines?: Record<string, number>;
  days_per_week?: number;
  preferred_time_window?: string;
}

export interface LastPerformance {
  exercise_id: string;
  session_date: string;
  weight: number;
  reps: number;
  rpe?: number;
  session_type_label?: string;
}

// ===== SESSION RUNTIME TYPES (Phase 2) =====

/**
 * Adaptation reason for autoregulation adjustments
 */
export type AdaptationReason =
  | 'high_rpe'              // RPE >= 9
  | 'reps_drop'             // Significant rep decrease from previous set
  | 'strong_performance'    // Hit top of range with low RPE
  | 'fatigue_detected'      // Multiple fatigue signals
  | 'user_override'         // Manual user adjustment
  | 'first_set_baseline';   // No adjustment needed on first set

/**
 * Trace entry for each autoregulation decision
 */
export interface AdaptationTrace {
  timestamp: string;
  exerciseId: string;
  setIndex: number;
  reason: AdaptationReason;
  ruleId: string;
  input: {
    previousSetRpe?: number;
    previousSetReps?: number;
    previousSetWeight?: number;
    targetReps: number;
    suggestedWeight: number;
  };
  output: {
    adjustedWeight?: number;
    adjustedTargetReps?: number;
    message: string;
  };
  confidence: number; // 0-1, deterministic based on data quality
}

/**
 * Adjustment returned by autoregulation rules
 */
export interface AutoregulationAdjustment {
  weightMultiplier?: number;      // e.g., 0.95 = reduce 5%
  weightDelta?: number;           // absolute change in kg
  targetRepsDelta?: number;       // e.g., -2 = reduce by 2 reps
  skipRemainingSets?: boolean;    // severe fatigue
  message: string;
  ruleId: string;
  confidence: number;
}

/**
 * Runtime state for an active training session
 */
export interface SessionRuntimeState {
  sessionId: string;
  startedAt: string;
  mode: SessionMode;
  
  // Exercise tracking
  currentExerciseIndex: number;
  exerciseStates: Record<string, ExerciseRuntimeState>;
  
  // Set logging
  allLoggedSets: SetLogEntry[];
  
  // Adaptation history
  adaptationTrace: AdaptationTrace[];
  
  // Session metadata
  elapsedSeconds: number;
  lastTickAt: string;
  
  // Status
  status: 'active' | 'paused' | 'completing' | 'completed';
}

/**
 * Runtime state for a single exercise within a session
 */
export interface ExerciseRuntimeState {
  exerciseId: string;
  itemId: string; // training_session_items.id
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  
  // Sets
  plannedSets: PlannedSet[];
  completedSets: SetLogEntry[];
  currentSetIndex: number;
  
  // Autoregulation adjustments for remaining sets
  adjustments: Record<number, AutoregulationAdjustment>; // setIndex -> adjustment
  
  // Skip reason if skipped
  skipReason?: string;
}

/**
 * Set log entry (matches what we store in training_set_logs)
 */
export interface SetLogEntry {
  id: string;
  exerciseId: string;
  sessionItemId: string;
  setIndex: number;
  weight: number;
  reps: number;
  rpe?: number;
  completedAt: string;
  
  // Optional: what was originally planned vs what was adjusted
  originalPlan?: {
    targetReps: number;
    suggestedWeight: number;
  };
  adjustmentApplied?: AutoregulationAdjustment;
}

/**
 * Result of ending a session
 */
export interface SessionRuntimeResult {
  sessionId: string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  
  // Stats
  exercisesCompleted: number;
  exercisesSkipped: number;
  totalSets: number;
  totalVolume: number; // weight * reps across all sets
  
  // PRs detected
  prs: PersonalRecord[];
  
  // Full trace for debugging/transparency
  adaptationTrace: AdaptationTrace[];
  
  // Level-up events (for UI celebration)
  levelUpEvents: Array<{
    exerciseId: string;
    exerciseName: string;
    metric: string;
    value: number;
    message: string;
  }>;
}

// ===== ANALYTICS TYPES (Phase 3) =====

/**
 * A single data point for trend analysis
 */
export interface TrendPoint {
  date: string; // YYYY-MM-DD
  value: number;
  sessionId?: string;
  metadata?: Record<string, any>;
}

/**
 * E1RM trend for an exercise
 */
export interface E1RMTrend {
  exerciseId: string;
  exerciseName: string;
  points: TrendPoint[];
  currentE1RM?: number;
  peakE1RM?: number;
  peakDate?: string;
}

/**
 * Volume trend for an exercise or session
 */
export interface VolumeTrend {
  exerciseId?: string;
  exerciseName?: string;
  points: TrendPoint[];
  totalVolume: number;
  averageVolume: number;
}

/**
 * Session volume breakdown by intent
 */
export interface VolumeByIntent {
  intent: MovementIntent;
  volume: number;
  percentage: number;
  exerciseCount: number;
}

/**
 * Adherence statistics
 */
export interface AdherenceStats {
  totalProgramDays: number;
  completedSessions: number;
  skippedDays: number;
  adherencePercentage: number;
  currentStreak: number;
  longestStreak: number;
}

/**
 * Fatigue indicator from session data
 */
export interface FatigueIndicator {
  date: string;
  sessionId: string;
  fatigueScore: number; // 0-1
  indicators: {
    rpeAverage?: number;
    repDropPercentage?: number;
    exercisesSkipped?: number;
    sessionDurationVariance?: number;
  };
}
