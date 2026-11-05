/** Test helper: the frozen v4 identity and its objective tables (pre-v5 tables). */
import { weeklyObjectivesFor } from '../../weeklyProgrammePolicy';
import { V4_WEEKLY_POLICY_VERSION } from '../../weeklyProgrammeTypes';

export const V4_WEEKLY_POLICY_VERSION_FROZEN = V4_WEEKLY_POLICY_VERSION;

/** v2/v3/v4 share the pre-v5 objective tables. */
export function weeklyObjectivesForVersion(strategyId: string) {
  return weeklyObjectivesFor(strategyId) ?? [];
}
