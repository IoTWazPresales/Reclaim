/**
 * Read-only probe: prints the operator fixture's week through the product path
 * (buildFourWeekPlan -> programmeWeekProposal). Runs only when
 * RECLAIM_PROBE_OUT names an output file; RECLAIM_PROBE_VERSION optionally
 * compiles a frozen policy version for comparison. Never part of product code.
 */
import { writeFileSync } from 'fs';
import { describe, expect, it } from 'vitest';
import { programmeWeekProposal } from '../programmeWeekProposal';
import { formatWeeklyMuscleSetLine } from '../weeklyVolumeSummary';
import type { AllocatedSlot } from '../weeklyProgrammeTypes';
import type { Exercise, SessionPlan } from '../types';
import { OPERATOR_EQUIPMENT, operatorPlan, type OperatorVariant } from './fixtures/operatorProfile';

const OUT = process.env.RECLAIM_PROBE_OUT;
const VERSION = process.env.RECLAIM_PROBE_VERSION;
const DAY_NAMES = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function role(slot: AllocatedSlot | undefined): string {
  if (!slot) return '?';
  if (slot.requirementId === 'core') return 'core';
  if (slot.exposure === 'strength') return 'S';
  if (slot.exposure === 'hypertrophy') return 'H';
  if (slot.priority === 'accessory' || slot.priority === 'primary') return 'acc';
  return 'iso';
}

function printWeek(title: string, days: number, variant: OperatorVariant): string {
  const plan = operatorPlan(days, variant, VERSION ? { policyVersion: VERSION } : undefined);
  const proposals = programmeWeekProposal(plan, 1, plan.programme!.input);
  const week = plan.weeks[0];
  const lines = [`## ${title} — policy ${week.compilation?.policyVersion} strategy ${week.compilation?.strategyId} status ${week.compilation?.status}`];
  const owners: Record<string, number> = {};
  const sessions: SessionPlan[] = [];
  for (const [key, session] of [...proposals].sort(([a], [b]) => a - b)) {
    sessions.push(session);
    const slots = week.days[key].allocation?.slots ?? [];
    const totalSets = session.exercises.reduce((n, item) => n + item.plannedSets.length, 0);
    lines.push(`### ${DAY_NAMES[key]} ${week.days[key].label} — ${totalSets} sets, about ${session.estimatedDurationMinutes} min (budget ${session.constraints.timeBudgetMinutes}); programme ${session.programmeValidation?.status}; R05 ${session.weeklyValidation?.status}`);
    for (const item of session.exercises) {
      const slot = slots.find((entry) => entry.exerciseId === item.exerciseId);
      if (slot) owners[slot.owner] = (owners[slot.owner] ?? 0) + item.plannedSets.length;
      const set = item.plannedSets[0];
      const perSide = (item.exercise as Exercise & { repsPerSide?: boolean }).repsPerSide ? '/side' : '';
      lines.push(`${item.orderIndex + 1}. ${item.exercise.name} [${item.exerciseId}] ${item.plannedSets.length}x${set.targetReps}${perSide} rest ${set.restSeconds}s load ${set.suggestedWeight} kg warm-ups ${item.warmupSets?.length ?? 0} role ${role(slot)} slot ${slot?.requirementId ?? '-'}@${slot?.slotId ?? '-'}`);
    }
    const issues = [...(session.programmeValidation?.issues ?? [])].filter((issue) => issue.severity === 'error' || issue.code !== 'load_requires_confirmation');
    for (const issue of issues) lines.push(`   issue ${issue.severity} ${issue.code}: ${issue.message}`);
  }
  const weekly = sessions[0]?.weeklyValidation;
  lines.push(`Weekly owner sets: ${Object.entries(owners).sort(([a], [b]) => a.localeCompare(b)).map(([owner, sets]) => `${owner} ${sets}`).join(', ')}`);
  lines.push(`Region line: ${formatWeeklyMuscleSetLine(sessions) ?? '-'}`);
  lines.push(`R05: ${weekly?.status}; errors ${weekly?.issues.filter((issue) => issue.severity === 'error').map((issue) => `${issue.code}@${issue.dayKey ?? ''}`).join(', ') || 'none'}; warnings ${weekly?.issues.filter((issue) => issue.severity === 'warning').length ?? 0}`);
  for (const issue of week.compilation?.issues ?? []) lines.push(`   compile ${issue.severity} ${issue.code}: ${issue.message}`);
  return lines.join('\n');
}

describe('operator weekly probe', () => {
  it.skipIf(!OUT)('prints the probe weeks', () => {
    const text = [
      printWeek('5-day (Mon-Fri) Auto', 5, {}),
      printWeek('5-day (Mon-Fri) Auto + leg_curl_machine', 5, { equipment: [...OPERATOR_EQUIPMENT, 'leg_curl_machine'] }),
      printWeek('2-day (Mon, Thu) Full body', 2, { splitPreference: 'full_body' }),
      printWeek('2-day (Mon, Thu) Auto', 2, {}),
      printWeek('2-day (Mon, Thu) Upper/Lower', 2, { splitPreference: 'upper_lower' }),
      printWeek('3-day Auto', 3, {}),
      printWeek('4-day Auto', 4, {}),
    ].join('\n\n');
    writeFileSync(OUT!, `${text}\n`);
    expect(text.length).toBeGreaterThan(0);
  });
});
