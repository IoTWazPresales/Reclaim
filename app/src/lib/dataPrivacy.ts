import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { exportLocalDataSectionForUser, clearAllLocalDataForUser, type LocalDataExportSection } from '@/lib/localData/localDataPrivacy';
import { MEDITATION_LEGACY_ASYNC_STORAGE_KEY } from '@/lib/localData/meditationSessionsRepository';
import { RECOVERY_PROGRESS_LEGACY_STORAGE_KEY } from '@/lib/localData/recoveryProgressRepository';
import { MOOD_LEGACY_IMPORT_STATE_KEY_V2, MOOD_LEGACY_KEY_V1, MOOD_PENDING_KEY_V2 } from '@/lib/mood/moodOutbox';
import { supabase } from '@/lib/supabase';
import { ROUTINE_DAY_LEGACY_STORAGE_PREFIX, ROUTINE_INTENT_KEY } from '@/lib/routines';
import { logger } from '@/lib/logger';
import { cancelAllReminders } from '@/hooks/useNotifications';
import { cancelRefillReminders } from '@/lib/refillReminders';
import { setHasOnboarded } from '@/state/onboarding';
import { resetProviderOnboardingComplete } from '@/state/providerPreferences';

type ExportPayload = {
  generatedAt: string;
  userId: string;
  meds: any[];
  meds_log: any[];
  mood_entries: any[];
  sleep_sessions: any[];
  sleep_candidates: any[];
  mindfulness_events: any[];
  meditation_sessions: any[];
  entries: any[];
  /** On-device SQLite mirrors (see `localDataPrivacy`). Never includes auth/session secrets. */
  localData: LocalDataExportSection | { error: string; note?: string };
};

/** Must match `MedDoseOfflineQueue` internal queue key. */
const MED_DOSE_QUEUE_LEGACY_KEY = '@reclaim/notifications/medDoseQueue';
/** Must match `api.ts` MED_LOGS_KEY. */
const MED_LOGS_LEGACY_KEY = '@reclaim/meds/logs/v1';

const SYNC_TIMESTAMP_KEYS = [
  '@reclaim/sync/last',
  '@reclaim/sync/health/last_attempt',
  '@reclaim/sync/health/last_success',
] as const;

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

/**
 * Removes known personal-data keys and prefix patterns from AsyncStorage (legacy + compatibility).
 * Does not touch SecureStore session material.
 */
async function clearPersonalAsyncStorageKeys(): Promise<void> {
  const keys = new Set<string>([
    ...ASYNC_KEYS_TO_CLEAR,
    MOOD_LEGACY_KEY_V1,
    MOOD_PENDING_KEY_V2,
    MOOD_LEGACY_IMPORT_STATE_KEY_V2,
    MEDITATION_LEGACY_ASYNC_STORAGE_KEY,
    RECOVERY_PROGRESS_LEGACY_STORAGE_KEY,
    MED_DOSE_QUEUE_LEGACY_KEY,
    MED_LOGS_LEGACY_KEY,
    ROUTINE_INTENT_KEY,
    '@reclaim/meditations/active',
    '@reclaim/meditation/settings/v1',
    '@reclaim/training/offline_queue',
    '@reclaim/sleep/settings',
    '@reclaim/sleep/wakeDetections',
    '@reclaim/health/connections',
    '@reclaim/health/preferredIntegration',
    '@reclaim/notifications/planFingerprint',
    '@reclaim/notifications/lastScheduled',
    '@reclaim/notifications/intents',
    '@reclaim/notifications/actionProcessed',
    '@reclaim/daily_signal/lastScheduled',
    '@reclaim/daily_signal/lastInsightId',
    '@reclaim/weekly_narrative/lastWeekNumber',
    '@reclaim/alpha_feedback_queue',
    '@reclaim/just_onboarded_hint',
    ...SYNC_TIMESTAMP_KEYS,
  ]);

  const allKeys = await AsyncStorage.getAllKeys();
  for (const k of allKeys) {
    if (k.startsWith('@reclaim/supabase/fallback/')) keys.add(k);
    if (k.startsWith(ROUTINE_DAY_LEGACY_STORAGE_PREFIX)) keys.add(k);
    if (k.startsWith('@reclaim/training/sessionWriteBuffer/')) keys.add(k);
    if (k.startsWith('@reclaim/insights:seen:v1:')) keys.add(k);
    if (k.startsWith('@reclaim/wellness/')) keys.add(k);
    if (k.startsWith('@reclaim/health/notifications/last_')) keys.add(k);
  }

  await AsyncStorage.multiRemove([...keys]);
}

