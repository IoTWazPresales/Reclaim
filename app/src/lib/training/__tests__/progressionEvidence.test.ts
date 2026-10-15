import { describe, expect, it } from 'vitest';
import { countHoldStreak, decideDoubleProgression } from '../progression';
import { getExerciseById } from '../engine';

const bench = getExerciseById('barbell_bench_press')!;
const work = (reps: number, weight = 80) => ({ sets: [{ weight, reps, rpe: 7 }] });

describe('progression evidence qualification', () => {
  it('does not label increasing repetitions as stagnant sessions', () => {
    expect(countHoldStreak([work(8), work(7)], [5, 9])).toBe(0);
    expect(countHoldStreak([work(8), work(8)], [5, 9])).toBe(2);
  });

  it('does not combine different amounts of work or missing work into a hold streak', () => {
    expect(countHoldStreak([{ sets: [] }, work(7)], [5, 9])).toBe(0);
    expect(countHoldStreak([{ sets: [...work(7).sets, ...work(7).sets] }, work(7)], [5, 9])).toBe(1);
  });

  it('requires the known planned work and completed session before progression', () => {
    const args = { exercise: bench, lastSets: work(9).sets, repRange: [5, 9] as [number, number] };
    expect(decideDoubleProgression({ ...args, plannedSetCount: 3, sessionComplete: true })).toBeNull();
    expect(decideDoubleProgression({ ...args, plannedSetCount: 1, sessionComplete: false })).toBeNull();
    expect(decideDoubleProgression({ ...args, plannedSetCount: 1, sessionComplete: true })?.action).toBe('increase');
  });

  it('does not treat an uncalibrated external load as bodyweight', () => {
    expect(decideDoubleProgression({ exercise: bench, lastSets: work(12, 0).sets, repRange: [8, 12] })).toBeNull();
  });

  it('does not infer full working-load achievement from a heavier single set', () => {
    expect(decideDoubleProgression({ exercise: bench, lastSets: [...work(9, 80).sets, ...work(9, 60).sets], repRange: [5, 9] })).toBeNull();
  });
});
