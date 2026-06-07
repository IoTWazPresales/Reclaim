import type { MedCatalogItem } from '@/lib/medCatalog';
import type { MedDetailScheduleView } from './medDetailTypes';

export type CatalogEducationMode = 'curated' | 'general';

export function resolveCatalogEducationMode(catalogMatch: MedCatalogItem | null): CatalogEducationMode {
  return catalogMatch ? 'curated' : 'general';
}

export const GENERAL_PROFILE_EDUCATION_COPY =
  'Without a curated entry, we still show schedule, reminders, and your logging below. That’s useful context for you and your care team — it’s not proof of what medication you’re taking or how it affects you.';

export const EMPTY_CONTEXT_NOTES_COPY =
  'No personalized notes right now — keep logging mood and sleep for deeper context.';

export type MedScheduleMode = 'prn' | 'scheduled';

export function resolveMedScheduleMode(schedule: MedDetailScheduleView): MedScheduleMode {
  return schedule.isPrn ? 'prn' : 'scheduled';
}

export function resolveRecentDosesEmptyCopy(isPrn: boolean): string {
  return isPrn
    ? 'No doses logged in the last 30 days. As-needed medications are tracked by use, not daily adherence.'
    : 'No doses logged in the last 30 days.';
}
