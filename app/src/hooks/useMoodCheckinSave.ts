import { useState } from 'react';
import { Alert } from 'react-native';
import { createMoodCheckin } from '@/lib/api';
import { gradeForecastWithMood } from '@/lib/forecastJournal';
import { logger } from '@/lib/logger';

/** Used behind MoodCheckinSaveButton's synchronous in-flight guard. */
export function useMoodCheckinSave({ rating, tags, invalidate, refreshInsight }: {
  rating: number;
  tags: string[];
  invalidate: () => Promise<unknown>;
  refreshInsight: () => Promise<unknown>;
}) {
  const [note, setNote] = useState('');

  const save = async () => {
    const submittedNote = note;
    try {
      await createMoodCheckin({ rating, note: submittedNote.trim(), tags });
    } catch (error: unknown) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to log check-in');
      return;
    }

    // A user can already be writing the next note while persistence is pending.
    setNote(current => current === submittedNote ? '' : current);

    // Persistence succeeded. These independent follow-ups cannot turn it into a
    // failed write, suppress each other, or encourage a duplicate retry.
    const results = await Promise.allSettled([
      Promise.resolve().then(invalidate),
      Promise.resolve().then(() => gradeForecastWithMood(rating)),
      Promise.resolve().then(refreshInsight),
    ]);
    const refreshFailed = results.some(result => result.status === 'rejected');
    if (refreshFailed && __DEV__) logger.debug('[MoodScreen] Check-in saved; follow-up refresh incomplete');
    const forecast = results[1];
    Alert.alert('Logged', refreshFailed
      ? 'Check-in saved. Some summaries could not refresh yet. No need to save again.'
      : (forecast.status === 'fulfilled' ? forecast.value : null) ?? 'Check-in saved.');
  };

  return { note, setNote, save };
}
