import { describe, it, expect } from 'vitest';
import { findMedCatalogItemByName } from '@/lib/medCatalog';
import { medProfileModeLabel, resolveMedProfileMode } from '../medProfileMode';

describe('medProfileMode', () => {
  it('labels PRN mode', () => {
    expect(resolveMedProfileMode(true, findMedCatalogItemByName('sertraline'))).toBe('prn');
    expect(medProfileModeLabel('prn')).toBe('As needed (PRN)');
  });

  it('labels curated profile when catalogue matches and not PRN', () => {
    const catalog = findMedCatalogItemByName('sertraline');
    expect(resolveMedProfileMode(false, catalog)).toBe('curated');
    expect(medProfileModeLabel('curated')).toBe('Curated profile available');
  });

  it('labels general profile when no catalogue match', () => {
    expect(resolveMedProfileMode(false, null)).toBe('general');
    expect(medProfileModeLabel('general')).toBe('General profile mode');
  });
});
