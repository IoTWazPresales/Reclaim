import type { Med } from '@/lib/api';
import {
  findMedCatalogItemById,
  findMedCatalogItemByName,
  resolveCatalogMatchKeyForName,
  type MedCatalogItem,
} from '@/lib/medCatalog';

export type MedCatalogMatchInput = {
  name?: string;
  catalog_match_key?: string | null;
};

/**
 * Resolve catalogue row for a user med — persisted key first, exact-name fallback.
 * Hot render paths should use this instead of `findMedCatalogItemByName`.
 */
export function resolveMedCatalogMatch(med: MedCatalogMatchInput): MedCatalogItem | null {
  if (med.catalog_match_key) {
    const byKey = findMedCatalogItemById(med.catalog_match_key);
    if (byKey) return byKey;
  }
  if (!med.name?.trim()) return null;
  return findMedCatalogItemByName(med.name);
}

export type MedCatalogMatchBackfillRow = {
  id: string;
  catalog_match_key: string;
};

/**
 * Enrich meds missing `catalog_match_key` in memory; returns rows that should be persisted.
 */
export function enrichMedsWithCatalogMatchKeys(meds: Med[]): {
  meds: Med[];
  pendingBackfill: MedCatalogMatchBackfillRow[];
} {
  const pendingBackfill: MedCatalogMatchBackfillRow[] = [];
  const enriched = meds.map((m) => {
    if (m.catalog_match_key || !m.id) return m;
    const key = resolveCatalogMatchKeyForName(m.name);
    if (!key) return m;
    pendingBackfill.push({ id: m.id, catalog_match_key: key });
    return { ...m, catalog_match_key: key };
  });
  return { meds: enriched, pendingBackfill };
}
