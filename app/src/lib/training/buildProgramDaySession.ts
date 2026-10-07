/**
 * Product entry for building a session from a program day.
 * The engine function stays the implementation. A program day may name
 * week 1–4. That index is recorded on the plan. It does not scale sets,
 * load, or RIR. Set budgets, slot roles, and progression history are
 * otherwise unchanged here.
 */
import { buildSessionFromProgramDay } from './engine';
import type {
  DecisionTrace,
  ExercisePriority,
  MovementIntent,
  PlannedSet,
  SessionPlan,
  SessionTemplate,
  TrainingProfileSnapshot,
} from './types';

export type ProgramDayForSession = {
  label: string;
  intents: MovementIntent[];
  template_key: SessionTemplate;
  /** Planner week. Only 1–4 is recorded. Other values are ignored. */
  weekIndex?: number;
};

export type ProgramDaySessionOptions = {
  weeklyMuscleSessionCounts?: Record<string, number>;
  adaptiveTrainingEnabled?: boolean;
};

export function buildProgramDaySession(
  programDay: ProgramDayForSession,
  profileSnapshot: TrainingProfileSnapshot,
  options?: ProgramDaySessionOptions,
): SessionPlan {
  return buildSessionFromProgramDay(programDay, profileSnapshot, options);
}

export type PersistedPlannedItem = {
  id: string;
  exerciseId: string;
  orderIndex: number;
  planned: {
    sets: PlannedSet[];
    warmupSets?: Array<{ weight: number; reps: number }>;
    priority: ExercisePriority;
    intents: MovementIntent[];
    decisionTrace: DecisionTrace;
  };
};

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Snapshot the confirmed plan. Later generator output does not alias these sets. */
export function materializePlannedSessionItems(
  sessionId: string,
  plan: SessionPlan,
): PersistedPlannedItem[] {
  return plan.exercises.map((ex, idx) => ({
    id: `${sessionId}_item_${idx}`,
    exerciseId: ex.exerciseId,
    orderIndex: ex.orderIndex,
    planned: cloneJson({
      sets: ex.plannedSets,
      ...(ex.warmupSets && ex.warmupSets.length > 0 ? { warmupSets: ex.warmupSets } : {}),
      priority: ex.priority,
      intents: ex.intents,
      decisionTrace: ex.decisionTrace,
    }),
  }));
}

export type SessionPlanWriteInput = {
  startedAt: string | null;
  notificationMode: 'normal' | 'guided' | null;
  /** Items already stored for this session. Null means nothing has been written. */
  frozenItems: PersistedPlannedItem[] | null;
  rebuiltPlan: SessionPlan;
  sessionId: string;
};

/**
 * A session that has started, or a guided session that already has items,
 * keeps that planned snapshot. A new build uses the plan passed in.
 */
export function plannedItemsForSession(input: SessionPlanWriteInput): PersistedPlannedItem[] {
  const alreadyWritten = input.frozenItems != null;
  const keepSnapshot =
    input.startedAt != null || (input.notificationMode === 'guided' && alreadyWritten);
  if (keepSnapshot) {
    return input.frozenItems ?? [];
  }
  return materializePlannedSessionItems(input.sessionId, input.rebuiltPlan);
}
