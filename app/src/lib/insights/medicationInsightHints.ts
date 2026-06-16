/**
 * Conservative medication context lines for insights (wording only — no scoring).
 * Avoid causal medical claims and treatment directives (see tests for forbidden patterns).
 */

import type { MedInsightDomain } from '@/lib/medCatalogGovernance';
import { resolveMedCatalogMatch } from '@/lib/medCatalogMatch';
import {
  isPrnMed,
  isScheduledMed,
  type MedSchedule,
} from '@/lib/medicationSchedulePolicy';

export type MedLite = {
  id?: string;
  name?: string;
  schedule?: MedSchedule;
  catalog_match_key?: string | null;
};

export type MedLogLite = {
  med_id?: string;
  status: string;
  taken_at?: string | null;
  scheduled_for?: string | null;
  created_at?: string | null;
};

function logTimestampMs(l: MedLogLite): number | null {
  const raw = l.taken_at ?? l.scheduled_for ?? l.created_at;
  if (!raw) return null;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function medById(meds: MedLite[], id: string | undefined): MedLite | undefined {
  if (!id) return undefined;
  return meds.find((m) => m.id === id);
}

/** Local calendar day bounds for “today”. */
function todayWindow(): { start: number; end: number } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start: start.getTime(), end: end.getTime() };
}

function catalogLooksPainAdjacent(med: MedLite): boolean {
  if (!med.name?.trim()) return false;
  const item = resolveMedCatalogMatch(med);
  if (!item) return false;
  const blob = [...(item.effectTags ?? []), ...(item.stateImpactTags ?? [])]
    .join(' ')
    .toLowerCase();
  return (
    /\bpain\b/.test(blob) ||
    /\banalg/.test(blob) ||
    /\bnsaid\b/.test(blob) ||
    /\binflamm/.test(blob)
  );
}

/**
 * Short educational hints shown beside insights (max 3). No diagnoses or dosing advice.
 */
export function buildMedicationInsightHints(
  logs: MedLogLite[],
  meds: MedLite[],
  domainOverlap?: Partial<Record<MedInsightDomain, boolean>>,
): string[] {
  if (!meds.length && !logs.length) return [];

  const { start, end } = todayWindow();
  const hints: string[] = [];

  let prnTakenToday = false;
  let scheduledTakenToday = false;
  let prnPainAdjacentToday = false;

  for (const l of logs) {
    if (l.status !== 'taken') continue;
    const t = logTimestampMs(l);
    if (t === null || t < start || t > end) continue;

    const med = medById(meds, l.med_id);
    if (!med) continue;

    if (isPrnMed(med)) {
      prnTakenToday = true;
      if (catalogLooksPainAdjacent(med)) prnPainAdjacentToday = true;
    } else if (isScheduledMed(med)) {
      scheduledTakenToday = true;
    }
  }

  if (prnTakenToday) {
    hints.push(
      'You logged an as-needed medication today. Medication timing may be one factor to consider when interpreting today’s state.',
    );
    if (prnPainAdjacentToday) {
      hints.push(
        'Logged use of an as-needed medication that may relate to pain or inflammation — comfort and symptom ratings may be lower-confidence as context.',
      );
    }
    hints.push('Medication entries are treated as context, not proof of cause.');
  } else if (scheduledTakenToday) {
    hints.push(
      'You logged scheduled medication doses today. Patterns may add context when reading mood, sleep, or energy — not a verdict on cause.',
    );
  }

  if (domainOverlap?.pain && prnPainAdjacentToday) {
    hints.push(
      'Pain-adjacent medication context may apply alongside recent discomfort tags — interpretive context only.',
    );
  }

  const deduped: string[] = [];
  for (const h of hints) {
    if (!deduped.includes(h)) deduped.push(h);
  }

  return deduped;
}