export async function exportUserData(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const user = data.user;
  if (!user) throw new Error('No active session');

  const [meds, medLogs, moodEntries, sleepSessions, sleepCandidates, mindfulness, meditation, entries] =
    await Promise.all([
      fetchTable('meds', user.id),
      fetchTable('meds_log', user.id),
      fetchTable('mood_entries', user.id),
      fetchTable('sleep_sessions', user.id),
      fetchTable('sleep_candidates', user.id),
      fetchTable('mindfulness_events', user.id),
      fetchTable('meditation_sessions', user.id),
      fetchTable('entries', user.id),
    ]);

  const localDataResult = await exportLocalDataSectionForUser(user.id);
  const localData: ExportPayload['localData'] =
    'error' in localDataResult
      ? {
          error: localDataResult.error,
          note: 'On-device database export failed; other sections are from the cloud.',
        }
      : localDataResult;

  const payload: ExportPayload = {
    generatedAt: new Date().toISOString(),
    userId: user.id,
    meds,
    meds_log: medLogs,
    mood_entries: moodEntries,
    sleep_sessions: sleepSessions,
    sleep_candidates: sleepCandidates,
    mindfulness_events: mindfulness,
    meditation_sessions: meditation,
    entries,
    localData,
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export async function exportUserDataPdf(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const user = data.user;
  if (!user) throw new Error('No active session');

  const [meds, medLogs, moodEntries, sleepSessions] = await Promise.all([
    fetchTable('meds', user.id),
    fetchTable('meds_log', user.id),
    fetchTable('mood_entries', user.id),
    fetchTable('sleep_sessions', user.id),
  ]);

  const medNameMap = new Map<string, string>();
  meds.forEach((med: any) => {
    if (med?.id) medNameMap.set(String(med.id), med.name ?? med.title ?? med.id);
  });

  const moodRows = moodEntries
    .slice(0, 90)
    .reverse()
    .map(
      (e: any) =>
        `<tr><td>${escapeHtml(formatDate(e.created_at ?? ''))}</td><td>${escapeHtml(String(e.rating ?? '—'))}</td><td>${escapeHtml(String(e.energy ?? '—'))}</td><td>${escapeHtml(String(e.note ?? '').slice(0, 100))}</td></tr>`,
    )
    .join('');
  const sleepRows = sleepSessions
    .slice(0, 30)
    .reverse()
    .map(
      (s: any) =>
        `<tr><td>${escapeHtml(formatDate(s.start_time ?? ''))}</td><td>${escapeHtml(formatDate(s.end_time ?? ''))}</td><td>${escapeHtml(String(s.duration_min ?? s.durationMinutes ?? '—'))}</td><td>${escapeHtml(String(s.source ?? '—'))}</td></tr>`,
    )
    .join('');
  const medLogRows = medLogs
    .slice(0, 90)
    .reverse()
    .map((l: any) => {
      const medName = medNameMap.get(String(l.med_id)) ?? l.med_id ?? 'unknown';
      return `<tr><td>${escapeHtml(formatDate(l.taken_at ?? l.created_at ?? ''))}</td><td>${escapeHtml(medName)}</td><td>${escapeHtml(String(l.status ?? '—'))}</td></tr>`;
    })
    .join('');

  const generatedAt = formatDate(new Date().toISOString());
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: system-ui, sans-serif; font-size: 12px; padding: 20px; color: #1a1a1a; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    .meta { color: #666; margin-bottom: 20px; font-size: 11px; }
    h2 { font-size: 14px; margin-top: 24px; margin-bottom: 8px; border-bottom: 1px solid #ddd; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 11px; }
    th { background: #f5f5f5; font-weight: 600; }
    .empty { color: #999; font-style: italic; }
    .disclaimer { margin-top: 24px; font-size: 10px; color: #888; }
  </style>
</head>
<body>
  <h1>Reclaim Health Summary</h1>
  <p class="meta">Generated ${escapeHtml(generatedAt)}. For clinician review. Not a medical record.</p>

  <h2>Mood (last 90 entries)</h2>
  <table>
    <tr><th>Date</th><th>Rating</th><th>Energy</th><th>Note</th></tr>
    ${moodRows || '<tr><td colspan="4" class="empty">No mood entries</td></tr>'}
  </table>

  <h2>Sleep (last 30 sessions)</h2>
  <table>
    <tr><th>Start</th><th>End</th><th>Duration (min)</th><th>Source</th></tr>
    ${sleepRows || '<tr><td colspan="4" class="empty">No sleep data</td></tr>'}
  </table>

  <h2>Medication log (last 90)</h2>
  <table>
    <tr><th>Date</th><th>Medication</th><th>Status</th></tr>
    ${medLogRows || '<tr><td colspan="3" class="empty">No medication log</td></tr>'}
  </table>

  <p class="disclaimer">Reclaim is not a medical device. This summary is for informational purposes only. Always consult a healthcare professional for medical advice.</p>
</body>
</html>
`;

  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  const sharingAvailable = await Sharing.isAvailableAsync();
  if (sharingAvailable) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Reclaim PDF summary',
    });
  }

  return uri;
}

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  const stringValue = String(value).replace(/"/g, '""');
  if (stringValue.includes(',') || stringValue.includes('\n')) {
    return `"${stringValue}"`;
  }
  return stringValue;
}

export async function exportUserDataCsv(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const user = data.user;
  if (!user) throw new Error('No active session');

  const [meds, medLogs, moodEntries, sleepSessions] = await Promise.all([
    fetchTable('meds', user.id),
    fetchTable('meds_log', user.id),
    fetchTable('mood_entries', user.id),
    fetchTable('sleep_sessions', user.id),
  ]);

  const medNameMap = new Map<string, string>();
  meds.forEach((med: any) => {
    if (med?.id) {
      medNameMap.set(String(med.id), med.name ?? med.title ?? med.id);
    }
  });

  const csvLines: string[] = [];
  csvLines.push(`Generated at,${escapeCsvValue(new Date().toISOString())}`);
  csvLines.push(`User ID,${escapeCsvValue(user.id)}`);
  csvLines.push('');

  csvLines.push('Mood entries');
  csvLines.push('timestamp,rating,energy,tags,note');
  moodEntries.forEach((entry: any) => {
    const tags = Array.isArray(entry.tags) ? entry.tags.join('|') : '';
    csvLines.push(
      [
        entry.created_at,
        entry.rating ?? '',
        entry.energy ?? '',
        tags,
        entry.note ?? '',
      ]
        .map(escapeCsvValue)
        .join(','),
    );
  });
  csvLines.push('');

  csvLines.push('Sleep sessions');
  csvLines.push('start_time,end_time,duration_min,source,quality');
  sleepSessions.forEach((session: any) => {
    csvLines.push(
      [
        session.start_time,
        session.end_time,
        session.durationMin ?? session.duration_min ?? '',
        session.source ?? '',
        session.quality ?? '',
      ]
        .map(escapeCsvValue)
        .join(','),
    );
  });
  csvLines.push('');

  csvLines.push('Medication log');
  csvLines.push('logged_at,medication,status,note');
  medLogs.forEach((log: any) => {
    const medName = medNameMap.get(String(log.med_id)) ?? log.med_id ?? 'unknown';
    csvLines.push(
      [
        log.taken_at ?? log.created_at ?? '',
        medName,
        log.status ?? '',
        log.note ?? '',
      ]
        .map(escapeCsvValue)
        .join(','),
    );
  });

  const csvPayload = csvLines.join('\n');
  const fsModule = FileSystem as unknown as { cacheDirectory?: string | null; documentDirectory?: string | null };
  const cacheDir = fsModule.cacheDirectory ?? fsModule.documentDirectory ?? '';
  const fileUri = `${cacheDir}reclaim-export-${Date.now()}.csv`;
  await FileSystem.writeAsStringAsync(fileUri, csvPayload);

  const sharingAvailable = await Sharing.isAvailableAsync();
  if (sharingAvailable) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: 'Reclaim CSV export',
    });
  }

  return fileUri;
}

export async function deleteAllPersonalData(): Promise<void> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const user = data.user;
  if (!user) throw new Error('No active session');

  await cancelAllReminders();
  await cancelRefillReminders();

  const tablesToDelete = [
    'meds_log',
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

  await setHasOnboarded(user.id, false);
  await resetProviderOnboardingComplete();

  const localClear = await clearAllLocalDataForUser(user.id);
  if (!localClear.ok) {
    logger.warn('[dataPrivacy] SQLite clear failed after cloud delete', localClear.error);
    throw new Error(
      `Your cloud data was removed, but some on-device data could not be cleared (${localClear.error}). Try again or reinstall the app.`,
    );
  }

  await clearPersonalAsyncStorageKeys();

  await supabase.auth.signOut();
}

