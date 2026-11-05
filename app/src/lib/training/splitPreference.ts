/**
 * Weekly split preference (ROUTINE_AUDIT.md, split preference 2026-11-04).
 * Auto keeps the existing day-count policy. Full body and Upper/Lower are
 * offered only where an approved weekly policy of that shape exists, and only
 * in strength mode: hybrid run placement (D-P2-03) is not decided here.
 * Stored in training_profiles.constraints.preferences; no schema change.
 */
import { UPPER_LOWER_STRATEGY_ID } from './weeklyProgrammePolicy';

export type SplitPreference = 'auto' | 'full_body' | 'upper_lower';

/** Full body: balanced 2- and 3-day weeks. Upper/Lower: new 2-day split, balanced 4-day week. */
const POLICY_DAY_COUNTS: Record<Exclude<SplitPreference, 'auto'>, number[]> = {
  full_body: [2, 3],
  upper_lower: [2, 4],
};

export function availableSplitPreferences(daysPerWeek: number, trainingMode: string | undefined): SplitPreference[] {
  if ((trainingMode ?? 'strength') !== 'strength') return ['auto'];
  return ['auto', ...(Object.keys(POLICY_DAY_COUNTS) as Array<Exclude<SplitPreference, 'auto'>>)
    .filter((preference) => POLICY_DAY_COUNTS[preference].includes(daysPerWeek))];
}

/** Unknown or unavailable values resolve to Auto. */
export function resolveSplitPreference(value: unknown, daysPerWeek: number, trainingMode: string | undefined): SplitPreference {
  return (value === 'full_body' || value === 'upper_lower') && availableSplitPreferences(daysPerWeek, trainingMode).includes(value) ? value : 'auto';
}

/** The approved weekly strategy a non-Auto preference selects; undefined keeps Auto. */
export function splitWeeklyStrategyId(preference: SplitPreference, daysPerWeek: number): string | undefined {
  if (preference === 'auto') return undefined;
  if (preference === 'upper_lower' && daysPerWeek === 2) return UPPER_LOWER_STRATEGY_ID;
  return `balanced-v1:${daysPerWeek}`;
}

export const SPLIT_PREFERENCE_LABELS: Record<SplitPreference, string> = {
  auto: 'Auto',
  full_body: 'Full body',
  upper_lower: 'Upper/Lower',
};

/** One plain-language line for two-day Upper/Lower (ROUTINE_AUDIT.md, weekly policy v5 2026-11-05, V5-8:
 * Pelland et al. 2024 preprint, frequency; Remmert et al. 2025 preprint, per-session volume). */
export const UPPER_LOWER_TWO_DAY_NOTE =
  'Upper body one day, lower body the other. Each muscle is trained once a week; full body trains each muscle twice and is usually better for strength.';
