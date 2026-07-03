import { describe, it, expect } from 'vitest';
import {
  decideDoubleProgression,
  countHoldStreak,
  meetsIncreaseCriteria,
  summarizeSetsForHumans,
} from '@/lib/training/progression';
import type { Exercise } from '@/lib/training/types';

function exercise(overrides: Partial<Exercise>): Exercise {
  return {
    id: 'test_exercise',
    name: 'Test Exercise',
    intents: ['horizontal_press'],
    equipment: ['barbell'],
    musclesPrimary: ['chest'],
    musclesSecondary: [],
    difficulty: 'intermediate',
    contraindications: [],
    substitutionTags: [],
    unilateral: false,
    ...overrides,
  } as Exercise;
}

const bench = exercise({ id: 'bench_press', name: 'Bench Press' });
const squat = exercise({
  id: 'back_squat',
  name: 'Back Squat',
  intents: ['knee_dominant'],
});
const pushUp = exercise({
  id: 'push_up',
  name: 'Push-Up',
  equipment: [],
  intents: ['horizontal_press'],
});

const sets = (entries: Array<[number, number, number?]>) =>
  entries.map(([weight, reps, rpe]) => ({ weight, reps, rpe }));

describe('decideDoubleProgression', () => {
  it('all sets at top of range with RPE <= 8 → +2.5kg upper body', () => {
    const d = decideDoubleProgression({
      exercise: bench,
      lastSets: sets([[60, 8, 7], [60, 8, 7], [60, 8, 8]]),
      repRange: [6, 8],
    });
    expect(d?.action).toBe('increase');
    expect(d?.nextWeight).toBe(62.5);
    expect(d?.reason).toBe('+2.5kg — you hit 3×8 @ RPE 8 last time.');
  });

  it('all sets at top of range → +5kg lower body', () => {
    const d = decideDoubleProgression({
      exercise: squat,
      lastSets: sets([[100, 8, 7], [100, 8, 7], [100, 8, 7]]),
      repRange: [6, 8],
    });
    expect(d?.action).toBe('increase');
    expect(d?.nextWeight).toBe(105);
    expect(d?.reason).toContain('+5kg');
  });

  it('reps below range → hold with a rep goal', () => {
    const d = decideDoubleProgression({
      exercise: bench,
      lastSets: sets([[60, 8, 7], [60, 7, 8], [60, 6, 8]]),
      repRange: [6, 8],
    });
    expect(d?.action).toBe('hold');
    expect(d?.nextWeight).toBe(60);
    expect(d?.reason).toContain('Holding 60kg');
    expect(d?.reason).toContain('3×8');
  });

  it('RPE 9-10 → hold even at top of rep range', () => {
    const d = decideDoubleProgression({
      exercise: bench,
      lastSets: sets([[60, 8, 8], [60, 8, 9], [60, 8, 9]]),
      repRange: [6, 8],
    });
    expect(d?.action).toBe('hold');
    expect(d?.reason).toContain('RPE 9');
  });

  it('two consecutive holds → deload 10% rounded to step', () => {
    const d = decideDoubleProgression({
      exercise: squat,
      lastSets: sets([[100, 6, 9], [100, 6, 9], [100, 5, 9]]),
      repRange: [6, 8],
      holdStreak: 2,
    });
    expect(d?.action).toBe('deload');
    expect(d?.nextWeight).toBe(90);
    expect(d?.reason).toContain('−10%');
    expect(d?.reason).toContain('two sessions stuck');
  });

  it('bodyweight at 3×12 → suggest adding weight, never prescribe 0kg copy', () => {
    const d = decideDoubleProgression({
      exercise: pushUp,
      lastSets: sets([[0, 12, 7], [0, 12, 7], [0, 12, 8]]),
      repRange: [8, 12],
    });
    expect(d?.action).toBe('add_weight');
    expect(d?.nextWeight).toBe(0);
    expect(d?.reason).toContain('time to add weight');
    expect(d?.reason).not.toContain('0kg');
  });

  it('bodyweight below cap → progress by reps', () => {
    const d = decideDoubleProgression({
      exercise: pushUp,
      lastSets: sets([[0, 10, 7], [0, 10, 7], [0, 10, 7]]),
      repRange: [8, 10],
    });
    expect(d?.action).toBe('progress_reps');
    expect(d?.nextWeight).toBe(0);
    expect(d?.reason).toContain('+1 rep');
  });

  it('returns null with no history', () => {
    expect(
      decideDoubleProgression({ exercise: bench, lastSets: [], repRange: [6, 8] }),
    ).toBeNull();
  });
});

describe('countHoldStreak', () => {
  const failing = { sets: sets([[100, 6, 9], [100, 5, 9]]) };
  const passing = { sets: sets([[100, 8, 7], [100, 8, 7]]) };

  it('counts consecutive failed sessions at the same weight (newest first)', () => {
    expect(countHoldStreak([failing, failing, passing], [6, 8])).toBe(2);
  });

  it('breaks streak when a session met the increase criteria', () => {
    expect(countHoldStreak([passing, failing], [6, 8])).toBe(0);
  });

  it('breaks streak when weight moved up between sessions', () => {
    const heavier = { sets: sets([[105, 6, 9]]) };
    const lighter = { sets: sets([[100, 8, 7]]) };
    expect(countHoldStreak([heavier, lighter], [6, 8])).toBe(1);
  });
});

describe('helpers', () => {
  it('meetsIncreaseCriteria requires every set at top of range under the RPE cap', () => {
    expect(meetsIncreaseCriteria(sets([[60, 8], [60, 8]]), [6, 8])).toBe(true);
    expect(meetsIncreaseCriteria(sets([[60, 8], [60, 7]]), [6, 8])).toBe(false);
    expect(meetsIncreaseCriteria(sets([[60, 8, 9]]), [6, 8])).toBe(false);
  });

  it('summarizes mixed-rep sessions honestly', () => {
    expect(summarizeSetsForHumans(sets([[60, 8, 7], [60, 8, 7], [60, 7, 8]]))).toBe(
      '8/8/7 reps @ RPE 8',
    );
  });
});
