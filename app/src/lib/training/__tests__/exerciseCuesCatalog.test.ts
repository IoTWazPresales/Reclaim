/**
 * Catalog governance: every exerciseCues.v1.json key must match a catalog exercise id.
 * Prevents the orphan-key drift that left ~20% of cues unreachable.
 */
import { describe, expect, it } from 'vitest';
import exercisesData from '@/lib/training/catalog/exercises.v1.json';
import exerciseCuesData from '@/lib/training/catalog/exerciseCues.v1.json';
import { getExerciseById } from '@/lib/training/engine';
import { resolveExerciseCues } from '@/lib/training/movementPatternCues';

const catalogIds = new Set((exercisesData as { id: string }[]).map((e) => e.id));
const cueMap = exerciseCuesData as Record<string, string[]>;

describe('exerciseCues.v1 catalog governance', () => {
  it('every cue key exists on an exercise in exercises.v1.json', () => {
    const orphans = Object.keys(cueMap).filter((id) => !catalogIds.has(id));
    expect(orphans, `orphan cue keys: ${orphans.join(', ')}`).toEqual([]);
  });

  it('every cue entry has 1–4 non-empty lines', () => {
    for (const [id, lines] of Object.entries(cueMap)) {
      expect(Array.isArray(lines), id).toBe(true);
      expect(lines.length, id).toBeGreaterThanOrEqual(1);
      expect(lines.length, id).toBeLessThanOrEqual(4);
      for (const line of lines) {
        expect(typeof line, id).toBe('string');
        expect(line.trim().length, id).toBeGreaterThan(0);
      }
    }
  });

  it('money lifts resolve exercise-specific cues (not only pattern fallback)', () => {
    for (const id of ['squat', 'deadlift', 'barbell_bench_press', 'barbell_row', 'pull_ups']) {
      const ex = getExerciseById(id);
      expect(ex, id).toBeTruthy();
      expect(ex!.cues?.length, id).toBeGreaterThan(0);
      const resolved = resolveExerciseCues(ex!.cues, ex!.intents, ex!.name, ex!.id);
      expect(resolved[0]).toBe(ex!.cues![0]);
    }
  });
});
