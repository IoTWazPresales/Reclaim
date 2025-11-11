import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { supabase } from '@/lib/supabase';
import { cancelAllReminders } from '@/hooks/useNotifications';
import { cancelRefillReminders } from '@/lib/refillReminders';
import { setHasOnboarded } from '@/state/onboarding';
import { resetProviderOnboardingComplete } from '@/state/providerPreferences';

type ExportPayload = {
  generatedAt: string;
  userId: string;
  meds: any[];
  med_logs: any[];
  mood_entries: any[];
  sleep_sessions: any[];
  sleep_candidates: any[];
  mindfulness_events: any[];
  meditation_sessions: any[];
  entries: any[];
};

const ASYNC_KEYS_TO_CLEAR = [
  '@reclaim/providerPreference:v1',
  'streaks:v1',
  'settings:user:v1',
  'settings:notificationPrefs',
  '@reclaim/refillReminders:v1',
];

async function fetchTable(table: string, userId: string) {
  const { data, error } = await supabase.from(table).select('*').eq('user_id', userId);
  if (error) throw error;
  return data ?? [];
}

export async function exportUserData(): Promise<string> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('No active session');

  const [meds, medLogs, moodEntries, sleepSessions, sleepCandidates, mindfulness, meditation, entries] =
    await Promise.all([
      fetchTable('meds', user.id),
      fetchTable('med_logs', user.id),
      fetchTable('mood_entries', user.id),
      fetchTable('sleep_sessions', user.id),
      fetchTable('sleep_candidates', user.id),
      fetchTable('mindfulness_events', user.id),
      fetchTable('meditation_sessions', user.id),
      fetchTable('entries', user.id),
    ]);

  const payload: ExportPayload = {
    generatedAt: new Date().toISOString(),
    userId: user.id,
    meds,
    med_logs: medLogs,
    mood_entries: moodEntries,
    sleep_sessions: sleepSessions,
    sleep_candidates: sleepCandidates,
    mindfulness_events: mindfulness,
    meditation_sessions: meditation,
    entries,
  };

  const fsModule = FileSystem as unknown as { cacheDirectory?: string | null; documentDirectory?: string | null };
  const cacheDir = fsModule.cacheDirectory ?? fsModule.documentDirectory ?? '';
  const fileUri = `${cacheDir}reclaim-export-${Date.now()}.json`;
  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(payload, null, 2));

  const sharingAvailable = await Sharing.isAvailableAsync();
  if (sharingAvailable) {
    await Sharing.shareAsync(fileUri);
  }

  return fileUri;
}

export async function deleteAllPersonalData(): Promise<void> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('No active session');

  await cancelAllReminders();
  await cancelRefillReminders();

  const tablesToDelete = [
    'med_logs',
    'meds',
    'mood_entries',
    'sleep_sessions',
    'sleep_candidates',
    'mindfulness_events',
    'meditation_sessions',
    'entries',
  ];

  for (const table of tablesToDelete) {
    await supabase.from(table).delete().eq('user_id', user.id);
  }

  await supabase
    .from('profiles')
    .update({ has_onboarded: false })
    .eq('id', user.id);

  await setHasOnboarded(false);
  await resetProviderOnboardingComplete();

  await AsyncStorage.multiRemove(ASYNC_KEYS_TO_CLEAR);

  const allKeys = await AsyncStorage.getAllKeys();
  const supabaseFallbackKeys = allKeys.filter((key) => key.startsWith('@reclaim/supabase/fallback/'));
  if (supabaseFallbackKeys.length) {
    await AsyncStorage.multiRemove(supabaseFallbackKeys);
  }

  await supabase.auth.signOut();
}

