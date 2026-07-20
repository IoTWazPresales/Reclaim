/**
 * Remote exercise stills (Layer 2) — never bundled in the APK.
 *
 * Base URL resolution order:
 * 1. EXPO_PUBLIC_EXERCISE_STILLS_BASE_URL (CDN / custom)
 * 2. `${EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/exercise-stills`
 *
 * If neither resolves, or the image 404s / fails offline → stick diagram fallback.
 */
import { SUPABASE_URL } from '@/lib/supabase';
import illustrationMap from '@/lib/training/catalog/exerciseIllustrations.v1.json';

const FILE_BY_EXERCISE = illustrationMap as Record<string, string>;

export function listIllustratedExerciseIds(): string[] {
  return Object.keys(FILE_BY_EXERCISE);
}

export function getExerciseIllustrationFile(exerciseId: string): string | null {
  return FILE_BY_EXERCISE[exerciseId] ?? null;
}

/** Public base URL for stills, or null when remote stills are not configured. */
export function getExerciseStillsBaseUrl(): string | null {
  const fromEnv = (process.env.EXPO_PUBLIC_EXERCISE_STILLS_BASE_URL ?? '').trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  const supabase = (SUPABASE_URL ?? '').trim().replace(/\/$/, '');
  if (!supabase || supabase.includes('placeholder')) return null;
  return `${supabase}/storage/v1/object/public/exercise-stills`;
}

export function resolveExerciseIllustrationUrl(exerciseId: string): string | null {
  const file = getExerciseIllustrationFile(exerciseId);
  if (!file) return null;
  const base = getExerciseStillsBaseUrl();
  if (!base) return null;
  return `${base}/${encodeURIComponent(file)}`;
}

export function hasMappedExerciseIllustration(exerciseId: string): boolean {
  return Boolean(getExerciseIllustrationFile(exerciseId));
}
