/**
 * A3 routine-volume measurement harness.
 * Mirrors TrainingScreen.weekSessionVolume: pass 1 builds each program day
 * without weeklyMuscleSessionCounts; pass 2 rebuilds with those counts.
 * Writes docs/training/ROUTINE_VOLUME_BASELINE.md (measurement, not hard bands).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildSessionFromProgramDay, chooseExercise, listExercises, suggestLoading } from '../engine';
import { buildFourWeekPlan } from '../programPlanner';
import {
  computeWeeklyMuscleSessionCounts,
  formatWeeklyMuscleSetLine,
} from '../weeklyVolumeSummary';
import { TRAINING_PERF_SEED_EXERCISE_IDS } from '../trainingProgramPerformanceSeedIds';
import { getPrimarySlotRoleTier, PrimarySlotRoleTier } from '../exerciseSessionRole';
import { decideDoubleProgression } from '../progression';
import type {
  ExperienceLevel,
  MovementIntent,
  SessionPlan,
  TrainingGoal,
  TrainingProfileSnapshot,
} from '../types';
import type { TrainingProfileRow } from '../../api';

const REPO_ROOT = path.resolve(__dirname, '../../../../../');
const REPORT_PATH = path.join(REPO_ROOT, 'docs/training/ROUTINE_VOLUME_BASELINE.md');

/** Copied from weeklyVolumeSummary — measure what the UI actually buckets. */
const MUSCLE_TO_BUCKET: Record<string, string> = {
  pectorals: 'Chest',
  anterior_deltoids: 'Shoulders',
  lateral_deltoids: 'Shoulders',
  posterior_deltoids: 'Shoulders',
  triceps: 'Arms',
  biceps: 'Arms',
  forearms: 'Arms',
  brachialis: 'Arms',
  lats: 'Back',
  rhomboids: 'Back',
  upper_traps: 'Back',
  erector_spinae: 'Back',
  mid_traps: 'Back',
  quadriceps: 'Legs',
  hamstrings: 'Legs',
  glutes: 'Legs',
  calves: 'Legs',
  adductors: 'Legs',
  abs: 'Core',
  obliques: 'Core',
  transverse_abdominis: 'Core',
};

const COMPOUND_INTENTS: MovementIntent[] = [
  'horizontal_press',
  'vertical_press',
  'horizontal_pull',
  'vertical_pull',
  'knee_dominant',
  'hip_hinge',
];

const FULL_GYM = [
  'barbell',
  'rack',
  'bench',
  'dumbbells',
  'leg_press_machine',
  'cable_machine',
  'pull_up_bar',
  'floor',
  'smith_machine',
  't_bar_row_machine',
  'hack_squat_machine',
  'ez_bar',
  'dip_station',
  'kettlebells',
];

const HOME_DUMBBELLS = ['dumbbells', 'floor', 'bench'];

const GOAL_PRESETS: Record<string, Record<TrainingGoal, number>> = {
  muscle: { build_muscle: 1, build_strength: 0, lose_fat: 0, get_fitter: 0 },
  strength: { build_muscle: 0, build_strength: 1, lose_fat: 0, get_fitter: 0 },
  fat: { build_muscle: 0, build_strength: 0, lose_fat: 1, get_fitter: 0 },
  fitter: { build_muscle: 0, build_strength: 0, lose_fat: 0, get_fitter: 1 },
  blend: { build_muscle: 0.4, build_strength: 0.3, lose_fat: 0.2, get_fitter: 0.1 },
};

const DAYS = [2, 3, 4, 5, 6] as const;
const FREQS = ['once', 'twice'] as const;

type Scenario = {
  id: string;
  goal: string;
  days: number;
  equipment: 'full gym' | 'home dumbbells';
  frequency: 'once' | 'twice';
  equipmentIds: string[];
  goals: Record<TrainingGoal, number>;
};

function jsWeekdays(n: number): number[] {
  return [1, 2, 3, 4, 5, 6, 0].slice(0, n);
}

