import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildProgramDaySession,
  materializePlannedSessionItems,
  plannedItemsForSession,
} from '../buildProgramDaySession';
import { buildSessionFromProgramDay } from '../engine';
import type { MovementIntent, SessionPlan, TrainingProfileSnapshot } from '../types';

const SRC_ROOT = join(__dirname, '../../..');

const ALLOWED_DIRECT_CALLS = [
  join('lib', 'training', 'buildProgramDaySession.ts'),
  join('lib', 'training', 'engine', 'index.ts'),
].map((p) => p.replace(/\\/g, '/'));

function walkSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '__tests__') continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walkSourceFiles(full, acc);
      continue;
    }
    if (/\.(ts|tsx)$/.test(name) && !name.endsWith('.d.ts')) acc.push(full);
  }
  return acc;
}

const snapshot: TrainingProfileSnapshot = {
  goals: { build_muscle: 1, build_strength: 0, lose_fat: 0, get_fitter: 0 },
  equipment_access: ['dumbbells', 'bench', 'floor'],
  constraints: {},
  baselines: {},
};

const programDay = {
  label: 'Upper',
  intents: ['horizontal_press'] as MovementIntent[],
  template_key: 'upper' as const,
};

function heavierCopy(plan: SessionPlan): SessionPlan {
  return {
    ...plan,
    exercises: plan.exercises.map((ex, index) =>
      index === 0
        ? {
            ...ex,
            plannedSets: ex.plannedSets.map((set) => ({
              ...set,
              suggestedWeight: set.suggestedWeight + 15,
              targetReps: set.targetReps + 2,
            })),
          }
        : ex,
    ),
  };
}

describe('buildProgramDaySession', () => {
  it('delegates to the engine builder without changing the planned sets', () => {
    const viaWrapper = buildProgramDaySession(programDay, snapshot);
    const viaEngine = buildSessionFromProgramDay(programDay, snapshot);
    expect(viaWrapper.exercises.map((ex) => ex.exerciseId)).toEqual(
      viaEngine.exercises.map((ex) => ex.exerciseId),
    );
    expect(viaWrapper.exercises.map((ex) => ex.plannedSets)).toEqual(
      viaEngine.exercises.map((ex) => ex.plannedSets),
    );
  });

  it('forbids product source from calling the engine builder directly', () => {
    const offenders: string[] = [];
    for (const file of walkSourceFiles(SRC_ROOT)) {
      const relative = file.slice(SRC_ROOT.length + 1).replace(/\\/g, '/');
      if (ALLOWED_DIRECT_CALLS.some((allowed) => relative.endsWith(allowed))) continue;
      const text = readFileSync(file, 'utf8');
      if (text.includes('buildSessionFromProgramDay')) offenders.push(relative);
    }
    expect(offenders).toEqual([]);
  });

  it('keeps started and guided planned sets when a later plan differs', () => {
    const original = buildProgramDaySession(programDay, snapshot);
    const frozen = materializePlannedSessionItems('training_started', original);
    const firstSet = frozen[0]?.planned.sets[0];
    expect(firstSet).toBeTruthy();

    original.exercises[0].plannedSets[0].suggestedWeight = 999;
    expect(frozen[0].planned.sets[0].suggestedWeight).not.toBe(999);

    const rebuilt = heavierCopy(buildProgramDaySession(programDay, snapshot));
    const started = plannedItemsForSession({
      startedAt: '2026-09-29T18:00:00.000Z',
      notificationMode: 'normal',
      frozenItems: frozen,
      rebuiltPlan: rebuilt,
      sessionId: 'training_started',
    });
    const guided = plannedItemsForSession({
      startedAt: '2026-09-29T18:00:00.000Z',
      notificationMode: 'guided',
      frozenItems: frozen,
      rebuiltPlan: rebuilt,
      sessionId: 'training_guided',
    });

    const guidedItemsOnly = plannedItemsForSession({
      startedAt: null,
      notificationMode: 'guided',
      frozenItems: frozen,
      rebuiltPlan: rebuilt,
      sessionId: 'training_guided_items',
    });

    expect(started).toBe(frozen);
    expect(guided).toBe(frozen);
    expect(guidedItemsOnly).toBe(frozen);
    expect(started[0].planned.sets[0].suggestedWeight).toBe(firstSet?.suggestedWeight);
    expect(started[0].planned.sets[0].targetReps).toBe(firstSet?.targetReps);
    expect(rebuilt.exercises[0].plannedSets[0].suggestedWeight).toBe(
      (firstSet?.suggestedWeight ?? 0) + 15,
    );
  });

  it('does not backfill a started session that has no stored items', () => {
    const rebuilt = buildProgramDaySession(programDay, snapshot);
    const kept = plannedItemsForSession({
      startedAt: '2026-09-29T18:00:00.000Z',
      notificationMode: 'guided',
      frozenItems: [],
      rebuiltPlan: rebuilt,
      sessionId: 'training_empty',
    });
    expect(kept).toEqual([]);
    expect(rebuilt.exercises.length).toBeGreaterThan(0);
  });

  it('materializes a new plan only when the session has not started', () => {
    const original = buildProgramDaySession(programDay, snapshot);
    const frozen = materializePlannedSessionItems('training_old', original);
    const rebuilt = heavierCopy(original);
    const fresh = plannedItemsForSession({
      startedAt: null,
      notificationMode: 'normal',
      frozenItems: null,
      rebuiltPlan: rebuilt,
      sessionId: 'training_new',
    });
    expect(fresh[0].planned.sets[0].suggestedWeight).toBe(
      rebuilt.exercises[0].plannedSets[0].suggestedWeight,
    );
    expect(fresh[0].planned.sets[0].suggestedWeight).not.toBe(frozen[0].planned.sets[0].suggestedWeight);
    expect(fresh[0].id).toBe('training_new_item_0');
  });
});
