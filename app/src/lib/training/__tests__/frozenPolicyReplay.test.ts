/**
 * Frozen weekly policies (v2, v3, v4) must rebuild byte-identical after a newer
 * policy ships. Fixtures were captured from the code at 804a1b5 (before v5)
 * with the operator profile fixture; production code never reads them.
 *
 * Re-capture is deliberate only: RECLAIM_CAPTURE_FROZEN=1 npx vitest run <this file>.
 */
import { createHash } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { programmeWeekProposal } from '../programmeWeekProposal';
import { defineWeeklyRequirements, exposureDose } from '../weeklyProgramme';
import { LEGACY_WEEKLY_POLICY_VERSION, V3_WEEKLY_POLICY_VERSION } from '../weeklyProgrammeTypes';
import { V4_WEEKLY_POLICY_VERSION_FROZEN, weeklyObjectivesForVersion } from './fixtures/frozenPolicyVersions';
import type { FourWeekProgramPlan } from '../programPlanner';
import type { SessionPlan } from '../types';
import { operatorPlan, operatorSnapshot, type OperatorVariant } from './fixtures/operatorProfile';

const FIXTURE = resolve(__dirname, 'fixtures/frozenPolicyReplay.json');
const CAPTURE = process.env.RECLAIM_CAPTURE_FROZEN === '1';

type Case = { name: string; days: number; variant: OperatorVariant };
const CASES: Case[] = [
  { name: '2-day auto', days: 2, variant: {} },
  { name: '3-day auto', days: 3, variant: {} },
  { name: '4-day auto', days: 4, variant: {} },
  { name: '5-day auto', days: 5, variant: {} },
  { name: '2-day upper_lower', days: 2, variant: { splitPreference: 'upper_lower' } },
];
const VERSIONS = [V4_WEEKLY_POLICY_VERSION_FROZEN, V3_WEEKLY_POLICY_VERSION, LEGACY_WEEKLY_POLICY_VERSION] as const;

const sha = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const weekOne = (plan: FourWeekProgramPlan): FourWeekProgramPlan => JSON.parse(JSON.stringify({ ...plan, weeks: plan.weeks.filter((week) => week.weekIndex === 1) }));
/**
 * Session ids and creation times are wall-clock values, not prescription.
 * Replays embed live catalogue rows; `repsPerSide` (2026-11-05) is a display-only
 * catalogue field added after capture and is the only key removed. Every
 * prescription, allocation, issue and validation field is compared as captured.
 */
const normalise = (proposals: Map<number, SessionPlan>) => JSON.parse(JSON.stringify([...proposals].map(([key, plan]) => {
  const { id: _id, createdAt: _createdAt, ...rest } = plan;
  return [key, rest];
}), function (this: Record<string, unknown>, key, value) {
  if (key === 'repsPerSide') return undefined;
  // N-0074 (2026-11-05): additive progression fields recorded on new builds only.
  if (key === 'loadFollows' || key === 'exposure' && this.policyVersion === 'double-20261103') return undefined;
  return value;
}));

/** A saved programme of an earlier version: v4 allocation relabelled with that version's declared doses. */
function relabel(plan: FourWeekProgramPlan, version: string, days: number): FourWeekProgramPlan {
  const copy = weekOne(plan);
  const week = copy.weeks[0];
  const compilation = week.compilation!;
  const profile = copy.programme!.input;
  const objectives = weeklyObjectivesForVersion(compilation.strategyId);
  copy.programme!.policyVersion = version;
  compilation.policyVersion = version as typeof compilation.policyVersion;
  compilation.requirements = defineWeeklyRequirements(days, profile, version, compilation.strategyId);
  for (const day of [...Object.values(compilation.days), ...Object.values(week.days).map((entry) => entry.allocation!)]) {
    day.policyVersion = version as typeof day.policyVersion;
    for (const slot of day.slots) {
      const objective = objectives.find((row) => row.id === slot.requirementId)!;
      const position = objective.positions.findIndex(([ordinal, index]) => `${ordinal}:${index}` === slot.slotId);
      const dose = exposureDose(objective, position, profile.goals, version);
      slot.setCount = dose.setCount; slot.reps = dose.reps; slot.restSeconds = dose.restSeconds;
      delete slot.repRange; delete slot.exposure;
    }
  }
  return copy;
}

type Fixture = Record<string, { compileSha?: string; storedPlan: FourWeekProgramPlan; replaySha: string }>;

describe('frozen weekly policy versions rebuild byte-identical (operator fixture)', () => {
  if (CAPTURE) {
    it('captures fixtures', () => {
      const fixture: Fixture = {};
      for (const entry of CASES) {
        const v4 = operatorPlan(entry.days, entry.variant);
        for (const version of VERSIONS) {
          const stored = version === V4_WEEKLY_POLICY_VERSION_FROZEN ? weekOne(v4) : relabel(v4, version, entry.days);
          fixture[`${entry.name} ${version}`] = {
            ...(version === V4_WEEKLY_POLICY_VERSION_FROZEN ? { compileSha: sha(v4) } : {}),
            storedPlan: stored,
            replaySha: sha(normalise(programmeWeekProposal(stored, 1, stored.programme!.input))),
          };
        }
      }
      writeFileSync(FIXTURE, `${JSON.stringify(fixture)}\n`);
      expect(Object.keys(fixture)).toHaveLength(CASES.length * VERSIONS.length);
    });
    return;
  }
  const fixture: Fixture = existsSync(FIXTURE) ? JSON.parse(readFileSync(FIXTURE, 'utf8')) : {};
  for (const entry of CASES) for (const version of VERSIONS) {
    const key = `${entry.name} ${version}`;
    it(`${key}: saved programme replays byte-identical`, () => {
      const row = fixture[key];
      expect(row, `missing fixture ${key}`).toBeDefined();
      const stored: FourWeekProgramPlan = JSON.parse(JSON.stringify(row.storedPlan));
      expect(sha(normalise(programmeWeekProposal(stored, 1, stored.programme!.input)))).toBe(row.replaySha);
    });
    if (version === V4_WEEKLY_POLICY_VERSION_FROZEN) it(`${key}: compiling at v4 is byte-identical to the frozen v4 build`, () => {
      const rebuilt = operatorPlan(entry.days, entry.variant, { policyVersion: V4_WEEKLY_POLICY_VERSION_FROZEN });
      expect(sha(rebuilt)).toBe(fixture[key].compileSha);
    });
  }
  it('fixture profile is the operator snapshot', () => {
    expect(operatorSnapshot().goals.build_muscle).toBeCloseTo(0.5037, 4);
  });
});
