import type { ExperienceLevel, TrainingProfileSnapshot } from './types';

const EXPERIENCE_LEVELS: readonly ExperienceLevel[] = ['beginner', 'intermediate', 'advanced'];

/** Missing or unknown experience is beginner. A stored level is kept. */
export function resolveExperienceLevel(value: unknown): ExperienceLevel {
  if (typeof value === 'string' && (EXPERIENCE_LEVELS as readonly string[]).includes(value)) {
    return value as ExperienceLevel;
  }
  return 'beginner';
}

export function snapshotWithExperienceLevel(
  snapshot: TrainingProfileSnapshot,
  value: unknown,
): TrainingProfileSnapshot {
  return {
    ...snapshot,
    experienceLevel: resolveExperienceLevel(value),
  };
}
