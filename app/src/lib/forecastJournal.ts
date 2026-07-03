/**
 * Forecast journal — stores each day's state forecast and grades it against the
 * user's actual mood at check-in time ("We expected a rough day — you said
 * 6/10. Updating your model."). Device-local (AsyncStorage), add-only per day.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/logger';

const STORAGE_KEY = '@reclaim/forecast_journal/v1';
const MAX_ENTRIES = 60;

export type ForecastTone = '+' | '~' | '-';

export type ForecastJournalEntry = {
  dateKey: string; // local YYYY-MM-DD
  tone: ForecastTone;
  headline: string;
  confidence: number;
  createdAt: string;
  /** Filled when the check-in grades this forecast. */
  actualMood?: number;
  gradedAt?: string;
};

export function localDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d
    .getDate()
    .toString()
    .padStart(2, '0')}`;
}

async function loadJournal(): Promise<Record<string, ForecastJournalEntry>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function saveJournal(journal: Record<string, ForecastJournalEntry>): Promise<void> {
  const keys = Object.keys(journal).sort();
  const trimmed = keys.slice(-MAX_ENTRIES).reduce<Record<string, ForecastJournalEntry>>((acc, k) => {
    acc[k] = journal[k];
    return acc;
  }, {});
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

/**
 * Record today's forecast. The latest ungraded forecast of the day wins;
 * once graded, the entry is frozen so the grade stays honest.
 */
export async function recordTodayForecast(forecast: {
  tone: ForecastTone;
  headline: string;
  confidence: number;
}): Promise<void> {
  try {
    const journal = await loadJournal();
    const key = localDateKey();
    const existing = journal[key];
    if (existing?.gradedAt) return;
    journal[key] = {
      dateKey: key,
      tone: forecast.tone,
      headline: forecast.headline,
      confidence: forecast.confidence,
      createdAt: new Date().toISOString(),
    };
    await saveJournal(journal);
  } catch (e) {
    logger.debug('[forecastJournal] record failed', e);
  }
}

/** Whether the forecast called the day correctly (mood on a 1–10 scale). */
export function forecastHit(tone: ForecastTone, rating: number): boolean {
  if (tone === '-') return rating <= 4;
  if (tone === '+') return rating >= 6;
  return rating >= 4 && rating <= 7;
}

/** The user-facing grading line — honest and guilt-free. */
export function composeForecastGradeLine(tone: ForecastTone, rating: number): string {
  if (tone === '-') {
    return rating >= 6
      ? `We expected a rough day — you said ${rating}/10. Updating your model.`
      : `We expected a rough patch and you still showed up — you said ${rating}/10.`;
  }
  if (tone === '+') {
    return rating <= 4
      ? `We expected a steadier day — you said ${rating}/10. Updating your model.`
      : `Forecast held — you said ${rating}/10.`;
  }
  return `Mixed day expected — you said ${rating}/10. Every log sharpens tomorrow's read.`;
}

/**
 * Grade the most recent ungraded forecast (today, else yesterday) against the
 * mood the user just logged. Returns the grading line, or null when there is
 * no forecast to grade.
 */
export async function gradeForecastWithMood(rating: number, now: Date = new Date()): Promise<string | null> {
  if (!Number.isFinite(rating) || rating < 1 || rating > 10) return null;
  try {
    const journal = await loadJournal();
    const todayKey = localDateKey(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = localDateKey(yesterday);

    const target =
      (journal[todayKey] && !journal[todayKey].gradedAt && journal[todayKey]) ||
      (journal[yesterdayKey] && !journal[yesterdayKey].gradedAt && journal[yesterdayKey]) ||
      null;
    if (!target) return null;

    target.actualMood = rating;
    target.gradedAt = new Date().toISOString();
    journal[target.dateKey] = target;
    await saveJournal(journal);

    return composeForecastGradeLine(target.tone, rating);
  } catch (e) {
    logger.debug('[forecastJournal] grade failed', e);
    return null;
  }
}

export type ForecastAccuracySummary = {
  gradedCount: number;
  hitCount: number;
  /** "Forecast hit 4 of 6 graded days" — null when nothing graded yet. */
  line: string | null;
};

/** Accuracy over the last N days — for the Weekly Stability Report. */
export async function getForecastAccuracySummary(days = 7): Promise<ForecastAccuracySummary> {
  try {
    const journal = await loadJournal();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffKey = localDateKey(cutoff);

    const graded = Object.values(journal).filter(
      (e) => e.dateKey >= cutoffKey && e.gradedAt && typeof e.actualMood === 'number',
    );
    const hits = graded.filter((e) => forecastHit(e.tone, e.actualMood!));
    return {
      gradedCount: graded.length,
      hitCount: hits.length,
      line:
        graded.length > 0
          ? `Forecast matched your check-in on ${hits.length} of ${graded.length} graded day${graded.length === 1 ? '' : 's'}.`
          : null,
    };
  } catch {
    return { gradedCount: 0, hitCount: 0, line: null };
  }
}
