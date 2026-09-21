import { describe, it, expect } from 'vitest';
import { findMedCatalogItemByName } from '@/lib/medCatalog';
import { medProfileModeLabel, resolveMedProfileMode } from '../medProfileMode';

describe('medProfileMode', () => {
  it('labels PRN mode', () => {
    expect(resolveMedProfileMode(true, findMedCatalogItemByName('sertraline'))).toBe('prn');
    expect(medProfileModeLabel('prn')).toBe('As needed (PRN)');
  });

  it('does not promote an unreviewed catalogue match to curated', () => {
    const catalog = findMedCatalogItemByName('sertraline');
    expect(resolveMedProfileMode(false, catalog)).toBe('reference');
    expect(medProfileModeLabel('reference')).toBe('Catalogue reference (not reviewed)');
    expect(medProfileModeLabel('curated')).toBe('Reviewed educational reference');
  });

  it('labels general profile when no catalogue match', () => {
    expect(resolveMedProfileMode(false, null)).toBe('general');
    expect(medProfileModeLabel('general')).toBe('Tracking only');
  });
});
