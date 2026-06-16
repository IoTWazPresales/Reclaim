import { describe, it, expect } from 'vitest';
import { loadMedCatalog } from '../medCatalog';
import { buildMedCatalogQaSummary, formatMedCatalogQaReport } from '../medCatalogQa';
import type { MedCatalogRow } from '../medCatalogGovernance';

/** Dev CLI-style output; run: npx vitest run src/lib/__tests__/medCatalogQa.cli.test.ts --pool=threads */
describe('medCatalogQa CLI output', () => {
  it('prints QA report to stdout', () => {
    const s = buildMedCatalogQaSummary(loadMedCatalog() as MedCatalogRow[]);
    console.log('\n' + formatMedCatalogQaReport(s) + '\n');
    expect(s.validationIssues.length).toBe(0);
  });
});
