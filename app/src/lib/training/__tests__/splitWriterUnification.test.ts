import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { buildFourWeekPlan } from '../programPlanner';
import { defaultRoutineTemplates, isTrainingRoutineTemplateId } from '../../routines';

/** `app/src` — this file lives in `lib/training/__tests__`. */
const SRC_ROOT = join(__dirname, '../../..');

const FORBIDDEN_SPLIT_WRITER_SYMBOLS = [
  ['generateWeekly', 'TrainingPlan'],
  ['determineWeekly', 'Split'],
  ['getScheduled', 'TemplateForToday'],
  ['getTrainingRoutine', 'TemplateId'],
  ['findNextAvailable', 'Slot'],
].map((parts) => parts.join(''));

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

describe('one training split writer', () => {
  it('buildFourWeekPlan is exported and produces a weekly split shape', () => {
    const plan = buildFourWeekPlan(
      {
        id: 'p',
        user_id: 'u',
        goals: { build_muscle: 0.9, build_strength: 0.1, lose_fat: 0, get_fitter: 0 },
        days_per_week: 3,
        preferred_time_window: {},
        equipment_access: ['dumbbells', 'floor'],
        constraints: {},
        created_at: '',
        updated_at: '',
      },
      [1, 3, 5],
    );
    expect(plan.weeks).toHaveLength(4);
    expect(Object.keys(plan.weeks[0].days).sort()).toEqual(['1', '3', '5']);
    expect(plan.weeks[0].days[1]?.template).toBeTruthy();
  });

  it('no product source still contains the weekly scheduler path', () => {
    expect(existsSync(join(SRC_ROOT, 'lib/training/scheduler.ts'))).toBe(false);

    const files = walkSourceFiles(SRC_ROOT);
    expect(files.some((p) => p.endsWith(`${join('lib', 'training', 'programPlanner.ts')}`))).toBe(true);

    const planner = readFileSync(join(SRC_ROOT, 'lib/training/programPlanner.ts'), 'utf8');
    expect(planner).toContain('export function buildFourWeekPlan');

    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      for (const symbol of FORBIDDEN_SPLIT_WRITER_SYMBOLS) {
        expect(text, `${file} still contains ${symbol}`).not.toContain(symbol);
      }
      expect(text, `${file} still imports training/scheduler`).not.toContain('lib/training/scheduler');
    }
  });

  it('habit routine defaults no longer include training_* templates', () => {
    expect(defaultRoutineTemplates.filter((t) => isTrainingRoutineTemplateId(t.id))).toEqual([]);
  });
});
