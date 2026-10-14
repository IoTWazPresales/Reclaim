import { resolveExperienceLevel } from './experienceLevel';
import { estimate1RM } from './progression';
import { mapBaselineKeyToExerciseId, mapUiConstraintIdsToEngineInjuries, normalizeEquipmentIds } from './setupMappings';
import { resolveRunningDistanceKm, resolveRunningGoal, resolveTrainingMode } from './trainingMode';
import type { ExperienceLevel, TrainingGoal, TrainingProfileSnapshot } from './types';
import type { TrainingProfileRow } from '../api';

/** The same draft is used for preview and confirmation; no persistence or clock reads. */
export interface TrainingSetupDraft {
  goals: Record<TrainingGoal, number>;
  selectedWeekdays: number[];
  equipment: string[];
  constraints: string[];
  baselines: Record<string, number>;
  baselineReps?: Record<string, number>;
  muscleFrequency?: 'once' | 'twice' | 'auto';
  experienceLevel?: ExperienceLevel;
  includeSkillWork?: boolean;
  trainingMode?: 'strength' | 'running' | 'hybrid';
  runningGoal?: '5k' | '10k' | 'custom';
  runningDistanceKm?: number | string;
}

export function normalizeTrainingSetupDraft(draft: TrainingSetupDraft): TrainingProfileSnapshot {
  const total = Object.values(draft.goals).reduce((sum, value) => sum + Math.max(0, value), 0);
  const goals = Object.fromEntries(Object.entries(draft.goals).map(([key, value]) =>
    [key, total > 0 ? Math.max(0, value) / total : 0],
  )) as Record<TrainingGoal, number>;
  const baselines: Record<string, number> = {};
  const baselineInputs: Record<string, { weightKg: number; reps: number }> = {};
  for (const [key, weight] of Object.entries(draft.baselines)) {
    const id = mapBaselineKeyToExerciseId(key);
    if (id && Number.isFinite(weight) && weight > 0) {
      const enteredReps = draft.baselineReps?.[key];
      const reps = enteredReps && Number.isFinite(enteredReps) && enteredReps > 0 ? enteredReps : 5;
      baselineInputs[key] = { weightKg: weight, reps };
      baselines[id] = estimate1RM(weight, reps);
    }
  }
  let frequency = draft.muscleFrequency ?? 'auto';
  if ((frequency === 'once' && draft.selectedWeekdays.length < 3) || (frequency === 'twice' && draft.selectedWeekdays.length < 2)) frequency = 'auto';
  const trainingMode = resolveTrainingMode(draft.trainingMode);
  const runningGoal = trainingMode === 'strength' ? undefined : resolveRunningGoal(draft.runningGoal);
  const runningDistanceKm = runningGoal === 'custom' ? resolveRunningDistanceKm(draft.runningDistanceKm) : undefined;
  return {
    goals,
    equipment_access: normalizeEquipmentIds(draft.equipment),
    constraints: {
      injuries: mapUiConstraintIdsToEngineInjuries(draft.constraints),
      forbiddenMovements: draft.constraints.includes('no_overhead') ? ['vertical_press'] : [],
      preferences: { muscle_frequency_preference: frequency, includeSkillWork: draft.includeSkillWork === true },
    },
    baselines,
    baselineInputs,
    experienceLevel: resolveExperienceLevel(draft.experienceLevel),
    trainingMode,
    ...(runningGoal ? { runningGoal } : {}),
    ...(runningDistanceKm !== undefined ? { runningDistanceKm } : {}),
  };
}

/** Shared serialization boundary for preview and confirmed programme creation. */
export function prepareTrainingSetup(draft: TrainingSetupDraft) {
  const snapshot = normalizeTrainingSetupDraft(draft);
  const selectedWeekdaysJs = draft.selectedWeekdays.map(day => day === 7 ? 0 : day).sort((a, b) => a - b);
  const profile = {
    ...snapshot,
    days_per_week: selectedWeekdaysJs.length,
    constraints: {
      ...snapshot.constraints,
      experienceLevel: snapshot.experienceLevel,
      trainingMode: snapshot.trainingMode,
      ...(snapshot.runningGoal ? { runningGoal: snapshot.runningGoal } : {}),
      ...(snapshot.runningDistanceKm !== undefined ? { runningDistanceKm: snapshot.runningDistanceKm } : {}),
      baselineInputs: snapshot.baselineInputs,
    },
  } as TrainingProfileRow;
  const profileWrite = {
    goals: profile.goals,
    days_per_week: profile.days_per_week,
    equipment_access: profile.equipment_access,
    constraints: profile.constraints,
    baselines: profile.baselines,
  };
  const programSnapshot = { ...snapshot, selected_weekdays_js: selectedWeekdaysJs };
  return { snapshot, profile, profileWrite, programSnapshot, selectedWeekdaysJs };
}
