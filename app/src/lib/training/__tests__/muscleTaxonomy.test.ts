import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { listExercises } from '../engine';
import {
  classifyMuscleTag,
  muscleVolumeBucket,
  VOLUME_BUCKET_ORDER,
} from '../muscleTaxonomy';
import { formatWeeklyMuscleSetLine } from '../weeklyVolumeSummary';
import type { SessionPlan } from '../types';

function planWithPrimaries(tags: string[], setCount: number): SessionPlan {
  return {
    exercises: [
      {
        exercise: { musclesPrimary: tags },
        plannedSets: Array.from({ length: setCount }, () => ({})),
      },
    ],
  } as SessionPlan;
}

describe('muscle taxonomy', () => {
  it('rejects a tag that is not in the closed set', () => {
    expect(classifyMuscleTag('biceps_femoris')).toEqual({ status: 'unknown' });
    expect(muscleVolumeBucket('biceps_femoris')).toBeNull();
    expect(formatWeeklyMuscleSetLine([planWithPrimaries(['biceps_femoris'], 4)])).toBeNull();
  });

  it('fails when the catalogue uses a tag outside the taxonomy', () => {
    const unknown: string[] = [];
    for (const exercise of listExercises()) {
      for (const tag of [...exercise.musclesPrimary, ...exercise.musclesSecondary]) {
        if (classifyMuscleTag(tag).status === 'unknown') {
          unknown.push(`${exercise.id}:${tag}`);
        }
      }
    }
    expect(unknown).toEqual([]);
  });

  it('buckets catalogue drift onto the six display labels', () => {
    expect(muscleVolumeBucket('core')).toBe('Core');
    expect(muscleVolumeBucket('rectus_abdominis')).toBe('Core');
    expect(muscleVolumeBucket('abs')).toBe('Core');
    expect(muscleVolumeBucket('rear_deltoids')).toBe('Shoulders');
    expect(muscleVolumeBucket('posterior_deltoids')).toBe('Shoulders');
    expect(muscleVolumeBucket('middle_traps')).toBe('Back');
    expect(muscleVolumeBucket('mid_traps')).toBe('Back');
    expect(muscleVolumeBucket('quads')).toBe('Legs');
    expect(muscleVolumeBucket('hip_flexors')).toBe('Legs');
    expect(muscleVolumeBucket('serratus_anterior')).toBe('Chest');
  });

  it('keeps conditioning and whole-session tags out of regional buckets', () => {
    expect(classifyMuscleTag('cardiovascular')).toEqual({
      status: 'non_regional',
      reason: 'conditioning',
    });
    expect(classifyMuscleTag('full_body')).toEqual({
      status: 'non_regional',
      reason: 'whole_session',
    });
    expect(formatWeeklyMuscleSetLine([planWithPrimaries(['cardiovascular', 'full_body'], 5)])).toBeNull();
  });

  it('sums each primary tag into its taxonomy bucket', () => {
    expect(formatWeeklyMuscleSetLine([planWithPrimaries(['core'], 4)])).toBe('Core 4');
    expect(formatWeeklyMuscleSetLine([planWithPrimaries(['pectorals', 'core'], 2)])).toBe(
      'Chest 2 · Core 2',
    );
    expect(VOLUME_BUCKET_ORDER).toEqual(['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core']);
  });

  it('reads buckets from muscleTaxonomy, not a private map', () => {
    const source = readFileSync(path.join(__dirname, '../weeklyVolumeSummary.ts'), 'utf8');
    expect(source).toContain("from './muscleTaxonomy'");
    expect(source).not.toContain('MUSCLE_TO_BUCKET');
  });
});
