import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listMergedMedDoseLogsLastNDays, listMeds, type Med } from '@/lib/api';
import {
  buildMedAdherenceSnapshot,
  MED_ADHERENCE_WINDOW_DAYS,
  type MedAdherenceSnapshot,
} from '@/lib/meds/medAdherenceSnapshot';
import { MED_LOGS_7D_QUERY_KEY } from '@/lib/meds/medAdherenceQueryKeys';
import { useAuth } from '@/providers/AuthProvider';

export function useMedAdherence(days = MED_ADHERENCE_WINDOW_DAYS): {
  snapshot: MedAdherenceSnapshot;
  isLoading: boolean;
  meds: Med[];
  logs: Awaited<ReturnType<typeof listMergedMedDoseLogsLastNDays>>;
} {
  const { session } = useAuth();
  const enabled = !!session;

  const medsQ = useQuery({
    queryKey: ['meds'],
    queryFn: () => listMeds(),
    enabled,
    staleTime: 60_000,
  });

  const logsQ = useQuery({
    queryKey: days === 7 ? [...MED_LOGS_7D_QUERY_KEY] : [`meds:logs:${days}d`],
    queryFn: () => listMergedMedDoseLogsLastNDays(days),
    enabled,
    staleTime: 60_000,
  });

  const meds = (medsQ.data ?? []) as Med[];
  const logs = logsQ.data ?? [];

  const snapshot = useMemo(
    () => buildMedAdherenceSnapshot(logs, meds, days),
    [logs, meds, days],
  );

  return {
    snapshot,
    isLoading: medsQ.isLoading || logsQ.isLoading,
    meds,
    logs,
  };
}
