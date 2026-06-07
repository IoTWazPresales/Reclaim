import { useMemo } from 'react';
import { Alert } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listMeds,
  listMedDoseLogsMergedForMedLastNDays,
  listMoodCheckins,
  listSleepSessions,
  logMedDose,
  isPrnMed,
  isScheduledMed,
  computeAdherenceFromSchedule,
  type Med,
  type MedDoseLog,
  type MoodCheckin,
  type SleepSession,
} from '@/lib/api';
import { findMedCatalogItemByName } from '@/lib/medCatalog';
import { computeMedContextNotes, type MedContextInput } from '@/lib/medIntelligence';
import {
  computeAdherenceSignals,
  computeMoodSignals,
  computeSleepSignals,
} from '@/lib/medDetailSignals';
import { resolveMedProfileMode } from '@/components/meds/medProfileMode';
import type {
  MedDetailContextValue,
  MedDetailDoseHistory,
  MedDetailLogActions,
  MedDetailScheduleView,
  MedDoseRow,
} from '@/components/meds/medDetailTypes';
import { groupDoseLogsByDay } from '@/components/meds/medDoseLogUtils';
import { isMedDoseLogRelatedQueryKey } from '@/lib/sync/postReplayQueryInvalidation';

const EMPTY_DOMAIN_SIGNALS = {} as const;

function buildScheduleView(med: Med): MedDetailScheduleView {
  const isPrn = isPrnMed(med);
  return {
    isPrn,
    hasSchedule: isScheduledMed(med),
    timesLabel: (med.schedule as { times?: string[] })?.times?.join(', ') ?? '—',
    daysLabel: (med.schedule as { days?: number[] })?.days?.join(',') ?? '—',
  };
}

function buildDoseHistory(
  med: Med,
  medLogs: MedDoseRow[],
  logsLoading: boolean,
): MedDetailDoseHistory {
  const taken = medLogs.filter((l) => l.status === 'taken');
  let lastTakenMs = 0;
  for (const l of taken) {
    const t = new Date(l.taken_at ?? l.scheduled_for ?? '').getTime();
    if (Number.isFinite(t) && t > lastTakenMs) lastTakenMs = t;
  }

  return {
    logsLoading,
    byDay: groupDoseLogsByDay(medLogs),
    takenCount30: taken.length,
    lastTakenLabel: lastTakenMs ? new Date(lastTakenMs).toLocaleString() : null,
    scheduleAdherence30: isScheduledMed(med)
      ? computeAdherenceFromSchedule(medLogs as MedDoseLog[], [med], 30)
      : null,
  };
}

export type UseMedDetailContextResult = MedDetailContextValue & MedDetailLogActions;

/**
 * Per-med detail context — fetches user med, logs, mood/sleep, and catalogue match.
 * Output shape is frozen for Phases 2–5.
 */
export function useMedDetailContext(medId: string): UseMedDetailContextResult {
  const qc = useQueryClient();

  const medsQ = useQuery({ queryKey: ['meds'], queryFn: () => listMeds() });
  const logsQ = useQuery({
    queryKey: ['med_logs:30', medId],
    queryFn: () => listMedDoseLogsMergedForMedLastNDays(medId, 30),
    enabled: !!medId,
  });
  const moodQ = useQuery({ queryKey: ['mood_checkins:30'], queryFn: () => listMoodCheckins(30) });
  const sleepQ = useQuery({ queryKey: ['sleep_sessions:14'], queryFn: () => listSleepSessions(14) });

  const med: Med | undefined = useMemo(() => {
    const arr = (medsQ.data ?? []) as Med[];
    return arr.find((m) => m.id === medId);
  }, [medsQ.data, medId]);

  const medLogs = useMemo(() => (logsQ.data ?? []) as MedDoseRow[], [logsQ.data]);

  const logTakenMut = useMutation({
    mutationFn: () => {
      const iso = new Date().toISOString();
      return logMedDose({ med_id: medId, status: 'taken', scheduled_for: iso });
    },
    onSuccess: () => {
      qc.invalidateQueries({ predicate: (q) => isMedDoseLogRelatedQueryKey(q.queryKey) });
    },
    onError: (e: { message?: string }) => Alert.alert('Log error', e?.message ?? 'Failed to log dose'),
  });

  const moodSignals = useMemo(
    () => computeMoodSignals((moodQ.data ?? []) as MoodCheckin[]),
    [moodQ.data],
  );

  const sleepSignals = useMemo(
    () => computeSleepSignals((sleepQ.data ?? []) as SleepSession[]),
    [sleepQ.data],
  );

  const adherenceSignals = useMemo(() => computeAdherenceSignals(medLogs), [medLogs]);

  const catalogMatch = useMemo(
    () => (med ? findMedCatalogItemByName(med.name) : null),
    [med],
  );

  const contextNotes = useMemo(() => {
    if (!med) return [];

    const stressTags = new Set(['stressed', 'overwhelmed', 'anxious', 'stress']);
    const hasStressTag = moodSignals.tags.some((t) => stressTags.has(t.toLowerCase()));
    const prnMed = isPrnMed(med);

    const input: MedContextInput = {
      medName: med.name,
      catalog: catalogMatch,
      mood: {
        latest: moodSignals.latest,
        trend3dPct: moodSignals.trend3dPct,
        tags: moodSignals.tags,
      },
      sleep: {
        lastNightHours: sleepSignals.lastNightHours,
        avg7dHours: sleepSignals.avg7dHours,
        sparseData: sleepSignals.sparseData,
      },
      meds: prnMed
        ? undefined
        : {
            adherencePct7d: adherenceSignals.adherencePct7d,
            missedDoses3d: adherenceSignals.missedDoses3d,
            hasUnknownStatus: adherenceSignals.hasUnknownStatus,
          },
      flags: {
        stress: hasStressTag,
      },
    };

    return computeMedContextNotes(input);
  }, [med, catalogMatch, moodSignals, sleepSignals, adherenceSignals]);

  const schedule: MedDetailScheduleView = useMemo(
    () =>
      med
        ? buildScheduleView(med)
        : { isPrn: false, hasSchedule: false, timesLabel: '—', daysLabel: '—' },
    [med],
  );

  const doseHistory: MedDetailDoseHistory = useMemo(
    () =>
      med
        ? buildDoseHistory(med, medLogs, logsQ.isLoading)
        : {
            logsLoading: logsQ.isLoading,
            byDay: [],
            takenCount30: 0,
            lastTakenLabel: null,
            scheduleAdherence30: null,
          },
    [med, medLogs, logsQ.isLoading],
  );

  const profileMode = resolveMedProfileMode(schedule.isPrn, catalogMatch);

  const medsLoading = medsQ.isLoading;
  const medNotFound = !medsLoading && !!medId && !med;

  return {
    med,
    catalogMatch,
    profileMode,
    schedule,
    doseHistory,
    contextNotes,
    domainSignals: EMPTY_DOMAIN_SIGNALS,
    medsLoading,
    medNotFound,
    logTaken: () => logTakenMut.mutate(),
    logTakenPending: logTakenMut.isPending,
  };
}
