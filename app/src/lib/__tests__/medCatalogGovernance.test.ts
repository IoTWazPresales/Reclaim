import { describe, it, expect } from 'vitest';
import { loadMedCatalog } from '../medCatalog';
import {
  validateMedCatalog,
  ALLOWED_EFFECT_TAGS,
  ALLOWED_STATE_IMPACT_TAGS,
  EFFECT_TAG_TO_DOMAIN,
  STATE_IMPACT_TAG_TO_DOMAIN,
  type MedCatalogRow,
} from '../medCatalogGovernance';

describe('medCatalogGovernance', () => {
  it('merged static catalog passes governance validation', () => {
    const issues = validateMedCatalog(loadMedCatalog() as MedCatalogRow[]);
    expect(issues).toEqual([]);
  });

  it('reports duplicate normalized generic keys', () => {
    const issues = validateMedCatalog([
      {
        id: 'a',
        genericName: 'Foo',
        category: 'x',
        mechanism: 'Educational context.',
        confidence: 0.5,
        safetyNote: 'Educational only.',
        sourceNote: 'test',
      },
      {
        id: 'b',
        genericName: 'Foo',
        category: 'x',
        mechanism: 'Educational context.',
        confidence: 0.5,
        safetyNote: 'Educational only.',
        sourceNote: 'test',
      },
    ] as MedCatalogRow[]);
    expect(issues.some((i) => i.message.includes('Duplicate'))).toBe(true);
  });

  it('flags banned instructional phrasing', () => {
    const issues = validateMedCatalog([
      {
        id: 'x',
        genericName: 'X',
        category: 'x',
        mechanism: 'Please stop taking this medication.',
        confidence: 0.5,
        safetyNote: 'Educational only.',
        sourceNote: 'test',
      },
    ] as MedCatalogRow[]);
    expect(issues.some((i) => i.message.includes('Banned phrase'))).toBe(true);
  });

  it('flags confidence outside [0, 1]', () => {
    const issues = validateMedCatalog([
      {
        id: 'x',
        genericName: 'X',
        category: 'x',
        mechanism: 'Educational context.',
        confidence: 2,
        safetyNote: 'Educational only.',
        sourceNote: 'test',
      },
    ] as MedCatalogRow[]);
    expect(issues.some((i) => /confidence/.test(i.message))).toBe(true);
  });

  it('flags unknown effectTags entries', () => {
    const issues = validateMedCatalog([
      {
        id: 'x',
        genericName: 'X',
        category: 'x',
        mechanism: 'Educational context.',
        confidence: 0.5,
        safetyNote: 'Educational only.',
        sourceNote: 'test',
        effectTags: ['not_a_catalog_tag'],
      },
    ] as MedCatalogRow[]);
    expect(issues.some((i) => i.message.includes('effectTags'))).toBe(true);
  });

  it('maps every allowed catalogue tag to a fusion domain', () => {
    for (const tag of ALLOWED_EFFECT_TAGS) {
      expect(EFFECT_TAG_TO_DOMAIN[tag]).toBeTruthy();
    }
    for (const tag of ALLOWED_STATE_IMPACT_TAGS) {
      expect(STATE_IMPACT_TAG_TO_DOMAIN[tag]).toBeTruthy();
    }
  });

  it('requires sourceNote for enriched rows', () => {
    const issues = validateMedCatalog([
      {
        id: 'x',
        genericName: 'X',
        category: 'x',
        mechanism: 'Educational context.',
        confidence: 0.5,
        safetyNote: 'Educational only.',
      },
    ] as MedCatalogRow[]);
    expect(issues.some((i) => i.message.includes('sourceNote'))).toBe(true);
  });
});