function mockProfile(s: Scenario): TrainingProfileRow {
  return {
    id: 'p',
    user_id: 'u',
    goals: s.goals,
    days_per_week: s.days,
    preferred_time_window: {},
    equipment_access: s.equipmentIds,
    constraints: { preferences: { muscle_frequency_preference: s.frequency } },
    created_at: '',
    updated_at: '',
  };
}

function snapshot(
  s: Scenario,
  extra?: Partial<TrainingProfileSnapshot>,
): TrainingProfileSnapshot {
  return {
    goals: s.goals,
    equipment_access: s.equipmentIds,
    constraints: { preferences: { muscle_frequency_preference: s.frequency } },
    baselines: {},
    ...extra,
  };
}

function fingerprint(plan: SessionPlan): string {
  return plan.exercises
    .map(
      (ex) =>
        `${ex.exerciseId}:${ex.priority}:${ex.intents.join('+')}:${ex.plannedSets
          .map((st) => `${st.targetReps}@${st.suggestedWeight}x${st.restSeconds}`)
          .join(',')}`,
    )
    .join('|');
}

function twoPassWeek(
  days: Array<{ label: string; intents: MovementIntent[]; template: string }>,
  snap: TrainingProfileSnapshot,
): { pass1: SessionPlan[]; pass2: SessionPlan[]; weeklySetsLine: string | null } {
  const pass1 = days.map((d) =>
    buildSessionFromProgramDay(
      { label: d.label, intents: d.intents, template_key: d.template as never },
      snap,
    ),
  );
  const counts = computeWeeklyMuscleSessionCounts(pass1);
  const pass2 = days.map((d) =>
    buildSessionFromProgramDay(
      { label: d.label, intents: d.intents, template_key: d.template as never },
      snap,
      { weeklyMuscleSessionCounts: counts },
    ),
  );
  return { pass1, pass2, weeklySetsLine: formatWeeklyMuscleSetLine(pass2) };
}

function fractionalAndDirect(plans: SessionPlan[]) {
  const fractional: Record<string, number> = {};
  const direct: Record<string, number> = {};
  const patternSets: Record<string, number> = {};
  let totalSets = 0;
  let seedSets = 0;
  for (const plan of plans) {
    for (const ex of plan.exercises) {
      const n = ex.plannedSets.length;
      totalSets += n;
      if (TRAINING_PERF_SEED_EXERCISE_IDS.includes(ex.exerciseId)) seedSets += n;
      for (const intent of ex.intents) {
        patternSets[intent] = (patternSets[intent] ?? 0) + n;
      }
      const catalog = ex.exercise;
      for (const m of catalog.musclesPrimary ?? []) {
        fractional[m] = (fractional[m] ?? 0) + n * 1;
        direct[m] = (direct[m] ?? 0) + n;
      }
      for (const m of catalog.musclesSecondary ?? []) {
        fractional[m] = (fractional[m] ?? 0) + n * 0.5;
      }
    }
  }
  return { fractional, direct, patternSets, totalSets, seedSets };
}

function muscleFrequency(plans: SessionPlan[]): Record<string, number> {
  return computeWeeklyMuscleSessionCounts(plans);
}

function isolationInCompoundSlots(plans: SessionPlan[]): string[] {
  const hits: string[] = [];
  for (const plan of plans) {
    for (const ex of plan.exercises) {
      const intent = ex.intents[0];
      if (!intent || !COMPOUND_INTENTS.includes(intent)) continue;
      if (ex.decisionTrace.selectionPhase !== 'required') continue;
      const tier = getPrimarySlotRoleTier(ex.exercise, intent);
      if (tier >= PrimarySlotRoleTier.AccessoryStyle) {
        hits.push(`${plan.sessionLabel ?? plan.template}:${ex.exerciseId}@${intent}:tier${tier}`);
      }
    }
  }
  return hits;
}

