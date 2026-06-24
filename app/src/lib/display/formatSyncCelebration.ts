type SyncCelebrationInput = {
  sleepSynced?: boolean;
  activitySynced?: boolean;
  debug?: {
    sleepWriteSuccesses?: number;
    sleepDataFound?: boolean;
  };
};

/** User-facing sync success line for celebratory confirmation. */
export function formatSyncCelebrationMessage(result: SyncCelebrationInput): string | null {
  const nights = result.debug?.sleepWriteSuccesses ?? 0;
  if (nights > 0) {
    return `${nights} night${nights === 1 ? '' : 's'} imported`;
  }
  if (result.sleepSynced || result.debug?.sleepDataFound) {
    return 'Sleep data synced';
  }
  if (result.activitySynced) {
    return 'Activity data synced';
  }
  return null;
}
