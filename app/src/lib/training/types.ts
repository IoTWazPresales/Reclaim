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

export interface Exercise {
  id: string;
  name: string;
  aliases: string[];
  intents: MovementIntent[];
  equipment: string[];
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
  metric: 'weight' | 'reps' | 'volume';
  value: number;
  previousValue?: number;
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