function unbucketedTags(): string[] {
  const seen = new Set<string>();
  for (const ex of listExercises()) {
    for (const m of [...(ex.musclesPrimary ?? []), ...(ex.musclesSecondary ?? [])]) {
      if (!(m in MUSCLE_TO_BUCKET)) seen.add(m);
    }
  }
  return [...seen].sort();
}

function scenarios(): Scenario[] {
  const out: Scenario[] = [];
  for (const [goal, goals] of Object.entries(GOAL_PRESETS)) {
    for (const days of DAYS) {
      for (const equipment of ['full gym', 'home dumbbells'] as const) {
        for (const frequency of FREQS) {
          out.push({
            id: `${goal}|${days}d|${equipment}|${frequency}`,
            goal,
            days,
            equipment,
            frequency,
            equipmentIds: equipment === 'full gym' ? FULL_GYM : HOME_DUMBBELLS,
            goals,
          });
        }
      }
    }
  }
  return out;
}

function fmtMap(m: Record<string, number>, digits = 1): string {
  return Object.entries(m)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([k, v]) => `${k} ${v.toFixed(digits)}`)
    .join(' · ');
}

describe('routine volume measurement harness', () => {
  it('measures the two-pass TrainingScreen path across goals × days × equipment × frequency', () => {
    const all = scenarios();
    expect(all).toHaveLength(5 * 5 * 2 * 2);

    const lines: string[] = [];
    const push = (s = '') => lines.push(s);

    push('# Routine volume baseline');
    push('');
    push('**Generated:** 2026-09-19 by `routineVolumeMeasurement.test.ts`');
    push('**Path:** same two-pass `buildSessionFromProgramDay` as `TrainingScreen.weekSessionVolume` (pass 1 → muscle session counts → pass 2).');
    push('**Evidence class:** executable measurement (vitest). Hard volume bands are Stage C F6, not this file.');
    push('');

    const unbucketed = unbucketedTags();
    push('## Catalogue tags `weeklyVolumeSummary` cannot bucket');
    push('');
    push(unbucketed.length ? unbucketed.map((t) => `- \`${t}\``).join('\n') : '_none_');
    push('');

    const seed = TRAINING_PERF_SEED_EXERCISE_IDS;
    push('## History production fetch share');
    push('');
    push(`Seed id count: **${seed.length}** (\`${seed.join('`, `')}\`).`);
    push('Share below is sets whose exercise id is in that seed (the only ids `loadTrainingPerformanceSeed` fetches).');
    push('');

    type Row = {
      id: string;
      week1eqWeek4: boolean;
      frac: Record<string, number>;
      freq: Record<string, number>;
      patterns: Record<string, number>;
      weeklyLine: string | null;
      lineHasCore: boolean;
      isoHits: string[];
      totalSets: number;
      seedSets: number;
      durationMax: number;
      templates: string;
    };
    const rows: Row[] = [];

    for (const s of all) {
      const four = buildFourWeekPlan(mockProfile(s), jsWeekdays(s.days));
      const week1Days = Object.values(four.weeks[0].days).map((d) => ({
        label: d.label,
        intents: d.intents,
        template: d.template,
      }));
      const week4Days = Object.values(four.weeks[3].days).map((d) => ({
        label: d.label,
        intents: d.intents,
        template: d.template,
      }));
      const snap = snapshot(s);
      const w1 = twoPassWeek(week1Days, snap);
      const w4 = twoPassWeek(week4Days, snap);
      const fp1 = w1.pass2.map(fingerprint).join('||');
      const fp4 = w4.pass2.map(fingerprint).join('||');
      const meas = fractionalAndDirect(w1.pass2);
      rows.push({
        id: s.id,
        week1eqWeek4: fp1 === fp4,
        frac: meas.fractional,
        freq: muscleFrequency(w1.pass2),
        patterns: meas.patternSets,
        weeklyLine: w1.weeklySetsLine,
        lineHasCore: (w1.weeklySetsLine ?? '').includes('Core'),
        isoHits: isolationInCompoundSlots(w1.pass2),
        totalSets: meas.totalSets,
        seedSets: meas.seedSets,
        durationMax: Math.max(...w1.pass2.map((p) => p.estimatedDurationMinutes)),
        templates: week1Days.map((d) => `${d.label}[${d.template}]`).join(' / '),
      });
    }

    const identicalWeeks = rows.filter((r) => r.week1eqWeek4).length;
    const coreDrop = rows.filter((r) => !r.lineHasCore).length;
    const isoAny = rows.filter((r) => r.isoHits.length > 0).length;
    const overDuration = rows.filter((r) => r.durationMax > 60).length;
    const seedShare =
      rows.reduce((a, r) => a + r.seedSets, 0) / Math.max(1, rows.reduce((a, r) => a + r.totalSets, 0));

    push('## Clone-claim measurement (reconfirm, not trust)');
    push('');
    push(`| Claim | Result |`);
    push(`|---|---|`);
    push(`| Weeks 1–4 fingerprint identical (empty history) | **${identicalWeeks}/${rows.length}** scenarios identical |`);
    push(`| History seed id count | **${seed.length}** (expected 18) |`);
    push(`| Share of weekly sets whose ids are in the seed | **${(seedShare * 100).toFixed(1)}%** |`);
    push(`| UI weekly-sets line omits Core | **${coreDrop}/${rows.length}** scenarios have no \`Core\` token |`);
    push(`| Isolation/accessory tier in a required compound slot | **${isoAny}/${rows.length}** scenarios had ≥1 hit |`);
    push(`| Estimated duration > 60 min time budget | **${overDuration}/${rows.length}** scenarios |`);
    push('');

    push('## Per-scenario week-1 pass-2 volume');
    push('');
    for (const r of rows) {
      push(`### \`${r.id}\``);
      push('');
      push(`- templates: ${r.templates}`);
      push(`- week1==week4: ${r.week1eqWeek4}`);
      push(`- UI line: ${r.weeklyLine ?? '_null_'}`);
      push(`- fractional sets/muscle (1 primary / 0.5 secondary): ${fmtMap(r.frac) || '_none_'}`);
      push(`- frequency (sessions containing primary muscle): ${fmtMap(r.freq, 0) || '_none_'}`);
      push(`- sets/movement-pattern: ${fmtMap(r.patterns, 0) || '_none_'}`);
      push(`- sets in seed / total: ${r.seedSets}/${r.totalSets}`);
      push(`- max estimatedDurationMinutes: ${r.durationMax}`);
      if (r.isoHits.length) push(`- isolation-in-compound: ${r.isoHits.join('; ')}`);
      push('');
    }

    const bench = listExercises().find((e) => e.id === 'barbell_bench_press');
    expect(bench).toBeTruthy();
    const emptyLoads: Record<ExperienceLevel, number> = {
      beginner: 0,
      intermediate: 0,
      advanced: 0,
    };
    for (const level of Object.keys(emptyLoads) as ExperienceLevel[]) {
      emptyLoads[level] = suggestLoading({
        exercise: bench!,
        userState: { experienceLevel: level, estimated1RM: {} },
        goalWeights: GOAL_PRESETS.muscle,
        plannedReps: 8,
        priority: 'primary',
      });
    }
    const with1rm = suggestLoading({
      exercise: bench!,
      userState: { experienceLevel: 'intermediate', estimated1RM: { barbell_bench_press: 100 } },
      goalWeights: GOAL_PRESETS.muscle,
      plannedReps: 8,
      priority: 'primary',
    });
    const expectedEpley = Math.round(100 / (1 + 8 / 30) / 2.5) * 2.5;

    push('## Empty-history loads per experience (barbell_bench_press @ 8 reps)');
    push('');
    push(`- beginner: **${emptyLoads.beginner} kg**`);
    push(`- intermediate: **${emptyLoads.intermediate} kg**`);
    push(`- advanced: **${emptyLoads.advanced} kg**`);
    push(`- intermediate + explicit 1RM 100 kg via Epley: **${with1rm} kg** (formula rounded ${expectedEpley})`);
    push('');

    const lastSets = [
      { setIndex: 1, weight: 60, reps: 8, completedAt: '2026-01-01' },
      { setIndex: 2, weight: 60, reps: 8, completedAt: '2026-01-01' },
      { setIndex: 3, weight: 60, reps: 8, completedAt: '2026-01-01' },
    ];
    const dp = decideDoubleProgression({
      exercise: bench!,
      lastSets,
      repRange: [6, 8],
    });
    const muscle3d = all.find((s) => s.goal === 'muscle' && s.days === 3 && s.equipment === 'full gym' && s.frequency === 'once')!;
    const fourMuscle = buildFourWeekPlan(mockProfile(muscle3d), jsWeekdays(3));
    const emptyWeek = twoPassWeek(
      Object.values(fourMuscle.weeks[0].days).map((d) => ({
        label: d.label,
        intents: d.intents,
        template: d.template,
      })),
      snapshot(muscle3d),
    );
    const histWeek = twoPassWeek(
      Object.values(fourMuscle.weeks[0].days).map((d) => ({
        label: d.label,
        intents: d.intents,
        template: d.template,
      })),
      snapshot(muscle3d, {
        lastSessionPerformance: {
          barbell_bench_press: { exerciseId: 'barbell_bench_press', sets: lastSets, date: '2026-01-01' },
        },
        recentSessionPerformance: {
          barbell_bench_press: [
            { exerciseId: 'barbell_bench_press', sets: lastSets, date: '2026-01-01' },
          ],
        },
      }),
    );
    const emptyBench = emptyWeek.pass2
      .flatMap((p) => p.exercises)
      .find((e) => e.exerciseId === 'barbell_bench_press');
    const histBench = histWeek.pass2
      .flatMap((p) => p.exercises)
      .find((e) => e.exerciseId === 'barbell_bench_press');

    push('## Reactive double progression (synthetic history)');
    push('');
    push(`- decideDoubleProgression on 3×8 @ 60 kg range 6–8: action **${dp?.action ?? 'null'}**, next **${dp?.nextWeight ?? 'n/a'}** (${dp?.reason ?? ''})`);
    push(
      `- muscle|3d|full gym|once barbell_bench_press empty vs history: ${emptyBench?.plannedSets[0]?.suggestedWeight ?? 'not selected'} → ${histBench?.plannedSets[0]?.suggestedWeight ?? 'not selected'}`,
    );
    push('');

    const rich = {
      availableEquipment: FULL_GYM,
      injuries: [],
      forbiddenMovements: [] as MovementIntent[],
      timeBudgetMinutes: 60,
    };
    const user = { experienceLevel: 'intermediate' as const };
    const muscleRank = chooseExercise({
      intent: 'horizontal_press',
      constraints: rich,
      userState: user,
      goalWeights: GOAL_PRESETS.muscle,
      alreadySelected: [],
    }).map((e) => e.id);
    const strengthRank = chooseExercise({
      intent: 'horizontal_press',
      constraints: rich,
      userState: user,
      goalWeights: GOAL_PRESETS.strength,
      alreadySelected: [],
    }).map((e) => e.id);

    push('## scoreExercise vs goals');
    push('');
    push(`- chooseExercise(horizontal_press) muscle vs strength ranking identical: **${muscleRank.join() === strengthRank.join()}**`);
    push(`- muscle top5: ${muscleRank.slice(0, 5).join(', ')}`);
    push(`- strength top5: ${strengthRank.slice(0, 5).join(', ')}`);
    push('');

    mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    writeFileSync(REPORT_PATH, lines.join('\n'), 'utf8');

    expect(identicalWeeks).toBe(rows.length);
    expect(seed).toHaveLength(18);
    expect(unbucketed.length).toBeGreaterThan(0);
    expect(muscleRank).toEqual(strengthRank);
    expect(emptyLoads.beginner).toBeLessThan(emptyLoads.advanced);
    expect(with1rm).toBe(expectedEpley);
  });
});
