import { medsOnTrackText } from '@/lib/dashboard/utils';
import {
  computeAdherenceFromSchedule,
  isScheduledMed,
  type MedDoseLogForAdherence,
  type MedForSchedule,
} from '@/lib/medicationSchedulePolicy';

export const MED_ADHERENCE_WINDOW_DAYS = 7;

export type MedAdherenceOrbitStatus =
  | 'on_track'
  | 'attention'
  | 'no_logs'
  | 'unscheduled'
  | 'link';

export type MedAdherenceSnapshot = {
  hasScheduledMeds: boolean;
  scheduled: number;
  taken: number;
  /** Null when there are no scheduled meds, or when no doses have been logged in the window. */
  pct: number | null;
  headline: string;
  subline: string;
  orbitStatus: MedAdherenceOrbitStatus;
  /** Maps to LifecycleHero node status strings. */
  lifecycleStatus: string;
};

export function buildMedAdherenceSnapshot(
  logs: MedDoseLogForAdherence[],
  meds: MedForSchedule[],
  days = MED_ADHERENCE_WINDOW_DAYS,
): MedAdherenceSnapshot {
  const hasScheduledMeds = meds.some((m) => isScheduledMed(m));

  if (!meds.length) {
    return {
      hasScheduledMeds: false,
      scheduled: 0,
      taken: 0,
      pct: null,
      headline: 'Add a medication',
      subline: 'Track doses and reminders in one place',
      orbitStatus: 'link',
      lifecycleStatus: 'link',
    };
  }

  if (!hasScheduledMeds) {
    return {
      hasScheduledMeds: false,
      scheduled: 0,
      taken: 0,
      pct: null,
      headline: 'As-needed meds',
      subline: 'Log doses when you take them',
      orbitStatus: 'unscheduled',
      lifecycleStatus: 'steady',
    };
  }

  const { scheduled, taken, pct: rawPct } = computeAdherenceFromSchedule(logs, meds, days);

  if (taken === 0) {
    return {
      hasScheduledMeds: true,
      scheduled,
      taken: 0,
      pct: null,
      headline: 'No doses logged yet',
      subline:
        scheduled > 0
          ? `${scheduled} dose${scheduled === 1 ? '' : 's'} expected this week`
          : 'Tap Take when you dose',
      orbitStatus: 'no_logs',
      lifecycleStatus: 'no_logs',
    };
  }

  const pct = rawPct;
  const track = medsOnTrackText(pct);

  return {
    hasScheduledMeds: true,
    scheduled,
    taken,
    pct,
    headline: track.valueText,
    subline: `${taken}/${scheduled} doses · ${track.helper}`,
    orbitStatus: pct >= 70 ? 'on_track' : 'attention',
    lifecycleStatus: pct >= 70 ? 'on track' : 'attention',
  };
}

/** User-facing adherence line for cards and analytics (never shows bare 0% without logs). */
export function formatAdherencePctLine(snapshot: MedAdherenceSnapshot, windowLabel = '7-day'): string {
  if (!snapshot.hasScheduledMeds) {
    return snapshot.headline;
  }
  if (snapshot.pct == null) {
    return snapshot.headline;
  }
  return `${snapshot.pct}% (${snapshot.taken}/${snapshot.scheduled})`;
}
