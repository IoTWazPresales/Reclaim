import type { MedCatalogItem } from '@/lib/medCatalog';
import type { MedProfileMode } from './medDetailTypes';

/** Single authority for curated vs general profile badge labeling. */
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
      return 'Curated profile available';
    case 'general':
      return 'General profile mode';
  }
}
