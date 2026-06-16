import type { MedCatalogItem } from '@/lib/medCatalog';
import type { MedProfileMode } from './medDetailTypes';

/** Single authority for matched-reference vs general profile badge labeling. */
export function resolveMedProfileMode(isPrn: boolean, catalogMatch: MedCatalogItem | null): MedProfileMode {
  if (isPrn) return 'prn';
  if (catalogMatch) return 'curated';
  return 'general';
}

export function medProfileModeLabel(mode: MedProfileMode): string {
  switch (mode) {
    case 'prn':
      return 'As needed (PRN)';
    case 'curated':
      return 'Educational reference matched';
    case 'general':
      return 'Tracking only';
  }
}
