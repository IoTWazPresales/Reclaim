import { describe, expect, it, beforeEach } from 'vitest';
import { resetMedCatalogLookupCache } from '@/lib/medCatalog';
import {
  enrichMedsWithCatalogMatchKeys,
  resolveMedCatalogMatch,
} from '@/lib/medCatalogMatch';

describe('medCatalogMatch', () => {
  beforeEach(() => {
    resetMedCatalogLookupCache();
  });

  it('resolves catalogue by persisted catalog_match_key without name lookup', () => {
    const match = resolveMedCatalogMatch({
      name: 'Typo Name That Does Not Match',
      catalog_match_key: 'sertraline',
    });
    expect(match?.id).toBe('sertraline');
  });

  it('falls back to exact-name match when key is missing', () => {
    const match = resolveMedCatalogMatch({ name: 'Sertraline' });
    expect(match?.id).toBe('sertraline');
  });

  it('falls back to name when persisted key is stale', () => {
    const match = resolveMedCatalogMatch({
      name: 'Sertraline',
      catalog_match_key: 'not_a_real_catalog_id',
    });
    expect(match?.id).toBe('sertraline');
  });

  it('enriches meds missing catalog_match_key in memory', () => {
    const { meds, pendingBackfill } = enrichMedsWithCatalogMatchKeys([
      { id: 'm1', name: 'Zoloft' },
      { id: 'm2', name: 'Unknown Med XYZ' },
    ]);

    expect(meds[0].catalog_match_key).toBe('sertraline');
    expect(meds[1].catalog_match_key).toBeUndefined();
    expect(pendingBackfill).toEqual([{ id: 'm1', catalog_match_key: 'sertraline' }]);
  });
});
