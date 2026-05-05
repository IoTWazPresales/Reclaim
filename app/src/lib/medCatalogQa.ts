/**
 * Dev-oriented catalog coverage summary (counts + validation issues).
 * Not used at runtime in the mobile UI.
 */
import type { CatalogValidationIssue } from './medCatalogGovernance';
import { validateMedCatalog, type MedCatalogRow } from './medCatalogGovernance';

export type MedCatalogQaSummary = {
  totalRows: number;
  byCategory: Record<string, number>;
  /** Top 25 medicationClass strings by frequency (missing bucketed as "(none)"). */
  topMedicationClasses: [string, number][];
  confidenceBands: { lt06: number; gte06lt08: number; gte08: number };
  stateImpactTagCounts: Record<string, number>;
  optionalFieldGaps: {
    missingPlainEnglishMechanism: number;
    missingCommonUses: number;
    missingOnsetWindow: number;
    missingDurationWindow: number;
  };
  validationIssues: CatalogValidationIssue[];
};

function increment(map: Record<string, number>, key: string): void {
  map[key] = (map[key] ?? 0) + 1;
}

/**
 * Build aggregate statistics for merged catalog rows (includes governance validation issues).
 */
export function buildMedCatalogQaSummary(entries: MedCatalogRow[]): MedCatalogQaSummary {
  const validationIssues = validateMedCatalog(entries);
  const byCategory: Record<string, number> = {};
  const medClassCounts: Record<string, number> = {};
  const stateImpactTagCounts: Record<string, number> = {};
  let lt06 = 0;
  let gte06lt08 = 0;
  let gte08 = 0;
  let missingPlainEnglishMechanism = 0;
  let missingCommonUses = 0;
  let missingOnsetWindow = 0;
  let missingDurationWindow = 0;

  for (const row of entries) {
    increment(byCategory, row.category || '(missing)');
    const mc = row.medicationClass?.trim() || '(none)';
    increment(medClassCounts, mc);
    const c = row.confidence ?? 0;
    if (c < 0.6) lt06 += 1;
    else if (c < 0.8) gte06lt08 += 1;
    else gte08 += 1;
    if (!row.plainEnglishMechanism?.trim()) missingPlainEnglishMechanism += 1;
    if (!row.commonUses?.length) missingCommonUses += 1;
    if (!row.onsetWindow?.trim()) missingOnsetWindow += 1;
    if (!row.durationWindow?.trim()) missingDurationWindow += 1;
    for (const t of row.stateImpactTags ?? []) {
      increment(stateImpactTagCounts, t);
    }
  }

  const topMedicationClasses = Object.entries(medClassCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25);

  return {
    totalRows: entries.length,
    byCategory,
    topMedicationClasses,
    confidenceBands: { lt06, gte06lt08, gte08 },
    stateImpactTagCounts,
    optionalFieldGaps: {
      missingPlainEnglishMechanism,
      missingCommonUses,
      missingOnsetWindow,
      missingDurationWindow,
    },
    validationIssues,
  };
}

/** Plain-text report suitable for terminal / paste into PR description. */
export function formatMedCatalogQaReport(s: MedCatalogQaSummary): string {
  const lines: string[] = [];
  lines.push('MedicationKnowledge catalog QA summary');
  lines.push(`Total merged rows: ${s.totalRows}`);
  lines.push('');
  lines.push('Rows by category (display grouping slug):');
  for (const [k, v] of Object.entries(s.byCategory).sort((a, b) => b[1] - a[1])) {
    lines.push(`  ${k}: ${v}`);
  }
  lines.push('');
  lines.push('Top medicationClass labels:');
  for (const [k, v] of s.topMedicationClasses) {
    lines.push(`  ${k}: ${v}`);
  }
  lines.push('');
  lines.push('Confidence bands:');
  lines.push(`  < 0.6: ${s.confidenceBands.lt06}`);
  lines.push(`  0.6–0.8: ${s.confidenceBands.gte06lt08}`);
  lines.push(`  ≥ 0.8: ${s.confidenceBands.gte08}`);
  lines.push('');
  lines.push('State-impact tags:');
  for (const [k, v] of Object.entries(s.stateImpactTagCounts).sort((a, b) => b[1] - a[1])) {
    lines.push(`  ${k}: ${v}`);
  }
  lines.push('');
  lines.push('Optional field gaps (informational):');
  lines.push(`  missing plainEnglishMechanism: ${s.optionalFieldGaps.missingPlainEnglishMechanism}`);
  lines.push(`  missing commonUses: ${s.optionalFieldGaps.missingCommonUses}`);
  lines.push(`  missing onsetWindow: ${s.optionalFieldGaps.missingOnsetWindow}`);
  lines.push(`  missing durationWindow: ${s.optionalFieldGaps.missingDurationWindow}`);
  lines.push('');
  const issueCount = s.validationIssues.length;
  lines.push(`Governance validation issues: ${issueCount}`);
  if (issueCount > 0) {
    const byId = new Map<string, string[]>();
    for (const iss of s.validationIssues) {
      const arr = byId.get(iss.id) ?? [];
      arr.push(iss.message);
      byId.set(iss.id, arr);
    }
    for (const [id, msgs] of [...byId.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      lines.push(`  ${id}:`);
      for (const m of msgs) lines.push(`    - ${m}`);
    }
  }
  return lines.join('\n');
}
