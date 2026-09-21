import { expect, it } from 'vitest';
import { loadMedCatalog, findMedCatalogItemByName } from '../medCatalog';
import { isReviewedMedCatalogItem, medCatalogCurationIssue, medCatalogReviewLabel, type MedCatalogCuration } from '../medCatalogCuration';
import { validateMedCatalog } from '../medCatalogGovernance';
import { resolveMedProfileMode } from '@/components/meds/medProfileMode';
import { resolveCatalogEducationMode } from '@/components/meds/medDetailPresentation';

const row = () => findMedCatalogItemByName('sertraline')!;
const curation: MedCatalogCuration = { tier: 'reviewed', review: {
  reviewer: 'synthetic-test-reviewer', reviewedOn: '2026-09-01', evidenceRef: 'test-fixture-only',
} };

it('does not invent review provenance for any of the 357 existing rows', () => {
  const catalog = loadMedCatalog();
  expect(catalog).toHaveLength(357);
  expect(catalog.every(item => !isReviewedMedCatalogItem(item))).toBe(true);
  const highConfidence = { ...row(), confidence: 1, sourceNote: 'Curated reviewed summary' };
  expect(isReviewedMedCatalogItem(highConfidence)).toBe(false);
});

it('requires explicit reviewed tier and complete provenance for both UI surfaces', () => {
  const reviewed = { ...row(), curation };
  expect(isReviewedMedCatalogItem(reviewed)).toBe(true);
  expect(resolveMedProfileMode(false, reviewed)).toBe('curated');
  expect(resolveCatalogEducationMode(reviewed)).toBe('curated');
  expect(resolveMedProfileMode(true, reviewed)).toBe('prn');
  expect(medCatalogReviewLabel(reviewed)).toBe('Reviewed educational reference');
  expect(isReviewedMedCatalogItem({ ...row(), curation: { ...curation, tier: 'seed' } })).toBe(false);
});

it.each([
  null, { tier: 'unknown' }, { tier: 'reviewed' },
  { tier: 'reviewed', review: { ...curation.review, reviewer: ' ' } },
  { tier: 'reviewed', review: { ...curation.review, evidenceRef: '' } },
  { tier: 'reviewed', review: { ...curation.review, reviewedOn: 'yesterday' } },
  { tier: 'reviewed', review: { ...curation.review, reviewedOn: '2026-02-30' } },
  { tier: 'reviewed', review: { ...curation.review, reviewedOn: '2999-01-01' } },
])('fails closed and reports malformed review metadata %j', bad => {
  const item = { ...row(), curation: bad as unknown as MedCatalogCuration };
  expect(isReviewedMedCatalogItem(item)).toBe(false);
  expect(medCatalogCurationIssue(item)).toBeTruthy();
  expect(validateMedCatalog([item]).some(issue => /curation|reviewedOn/.test(issue.message))).toBe(true);
  expect(resolveMedProfileMode(false, item)).toBe('reference');
});
