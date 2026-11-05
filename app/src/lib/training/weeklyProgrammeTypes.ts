import type { ExercisePriority, MovementIntent, SessionTemplate } from './types';
import type { Dose, LoadPolicy } from './balancedHypertrophy';

export const LEGACY_WEEKLY_POLICY_VERSION = 'weekly-20261014-v2' as const;
/** D-P2-01 caps and load precedence; dose blend replayed exactly for saved programmes. */
export const V3_WEEKLY_POLICY_VERSION = 'weekly-20261030-v3' as const;
/** Per-exposure dose (slot priority, 0.05 goal shares, mixed-goal exposures). Frozen for saved programmes. */
export const V4_WEEKLY_POLICY_VERSION = 'weekly-20261104-v4' as const;
/** New builds: v5 tables (hinge slots, in-day order, core), no session time/total cap (ROUTINE_AUDIT.md, weekly policy v5 2026-11-05). */
export const WEEKLY_POLICY_VERSION = 'weekly-20261105-v5' as const;
export type WeeklyPolicyVersion = typeof WEEKLY_POLICY_VERSION | typeof V4_WEEKLY_POLICY_VERSION | typeof V3_WEEKLY_POLICY_VERSION | typeof LEGACY_WEEKLY_POLICY_VERSION;
export const supportsWeeklyPolicy = (version: string) => version === WEEKLY_POLICY_VERSION || version === V4_WEEKLY_POLICY_VERSION || version === V3_WEEKLY_POLICY_VERSION || version === LEGACY_WEEKLY_POLICY_VERSION;
/** v3, v4 and v5 share D-P2-01 load precedence, progression checks and the per-exercise / per-owner caps. */
export const usesCappedWeeklyPolicy = (version: string | undefined) => version === WEEKLY_POLICY_VERSION || version === V4_WEEKLY_POLICY_VERSION || version === V3_WEEKLY_POLICY_VERSION;
/** v4 and v5 declare a dose per exposure; earlier versions divide the weekly target evenly. */
export const usesExposureDosePolicy = (version: string | undefined) => version === WEEKLY_POLICY_VERSION || version === V4_WEEKLY_POLICY_VERSION;
/** v5 only: v5 objective tables, in-day order, core, realistic duration, and no session minute/total/per-priority cap. */
export const usesV5WeeklyPolicy = (version: string | undefined) => version === WEEKLY_POLICY_VERSION;
/** Mixed strength + muscle goals: the role a heavy exposure plays in the week (v4). */
export type ExposureRole = 'strength' | 'hypertrophy';
export type ProgrammeIssue = {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  dayKey?: string;
  slotId?: string;
  exerciseId?: string;
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
  /** v4: declared sets for each exposure, in position order; targetSets is their sum. */
  exposureSetCounts?: number[];
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
  /** v4 only. Rep range used for progression on this exposure. */
  repRange?: [number, number];
  /** v4 only, mixed strength + muscle goals: this heavy exposure's role. */
  exposure?: ExposureRole;
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
