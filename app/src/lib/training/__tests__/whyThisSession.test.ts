import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { scheduledRunOnStoredPlan, whyThisSessionLine } from '../whyThisSession';

const dashboard = readFileSync(resolve(__dirname, '../../../screens/Dashboard.tsx'), 'utf8');
const source = readFileSync(resolve(__dirname, '../whyThisSession.ts'), 'utf8');

describe('why this session', () => {
  it('names the stored week and day, and a hybrid run when the plan has one', () => {
    expect(
      whyThisSessionLine({
        hasProgram: true,
        inProgress: false,
        completedToday: false,
        templateKey: 'push',
        label: 'Push (Chest Focus)',
        weekIndex: 2,
      }),
    ).toBe("Week 2 of 4. Today's plan is Push (Chest Focus).");

    expect(
      whyThisSessionLine({
        hasProgram: true,
        inProgress: false,
        completedToday: false,
        templateKey: 'push',
        label: 'Push (Chest Focus)',
        weekIndex: 2,
        scheduledRun: true,
      }),
    ).toBe("Week 2 of 4. Today's plan is Push (Chest Focus). A run is also on this day.");

    expect(
      whyThisSessionLine({
        hasProgram: true,
        inProgress: false,
        completedToday: false,
        templateKey: 'run',
        label: 'Run',
        weekIndex: 1,
      }),
    ).toBe("Week 1 of 4. Today's plan is a run.");
  });

  it('uses session state before the plan, and rest when today has no day', () => {
    expect(
      whyThisSessionLine({
        hasProgram: true,
        inProgress: true,
        completedToday: false,
        templateKey: 'pull',
        label: 'Pull',
        weekIndex: 3,
      }),
    ).toBe('This session is already started.');

    expect(
      whyThisSessionLine({
        hasProgram: true,
        inProgress: false,
        completedToday: true,
        templateKey: 'legs',
        weekIndex: 4,
      }),
    ).toBe("Today's session is finished.");

    expect(
      whyThisSessionLine({
        hasProgram: true,
        inProgress: false,
        completedToday: false,
      }),
    ).toBe("No session is on today's plan.");

    expect(
      whyThisSessionLine({
        hasProgram: false,
        inProgress: false,
        completedToday: false,
      }),
    ).toBeNull();
  });

  it('omits a week number the four-week plan does not store', () => {
    expect(
      whyThisSessionLine({
        hasProgram: true,
        inProgress: false,
        completedToday: false,
        templateKey: 'upper',
        label: 'Upper',
        weekIndex: 5,
      }),
    ).toBe("Today's plan is Upper.");
  });

  it('reads the hybrid flag from the stored plan week and weekday', () => {
    const numericKeys = {
      weeks: [{ weekIndex: 1, days: { 1: { scheduledRun: true }, 3: { scheduledRun: false } } }],
    };
    const stringKeys = {
      weeks: [{ weekIndex: 2, days: { '1': { scheduledRun: true } } }],
    };
    expect(scheduledRunOnStoredPlan(numericKeys, 1, 1)).toBe(true);
    expect(scheduledRunOnStoredPlan(numericKeys, 1, 3)).toBe(false);
    expect(scheduledRunOnStoredPlan(stringKeys, 2, 1)).toBe(true);
    expect(scheduledRunOnStoredPlan(stringKeys, 3, 1)).toBe(false);
    expect(scheduledRunOnStoredPlan(null, 1, 1)).toBe(false);
  });

  it('is the Home sentence and does not claim a cause', () => {
    expect(dashboard).toContain('whyThisSessionLine');
    expect(dashboard).not.toContain('Ready when you are.');
    expect(source).not.toMatch(/\b(causes|caused|causing)\b/);
  });
});
