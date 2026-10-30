import type { ExercisePriority, MovementIntent, SessionTemplate } from './types';
import type { Dose, LoadPolicy } from './balancedHypertrophy';

export const LEGACY_WEEKLY_POLICY_VERSION = 'weekly-20261014-v2' as const;
export const WEEKLY_POLICY_VERSION = 'weekly-20261030-v3' as const;
export type WeeklyPolicyVersion = typeof WEEKLY_POLICY_VERSION | typeof LEGACY_WEEKLY_POLICY_VERSION;
export const supportsWeeklyPolicy = (version: string) => version === WEEKLY_POLICY_VERSION || version === LEGACY_WEEKLY_POLICY_VERSION;
export type ProgrammeIssue = {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  dayKey?: string;
  slotId?: string;
};
export type WeeklyRequirement = {
  id: string;
  /** Scheduling owner; not a claim of zero indirect stimulus elsewhere. */
  owner: string;
  dose: Dose;
  targetSets: number;
  targetExposures: number;
  /** Policy positions exist even if the supplied calendar omits a day. */
  positions: Array<[number, number]>;
  exposureSlotIds: string[];
  provenance: string;
};
export type AllocatedSlot = {
  slotId: string;
  requirementId: string;
  intent: MovementIntent;
  owner: string;
  dose: Dose;
  setCount: number;
  reps: number;
  restSeconds: number;
  priority: ExercisePriority;
  loadPolicy: LoadPolicy;
  compound: boolean;
  exerciseId: string | null;
  candidateExerciseIds: string[];
};
export type AllocatedProgrammeDay = {
  policyVersion: WeeklyPolicyVersion;
  strategyId: string;
  dayKey: string;
  slots: AllocatedSlot[];
  issues: ProgrammeIssue[];
};
export type WeeklyProgrammeInputDay = {
  weekday: number;
  strategyId?: string;
  template: SessionTemplate;
  intents: MovementIntent[];
  scheduledRun?: boolean;
};
export type CompiledProgrammeWeek = {
  policyVersion: WeeklyPolicyVersion;
  strategyId: string;
  policyStatus: 'accepted' | 'legacy_pending_review';
  requirements: WeeklyRequirement[];
  /** Accepted run placement only; no new duration or progression policy. */
  runRequirement?: { id: 'run'; targetExposures: number; dayKeys: string[]; provenance: string };
  days: Record<number, AllocatedProgrammeDay>;
  issues: ProgrammeIssue[];
  status: 'feasible' | 'infeasible';
};
