// C:\Reclaim\app\src\lib\__tests__\medCatalog.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadMedCatalog,
  normalizeMedName,
  findMedCatalogItemByName,
  findMedCatalogItemById,
  getCategoryLabel,
  formatEffectTagLabel,
  formatStateImpactTagLabel,
  stripMedicationSaltSuffix,
  resetMedCatalogLookupCache,
} from '../medCatalog';

describe('medCatalog', () => {
  beforeEach(() => {
    resetMedCatalogLookupCache();
  });
  describe('loadMedCatalog', () => {
    it('should return catalog with entries', () => {
      const catalog = loadMedCatalog();
      expect(catalog.length).toBeGreaterThan(0);
      expect(catalog[0]).toHaveProperty('id');
      expect(catalog[0]).toHaveProperty('genericName');
      expect(catalog[0]).toHaveProperty('mechanism');
    });
  });

  describe('normalizeMedName', () => {
    it('should lowercase and trim', () => {
      expect(normalizeMedName('  Sertraline  ')).toBe('sertraline');
    });

    it('should remove punctuation', () => {
      expect(normalizeMedName('Zoloft®')).toBe('zoloft');
      expect(normalizeMedName('Prozac-50')).toBe('prozac 50');
    });

    it('should remove trailing dosage tokens', () => {
      expect(normalizeMedName('Zoloft 50mg')).toBe('zoloft');
      expect(normalizeMedName('Sertraline 100 mg')).toBe('sertraline');
      expect(normalizeMedName('Lexapro 10mg tablet')).toBe('lexapro');
    });

    it('should collapse whitespace', () => {
      expect(normalizeMedName('Zoloft   50mg')).toBe('zoloft');
      expect(normalizeMedName('Sertraline  100  mg')).toBe('sertraline');
    });

    it('should handle empty strings', () => {
      expect(normalizeMedName('')).toBe('');
      expect(normalizeMedName('   ')).toBe('');
    });
  });

  describe('findMedCatalogItemById', () => {
    it('should resolve by stable catalogue id', () => {
      expect(findMedCatalogItemById('sertraline')?.genericName.toLowerCase()).toContain('sertraline');
      expect(findMedCatalogItemById('')).toBeNull();
      expect(findMedCatalogItemById('not-in-catalog')).toBeNull();
    });
  });

  describe('findMedCatalogItemByName', () => {
    it('should match generic name', () => {
      const result = findMedCatalogItemByName('sertraline');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('sertraline');
      expect(result?.genericName).toBe('Sertraline');
    });

    it('should match brand name', () => {
      const result = findMedCatalogItemByName('Zoloft');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('sertraline');
    });

    it('should match with dosage', () => {
      const result = findMedCatalogItemByName('Zoloft® 50mg');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('sertraline');
    });

    it('should match case-insensitive', () => {
      const result = findMedCatalogItemByName('ZOLOFT');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('sertraline');
    });

    it('should return null for unknown medication', () => {
      const result = findMedCatalogItemByName('UnknownMed123');
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = findMedCatalogItemByName('');
      expect(result).toBeNull();
    });

    it('matches salt suffix form deterministically (exact keys only)', () => {
      const escitalopram = findMedCatalogItemByName('Escitalopram oxalate');
      expect(escitalopram?.id).toBe('escitalopram');
    });

    it('matches governed alias strings exactly', () => {
      expect(findMedCatalogItemByName('Lithium carbonate')?.id).toBe('lithium');
    });

    it('does not substring-fuzzy match partial medication names', () => {
      expect(findMedCatalogItemByName('Sertra')).toBeNull();
      expect(findMedCatalogItemByName('Zol')).toBeNull();
    });

    it('matches batch seed generic names', () => {
      expect(findMedCatalogItemByName('Paroxetine')?.id).toBe('paroxetine');
      expect(findMedCatalogItemByName('Quetiapine')?.id).toBe('quetiapine');
    });

    it('matches batch 2 OTC/common medications exactly', () => {
      expect(findMedCatalogItemByName('Ibuprofen')?.category).toBe('nsaid');
      expect(findMedCatalogItemByName('Acetaminophen')?.category).toBe('pain_analgesic');
      expect(findMedCatalogItemByName('Tylenol')?.id).toBe('acetaminophen');
    });

    it('does not match substring brand fragments', () => {
      expect(findMedCatalogItemByName('Advil')).not.toBeNull();
      expect(findMedCatalogItemByName('dvil')).toBeNull();
    });
  });

  describe('stripMedicationSaltSuffix', () => {
    it('strips common salt tokens used for second-pass lookup', () => {
      const n = normalizeMedName('Escitalopram oxalate');
      expect(stripMedicationSaltSuffix(n)).toBe('escitalopram');
    });
  });

  describe('getCategoryLabel / insight-related labels', () => {
    it('maps taxonomy display groups introduced for precision', () => {
      expect(getCategoryLabel('movement_adjunct')).toBe('Movement-related adjunct');
      expect(getCategoryLabel('alpha_blocker')).toBe('Alpha blocker');
      expect(getCategoryLabel('antithyroid')).toBe('Antithyroid therapy');
      expect(getCategoryLabel('unknown_slug_here')).toBe('unknown slug here');
    });

    it('maps illness_context state tag for catalog enrichment', () => {
      expect(formatStateImpactTagLabel('illness_context')).toBe('Illness / recovery context');
    });
  });

  describe('formatEffectTagLabel / formatStateImpactTagLabel', () => {
    it('maps known tags and falls back for unknown', () => {
      expect(formatEffectTagLabel('sleep_relevant')).toBe('Sleep patterns');
      expect(formatStateImpactTagLabel('sleep_interpretation')).toBe('Sleep interpretation');
      expect(formatEffectTagLabel('custom_tag_here')).toBe('custom tag here');
    });
  });

  describe('extended catalog fields (optional)', () => {
    it('sertraline includes optional enrichment when present', () => {
      const sertraline = findMedCatalogItemByName('Sertraline');
      expect(sertraline?.activeIngredients?.length).toBeGreaterThan(0);
      expect(sertraline?.effectTags?.length).toBeGreaterThan(0);
      expect(sertraline?.plainEnglishMechanism?.length).toBeGreaterThan(0);
    });

    it('backward compatibility: entries without new fields still load', () => {
      const fluoxetine = findMedCatalogItemByName('fluoxetine');
      expect(fluoxetine).not.toBeNull();
      expect(fluoxetine?.mechanism?.length).toBeGreaterThan(0);
    });
  });
});
