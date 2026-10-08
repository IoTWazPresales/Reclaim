import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import {
  getExerciseIllustrationFile,
  getExerciseStillsBaseUrl,
  hasMappedExerciseIllustration,
  listIllustratedExerciseIds,
  resolveExerciseIllustrationUrl,
} from '@/lib/training/exerciseIllustration';
import exercisesData from '@/lib/training/catalog/exercises.v1.json';
import illustrationMap from '@/lib/training/catalog/exerciseIllustrations.v1.json';

const catalogIds = new Set((exercisesData as { id: string }[]).map((e) => e.id));

describe('exerciseIllustrations.v1 governance', () => {
  it('every illustration key exists in the exercise catalog', () => {
    const orphans = Object.keys(illustrationMap as object).filter((id) => !catalogIds.has(id));
    expect(orphans).toEqual([]);
  });

  it('maps money lifts including squat / deadlift / bench', () => {
    expect(hasMappedExerciseIllustration('squat')).toBe(true);
    expect(hasMappedExerciseIllustration('deadlift')).toBe(true);
    expect(hasMappedExerciseIllustration('barbell_bench_press')).toBe(true);
    expect(hasMappedExerciseIllustration('calf_raises')).toBe(true);
    expect(hasMappedExerciseIllustration('overhead_squat')).toBe(true);
    expect(hasMappedExerciseIllustration('leg_curls')).toBe(true);
    expect(hasMappedExerciseIllustration('farmer_walk')).toBe(false);
    expect(hasMappedExerciseIllustration('plank')).toBe(false);
    expect(listIllustratedExerciseIds().length).toBeGreaterThanOrEqual(20);
    for (const [id, file] of Object.entries(illustrationMap as Record<string, string>)) {
      expect(existsSync(path.join(process.cwd(), 'assets/exercise-stills', file)), id).toBe(true);
    }
  });
});

describe('resolveExerciseIllustrationUrl', () => {
  const prevCustom = process.env.EXPO_PUBLIC_EXERCISE_STILLS_BASE_URL;

  beforeEach(() => {
    delete process.env.EXPO_PUBLIC_EXERCISE_STILLS_BASE_URL;
  });

  afterEach(() => {
    if (prevCustom === undefined) delete process.env.EXPO_PUBLIC_EXERCISE_STILLS_BASE_URL;
    else process.env.EXPO_PUBLIC_EXERCISE_STILLS_BASE_URL = prevCustom;
    vi.restoreAllMocks();
  });

  it('returns null for unmapped exercises', () => {
    expect(resolveExerciseIllustrationUrl('not_a_real_exercise')).toBeNull();
  });

  it('uses EXPO_PUBLIC_EXERCISE_STILLS_BASE_URL when set', () => {
    process.env.EXPO_PUBLIC_EXERCISE_STILLS_BASE_URL = 'https://cdn.example.com/stills/';
    expect(getExerciseStillsBaseUrl()).toBe('https://cdn.example.com/stills');
    expect(resolveExerciseIllustrationUrl('squat')).toBe(
      'https://cdn.example.com/stills/squat.webp',
    );
    expect(getExerciseIllustrationFile('squat')).toBe('squat.webp');
  });

  it('the how-to component loads a mapped still and keeps the stick-figure fallback', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'src/components/training/ExerciseIllustration.tsx'),
      'utf8',
    );
    expect(source).toContain('bundledExerciseStill');
    expect(source).toContain('resolveExerciseIllustrationUrl');
    expect(source).toContain('<Image');
    expect(source).toContain('HumanFormDiagram');
    expect(source).toContain('onError');
  });
});
