/** Explicit review provenance; never infer this from content/confidence. */
export type MedCatalogCuration = {
  tier: 'seed' | 'reviewed';
  review?: { reviewer: string; reviewedOn: string; evidenceRef: string };
};
type CurationRow = { curation?: MedCatalogCuration };
export const MED_CATALOG_REVIEW_LABELS = {
  reviewed: 'Reviewed educational reference',
  unreviewed: 'Catalogue reference (not reviewed)',
} as const;

const nonempty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

export function medCatalogCurationIssue(item: CurationRow): string | null {
  const curation = item.curation;
  if (curation === undefined) return null; // Legacy rows are unreviewed seeds.
  if (!curation || !['seed', 'reviewed'].includes(curation.tier)) return 'curation tier must be seed or reviewed';
  if (curation.tier === 'seed') return null;
  const review = curation.review;
  if (!review || !nonempty(review.reviewer) || !nonempty(review.evidenceRef)) {
    return 'reviewed curation requires reviewer and evidenceRef';
  }
  const date = review.reviewedOn;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'reviewed curation requires reviewedOn YYYY-MM-DD';
  const parsed = Date.parse(date);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== date) return 'reviewedOn must be a valid calendar date';
  if (date > new Date().toISOString().slice(0, 10)) return 'reviewedOn cannot be a future UTC date';
  return null;
}

export function isReviewedMedCatalogItem(item: CurationRow | null): boolean {
  return !!item && item.curation?.tier === 'reviewed' && medCatalogCurationIssue(item) === null;
}

export function medCatalogReviewLabel(item: CurationRow): string {
  return isReviewedMedCatalogItem(item) ? MED_CATALOG_REVIEW_LABELS.reviewed : MED_CATALOG_REVIEW_LABELS.unreviewed;
}
