import { describe, it, expect } from 'vitest';
import { loadMedCatalog } from '../medCatalog';
import {
  buildMedCatalogQaSummary,
  formatMedCatalogQaReport,
} from '../medCatalogQa';
import type { MedCatalogRow } from '../medCatalogGovernance';

describe('medCatalogQa', () => {
  it('builds a summary with zero governance issues for merged catalog', () => {
    const s = buildMedCatalogQaSummary(loadMedCatalog() as MedCatalogRow[]);
    expect(s.totalRows).toBeGreaterThan(100);
    expect(s.validationIssues).toHaveLength(0);
    expect(Object.keys(s.byCategory).length).toBeGreaterThan(5);
  });

  it('formatted report includes row totals and confidence bands', () => {
    const s = buildMedCatalogQaSummary(loadMedCatalog() as MedCatalogRow[]);
    const text = formatMedCatalogQaReport(s);
    expect(text).toMatch(/Total merged rows:/);
    expect(text).toMatch(/Confidence bands:/);
    expect(text).toMatch(/Governance validation issues: 0/);
  });
});
