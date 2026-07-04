type SyncCelebrationInput = {
  sleepSynced?: boolean;
  activitySynced?: boolean;
  debug?: {
    sleepWriteSuccesses?: number;
    sleepDataFound?: boolean;
  };
};

/**
 * Celebration line for a USER-INITIATED import: only when new nights actually
 * arrived. Background / cold-open syncs never celebrate — they stay silent.
 */
export function formatSyncCelebrationMessage(result: SyncCelebrationInput): string | null {
  const nights = result.debug?.sleepWriteSuccesses ?? 0;
  if (nights > 0) {
    return `${nights} night${nights === 1 ? '' : 's'} imported`;
  }
  return null;
}
