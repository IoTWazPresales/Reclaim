import type { Med, MedDoseLog } from '@/lib/api';
import type { MedCatalogItem } from '@/lib/medCatalog';
import type { MedDomainSignals } from '@/lib/medCatalogFusion';
import type { MedContextNote } from '@/lib/medIntelligence';

export type { MedDomainSignals } from '@/lib/medCatalogFusion';

export type MedDoseRow = MedDoseLog & {
  scheduled_for?: string | null;
  taken_at?: string | null;
  created_at?: string | null;
};

export type MedProfileMode = 'prn' | 'curated' | 'general';

export type MedDetailScheduleView = {
  isPrn: boolean;
  hasSchedule: boolean;
  timesLabel: string;
  daysLabel: string;
};

export type MedDetailScheduleAdherence = {
  taken: number;
  scheduled: number;
  pct: number;
};

export type MedDetailDoseHistory = {
  logsLoading: boolean;
  byDay: [string, MedDoseRow[]][];
  takenCount30: number;
  lastTakenLabel: string | null;
  scheduleAdherence30: MedDetailScheduleAdherence | null;
};

/** Final hook output shape (frozen through Phase 5). */
export type MedDetailContextValue = {
  med: Med | undefined;
  catalogMatch: MedCatalogItem | null;
  profileMode: MedProfileMode;
  schedule: MedDetailScheduleView;
  doseHistory: MedDetailDoseHistory;
  contextNotes: MedContextNote[];
  domainSignals: MedDomainSignals;
  medsLoading: boolean;
  medNotFound: boolean;
};

export type MedDetailLogActions = {
  logTaken: () => void;
  logTakenPending: boolean;
};
