import { describe, it, expect } from 'vitest';
import { buildFourWeekPlan } from '../programPlanner';
import { determineWeeklySplit } from '../scheduler';
import type { TrainingGoal } from '../types';
import type { TrainingProfileRow } from '../../api';

const GOALS: TrainingGoal[] = ['build_muscle', 'build_strength', 'lose_fat', 'get_fitter'];

/** Setup-screen default: Mon / Wed / Fri in JS weekday numbers (0=Sun). */
const FIXED_JS_WEEKDAYS = [1, 3, 5];
/** UI weekdays produced by buildFourWeekPlan (1=Mon … 7=Sun). */
const EXPECTED_UI_WEEKDAYS = [1, 3, 5];

function goalsWithPrimary(primary: TrainingGoal, secondary?: TrainingGoal): Record<TrainingGoal, number> {
  const goals: Record<TrainingGoal, number> = {
    build_muscle: 0,
    build_strength: 0,
    lose_fat: 0,
    get_fitter: 0,
  };
  goals[primary] = 0.9;
  if (secondary) goals[secondary] = 0.1;
  else {
    const fallback = GOALS.find((g) => g !== primary);
    if (fallback) goals[fallback] = 0.1;
  }
  return goals;
}

function mockProfile(goals: Record<TrainingGoal, number>, daysPerWeek: number): TrainingProfileRow {
  return {
    id: 'p',
    user_id: 'u',
    goals,
    days_per_week: daysPerWeek,
    preferred_time_window: {},
    equipment_access: ['dumbbells', 'floor'],
    constraints: {},
    created_at: '',
    updated_at: '',
  };
}

function weekDayFingerprint(plan: ReturnType<typeof buildFourWeekPlan>): string[] {
  const week0 = plan.weeks[0].days;
  return Object.keys(week0)
    .map(Number)
    .sort((a, b) => a - b)
    .map((weekday) => `${weekday}:${week0[weekday].template}:${week0[weekday].label}`);
}

describe('buildFourWeekPlan goal-setter sweep', () => {
  it('weekday count equals uiWeekdays.length for every primary goal at fixed Mon/Wed/Fri', () => {
    for (const primary of GOALS) {
      const plan = buildFourWeekPlan(mockProfile(goalsWithPrimary(primary), 3), FIXED_JS_WEEKDAYS);
      expect(plan.selectedWeekdays, `${primary} selectedWeekdays`).toEqual(EXPECTED_UI_WEEKDAYS);
      for (const week of plan.weeks) {
        const keys = Object.keys(week.days).map(Number).sort((a, b) => a - b);
        expect(keys, `${primary} week ${week.weekIndex} keys`).toEqual(EXPECTED_UI_WEEKDAYS);
        expect(keys.length, `${primary} week ${week.weekIndex} count`).toBe(FIXED_JS_WEEKDAYS.length);
      }
    }
  });

  it('secondaryGoal is unused: same primary + different secondary yields identical day templates and labels', () => {
    for (const primary of GOALS) {
      const secondaries = GOALS.filter((g) => g !== primary);
      const baseline = weekDayFingerprint(
        buildFourWeekPlan(mockProfile(goalsWithPrimary(primary, secondaries[0]), 3), FIXED_JS_WEEKDAYS),
      );
      for (const secondary of secondaries.slice(1)) {
        const next = weekDayFingerprint(
          buildFourWeekPlan(mockProfile(goalsWithPrimary(primary, secondary), 3), FIXED_JS_WEEKDAYS),
        );
        expect(next, `${primary} vs secondary ${secondary}`).toEqual(baseline);
      }
    }
  });
});

describe('determineWeeklySplit 3-day goal-setter sweep', () => {
  function splitShape(goals: Record<string, number>) {
    return determineWeeklySplit(3, goals);
  }

  it('records the exact 3-day split shape for every dominant goal', () => {
    const observed = Object.fromEntries(
      GOALS.map((goal) => [
        goal,
        splitShape({
          build_muscle: 0,
          build_strength: 0,
          lose_fat: 0,
          get_fitter: 0,
          [goal]: 1,
        }),
      ]),
    );

    expect(observed.build_strength).toEqual([{ template: 'full_body', days: [1, 3, 5] }]);
    expect(observed.lose_fat).toEqual([
      { template: 'upper', days: [1, 5] },
      { template: 'lower', days: [3] },
    ]);
    expect(observed.get_fitter).toEqual([
      { template: 'upper', days: [1, 5] },
      { template: 'lower', days: [3] },
    ]);
    expect(observed.build_muscle).toEqual([
      { template: 'push', days: [1] },
      { template: 'pull', days: [3] },
      { template: 'legs', days: [5] },
    ]);
  });

  it('empty goals fall through to build_muscle PPL (scheduler default)', () => {
    expect(splitShape({})).toEqual([
      { template: 'push', days: [1] },
      { template: 'pull', days: [3] },
      { template: 'legs', days: [5] },
    ]);
  });

  it('equal weights keep Object.entries insertion order: build_muscle wins → PPL', () => {
    expect(
      splitShape({
        build_muscle: 0.25,
        build_strength: 0.25,
        lose_fat: 0.25,
        get_fitter: 0.25,
      }),
    ).toEqual([
      { template: 'push', days: [1] },
      { template: 'pull', days: [3] },
      { template: 'legs', days: [5] },
    ]);
  });
});
