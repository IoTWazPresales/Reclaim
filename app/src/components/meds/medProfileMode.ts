import type { MedCatalogItem } from '@/lib/medCatalog';
import { isReviewedMedCatalogItem, MED_CATALOG_REVIEW_LABELS } from '@/lib/medCatalogCuration';
import type { MedProfileMode } from './medDetailTypes';

/** Single authority for matched-reference vs general profile badge labeling. */
export function resolveMedProfileMode(isPrn: boolean, catalogMatch: MedCatalogItem | null): MedProfileMode {
  if (isPrn) return 'prn';
  if (isReviewedMedCatalogItem(catalogMatch)) return 'curated';
  if (catalogMatch) return 'reference';
  return 'general';
}

export function medProfileModeLabel(mode: MedProfileMode): string {
  switch (mode) {
    case 'prn':
      return 'As needed (PRN)';
    case 'curated':
      return MED_CATALOG_REVIEW_LABELS.reviewed;
    case 'reference':
      return MED_CATALOG_REVIEW_LABELS.unreviewed;
    case 'general':
      return 'Tracking only';
  }
}
