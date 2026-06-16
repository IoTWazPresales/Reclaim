import { describe, expect, it } from 'vitest';

import type { TrainingSessionRow } from '@/lib/api';
import { buildTrainingInsightContext } from '@/lib/insights/trainingInsightContext';

function row(partial: Partial<TrainingSessionRow> & Pick<TrainingSessionRow, 'id' | 'user_id'>): TrainingSessionRow {
  return {
    id: partial.id,
    user_id: partial.user_id,
    started_at: partial.started_at ?? null,
    ended_at: partial.ended_at ?? null,
    mode: partial.mode ?? 'timed',
    goals: partial.goals ?? {},
    summary: partial.summary ?? null,
    decision_trace: partial.decision_trace ?? null,
    created_at: partial.created_at ?? new Date().toISOString(),
    current_exercise_index: partial.current_exercise_index ?? 0,
    phase: partial.phase ?? 'work',
    rest_started_at: partial.rest_started_at ?? null,
    rest_ends_at: partial.rest_ends_at ?? null,
  };
}

describe('buildTrainingInsightContext', () => {
  it('sets lastSessionEnergyKnown when last completed session has active kcal', () => {
    const tEnd = '2026-04-15T12:00:00.000Z';
    const tStart = '2026-04-15T11:00:00.000Z';
    const out = buildTrainingInsightContext([
      row({
        id: 's1',
        user_id: 'u1',
        started_at: tStart,
        ended_at: tEnd,
        summary: { activeCaloriesKcal: 120 },
      }),
    ]);
    expect(out.lastSessionEnergyKnown).toBe(true);
    expect(out.lastSessionActiveKcal).toBe(120);
  });

  it('sets lastSessionEnergyKnown false when last completed session has no kcal', () => {
    const out = buildTrainingInsightContext([
      row({
        id: 's1',
        user_id: 'u1',
        started_at: '2026-04-15T11:00:00.000Z',
        ended_at: '2026-04-15T12:00:00.000Z',
        summary: {},
      }),
    ]);
    expect(out.lastSessionEnergyKnown).toBe(false);
    expect(out.lastSessionActiveKcal).toBeUndefined();
  });

  it('sets lastSessionEnergyKnown false when there is no completed session', () => {
    const out = buildTrainingInsightContext([
      row({
        id: 's1',
        user_id: 'u1',
        started_at: '2026-04-15T11:00:00.000Z',
        ended_at: null,
        summary: { activeCaloriesKcal: 50 },
      }),
    ]);
    expect(out.lastSessionEnergyKnown).toBe(false);
  });
});
