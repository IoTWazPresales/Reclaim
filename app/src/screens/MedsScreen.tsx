import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Alert,
  View,
  ScrollView,
  AppState,
  AppStateStatus,
  LayoutChangeEvent,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Button,
  Card,
  Chip,
  HelperText,
  IconButton,
  List,
  Portal,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { InformationalCard, SectionHeader } from '@/components/ui';
import { SchedulingCard } from '@/components/SchedulingCard';
import { useAppTheme } from '@/theme';
import {
  reclaimCompactCapsuleButton,
  reclaimGhostCapsuleButton,
  reclaimPrimaryCapsuleButton,
  reclaimTertiaryOutlineCapsuleButton,
  reclaimUtilityCardSurface,
} from '@/theme/reclaimVisualLanguage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  deleteMed,
  listMeds,
  parseSchedule,
  upsertMed,
  logMedDose,
  listMergedMedDoseLogsLastNDays,
  computeAdherenceFromSchedule,
  upcomingDoseTimes,
  isScheduledMed,
  isPrnMed,
  isPrnSchedule,
  type Med,
  type MedDoseLog,
} from '@/lib/api';
import {
  cancelAllReminders,
  cancelRemindersForMed,
  requestPermission,
} from '@/hooks/useNotifications';
import { useMedReminderScheduler } from '@/hooks/useMedReminderScheduler';
import { rescheduleRefillRemindersIfEnabled } from '@/lib/refillReminders';
import { logger } from '@/lib/logger';
import { isMedDoseLogRelatedQueryKey } from '@/lib/sync/postReplayQueryInvalidation';
import { InsightCard } from '@/components/InsightCard';
import { MedicationContextFootnotes } from '@/components/MedicationContextFootnotes';
import { useScientificInsights } from '@/providers/InsightsProvider';
import { logTelemetry } from '@/lib/telemetry';
import { useInsightForScreen } from '@/lib/insights/useInsightForScreen';
import type { InsightScope } from '@/lib/insights/pickInsightForScreen';
import { useAuth } from '@/providers/AuthProvider';
import { MedsHero, type MedsHeroState } from '@/components/dashboard/MedsHero';

const LAST_SCHEDULE_KEY = '@reclaim/meds:lastScheduleAt:v1';
const REMINDERS_DISABLED_KEY = '@reclaim/meds:remindersDisabled:v1';

/** Stable preferred scopes for MedsScreen (avoids new array ref every render) */
const MEDS_PREFERRED_SCOPES: InsightScope[] = ['meds', 'global'];

/* ---------- Small date helpers ---------- */
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const endOfToday = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
};
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/* ---------- Local helpers for “Due Today” generation ---------- */
function hhmmToDate(base: Date, hhmm: string) {
  const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10));
  const d = new Date(base);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}
function getTodaysDoses(schedule: { times: string[]; days: number[] } | undefined, ref = new Date()) {
  if (!schedule?.times?.length || !schedule?.days?.length) return [];
  // Your days are 1..7 (Mon..Sun). JS getDay(): Sun=0..Sat=6.
  const jsDay = ref.getDay(); // 0..6
  const appDay = jsDay === 0 ? 7 : jsDay; // 1..7
  if (!schedule.days.includes(appDay)) return [];
  return schedule.times.map((t) => hhmmToDate(ref, t));
}

/* ---------- COMPAT: some logs may have scheduled_for/created_at ---------- */
type MedDoseLogCompat = MedDoseLog & { scheduled_for?: string | null; created_at?: string | null };
function logWhenISO(l: MedDoseLogCompat): string {
  return l.scheduled_for ?? l.taken_at ?? l.created_at ?? new Date().toISOString();
}
function looseDate(l: MedDoseLogCompat): Date {
  return new Date(logWhenISO(l));
}

const MED_APP_DAYS = [1, 2, 3, 4, 5, 6, 7] as const;
const MED_DAY_LABEL: Record<number, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  7: 'Sun',
};
function defaultMedDayPick(): Record<number, boolean> {
  return Object.fromEntries(MED_APP_DAYS.map((d) => [d, true])) as Record<number, boolean>;
}
function medTimeSlotsValid(slots: string[]) {
  return slots.some((s) => /^\d{1,2}:\d{2}$/.test(s.trim()));
}
function medDaysPickValid(pick: Record<number, boolean>) {
  return MED_APP_DAYS.some((d) => pick[d]);
}

function confidenceFromDays(days: number): { confPct: number; label: 'Low' | 'Medium' | 'High' } {
  const pct = Math.round(100 * (1 - Math.exp(-days / 6)));
  const confPct = Math.max(0, Math.min(95, pct));
  let label: 'Low' | 'Medium' | 'High' = 'Low';
  if (confPct >= 75) label = 'High';
  else if (confPct >= 45) label = 'Medium';
  return { confPct, label };
}

function formatRelativeMinutes(minutes: number): string {
  if (minutes <= 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

type TodayDoseRow = {
  key: string;
  med: Med;
  dueISO: string;
  past: boolean;
  logged?: MedDoseLogCompat;
};

function buildTodayDoseRows(meds: Med[], logs: MedDoseLogCompat[], ref = new Date()): TodayDoseRow[] {
  const today = startOfToday();
  const end = endOfToday();
  if (!Array.isArray(meds) || meds.length === 0) return [];

  const rows: TodayDoseRow[] = [];
  for (const m of meds) {
    if (!isScheduledMed(m)) continue;
    const all = getTodaysDoses(m.schedule as { times: string[]; days: number[] }, today);
    for (const dt of all) {
      if (!isSameDay(dt, today) || dt > end) continue;
      const logged = logs.find((l) => {
        if (l.med_id !== m.id) return false;
        const sf = (l as MedDoseLogCompat).scheduled_for;
        if (!sf) return false;
        return Math.abs(new Date(sf).getTime() - dt.getTime()) < 60_000;
      });
      rows.push({
        key: `${m.id}-${dt.toISOString()}`,
        med: m,
        dueISO: dt.toISOString(),
        past: dt.getTime() < ref.getTime(),
        logged,
      });
    }
  }

  rows.sort((a, b) => a.dueISO.localeCompare(b.dueISO));
  return rows;
}

export default function MedsScreen() {
  const navigation = useNavigation<any>(); // MedsStack: navigate('MedDetails', { id })
  const route = useRoute<any>();
  const qc = useQueryClient();
  const { session } = useAuth();

  const { scheduleForMed } = useMedReminderScheduler();

  const theme = useTheme();
  const appTheme = useAppTheme();
  const sectionSpacing = appTheme.spacing.lg ?? 16;
  const cardRadius = 16;
  const cardSurface = appTheme.colors.surface;
  const utilitySurface = useMemo(() => reclaimUtilityCardSurface(appTheme), [appTheme]);
  const primaryCapsule = useMemo(() => reclaimPrimaryCapsuleButton(appTheme), [appTheme]);
  const tertiaryCapsule = useMemo(() => reclaimTertiaryOutlineCapsuleButton(appTheme), [appTheme]);
  const ghostCapsule = useMemo(() => reclaimGhostCapsuleButton(appTheme), [appTheme]);
  const doseRowCompact = useMemo(() => reclaimCompactCapsuleButton(appTheme, 34), [appTheme]);

  const medsQ = useQuery({
    queryKey: ['meds'],
    queryFn: async () => {
      try {
        return await listMeds();
      } catch (error: any) {
        console.warn('MedsScreen: listMeds error:', error?.message || error);
        return [];
      }
    },
    retry: false,
    throwOnError: false,
    staleTime: 3_600_000, // 1 hour — med list changes rarely
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const logsQ = useQuery({
    queryKey: ['meds:logs:7d'],
    queryFn: async () => {
      try {
        return await listMergedMedDoseLogsLastNDays(7);
      } catch (error: any) {
        console.warn('MedsScreen: merged med logs error:', error?.message || error);
        return [];
      }
    },
    retry: false,
    throwOnError: false,
    staleTime: 1_800_000, // 30 min — logs update after doses are recorded
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const meds = (Array.isArray(medsQ.data) ? medsQ.data : []) as Med[];
  const logs = (Array.isArray(logsQ.data) ? logsQ.data : []) as MedDoseLog[];

  const scrollRef = useRef<ScrollView>(null);
  const dueTodayYRef = useRef(0);
  const focusProcessedRef = useRef(false);

  const [highlightKey, setHighlightKey] = useState<string | null>(null);
  const [highlightMedId, setHighlightMedId] = useState<string | null>(null);

  // ----- Scientific Insights -----
  const insightsCtx = useScientificInsights();
  const rankedInsights = insightsCtx.insights;
  const insightStatus = insightsCtx.status;
  const refreshInsight = insightsCtx.refresh;
  const insightsEnabled = insightsCtx.enabled;
  const insightError = insightsCtx.error;
  const medicationInsightHints = insightsCtx.lastContext?.meds?.contextHints;
  const [insightActionBusy, setInsightActionBusy] = useState(false);

  const medsInsight = useInsightForScreen(rankedInsights, session, {
    screen: 'meds',
    preferredScopes: MEDS_PREFERRED_SCOPES,
    allowGlobalFallback: true,
  });

  // ---------- Reminder status helpers ----------
  const [permStatus, setPermStatus] = useState<string>('unknown');
  const [totalScheduled, setTotalScheduled] = useState<number>(0);
  const [next24hScheduled, setNext24hScheduled] = useState<number>(0);
  const [lastScheduleAt, setLastScheduleAt] = useState<string | null>(null);
  const [remindersDisabled, setRemindersDisabled] = useState<boolean>(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const rescheduleGuardRef = useRef(false);

  const refreshReminderStatus = useCallback(async () => {
    try {
      setStatusError(null);
      const [perm, all] = await Promise.all([
        Notifications.getPermissionsAsync(),
        Notifications.getAllScheduledNotificationsAsync(),
      ]);
      setPermStatus(perm.status ?? 'unknown');

      const now = Date.now();
      const in24h = now + 24 * 60 * 60 * 1000;

      let next24 = 0;
      for (const req of all) {
        const d = req.content?.data as any;
        if (d?.type !== 'MED_REMINDER') continue;

        let ts: number | null = null;
        const trig: any = req.trigger;
        if (trig?.date) ts = new Date(trig.date).getTime();
        else if (typeof trig?.seconds === 'number') ts = now + trig.seconds * 1000;

        if (ts !== null && ts <= in24h && ts >= now) next24 += 1;
      }

      setTotalScheduled(all.filter((req) => (req.content?.data as any)?.type === 'MED_REMINDER').length);
      setNext24hScheduled(next24);

      const stored = await AsyncStorage.getItem(LAST_SCHEDULE_KEY);
      setLastScheduleAt(stored);

      const disabledRaw = await AsyncStorage.getItem(REMINDERS_DISABLED_KEY);
      setRemindersDisabled(disabledRaw === 'true');
    } catch (err: any) {
      setStatusError(err?.message ?? 'Unable to load reminder status.');
    }
  }, []);

  const scheduleAllSilent = useCallback(async () => {
    try {
      setStatusError(null);
      await AsyncStorage.setItem(REMINDERS_DISABLED_KEY, 'false');
      await cancelAllReminders();

      let count = 0;
      if (meds?.length) {
        for (const m of meds) {
          if (!isScheduledMed(m)) continue;
          await scheduleForMed(m);
          count++;
        }
      }

      await rescheduleRefillRemindersIfEnabled();
      const stamp = new Date().toISOString();
      await AsyncStorage.setItem(LAST_SCHEDULE_KEY, stamp);
      setLastScheduleAt(stamp);

      await refreshReminderStatus();
      return count;
    } catch (err: any) {
      setStatusError(err?.message ?? 'Failed to reschedule reminders.');
      throw err;
    }
  }, [meds, scheduleForMed, refreshReminderStatus]);

  useEffect(() => {
    refreshReminderStatus().catch((e) => { if (__DEV__) logger.debug('[MedsScreen]', e); });
  }, [refreshReminderStatus]);

  // Foreground rescheduler (once per foreground session)
  useEffect(() => {
    const handler = async (state: AppStateStatus) => {
      if (state !== 'active') {
        rescheduleGuardRef.current = false;
        return;
      }
      if (rescheduleGuardRef.current) return;

      try {
        const perm = await Notifications.getPermissionsAsync();
        if (perm.status !== 'granted') return;

        const disabledRaw = await AsyncStorage.getItem(REMINDERS_DISABLED_KEY);
        const disabled = disabledRaw === 'true';
        if (disabled) return;

        const now = Date.now();
        const stored = await AsyncStorage.getItem(LAST_SCHEDULE_KEY);
        const last = stored ? new Date(stored).getTime() : 0;
        const stale = now - last > 12 * 60 * 60 * 1000 || !stored;

        const all = await Notifications.getAllScheduledNotificationsAsync();
        const medNotifs = all.filter((req) => (req.content?.data as any)?.type === 'MED_REMINDER');
        const in24h = now + 24 * 60 * 60 * 1000;

        let next24 = 0;
        for (const req of medNotifs) {
          const trig: any = req.trigger;
          let ts: number | null = null;
          if (trig?.date) ts = new Date(trig.date).getTime();
          else if (typeof trig?.seconds === 'number') ts = now + trig.seconds * 1000;
          if (ts !== null && ts <= in24h && ts >= now) next24 += 1;
        }

        const activeCount = meds?.length ?? 0;
        const threshold = Math.min(3, activeCount || 2);

        if (stale || next24 < threshold) {
          rescheduleGuardRef.current = true;
          await scheduleAllSilent().catch((e) => { if (__DEV__) logger.debug('[MedsScreen]', e); });
        }
      } catch {
        // silent
      }
    };

    const sub = AppState.addEventListener('change', handler);
    return () => sub.remove();
  }, [meds, scheduleAllSilent]);

  // ---------- Mutations ----------
  const logMut = useMutation({
    mutationFn: (args: { med_id: string; status: 'taken' | 'skipped' | 'missed'; scheduled_for?: string }) =>
      logMedDose(args),
    onSuccess: () => qc.invalidateQueries({ predicate: (q) => isMedDoseLogRelatedQueryKey(q.queryKey) }),
    onError: (e: any) => Alert.alert('Log error', e?.message ?? 'Failed to log dose'),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteMed(id),
    onSuccess: async (_data, id) => {
      await cancelRemindersForMed(id);
      await qc.invalidateQueries({ queryKey: ['meds'] });
      await rescheduleRefillRemindersIfEnabled();
    },
  });

  // editing + form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  const [timeSlots, setTimeSlots] = useState<string[]>(['08:00', '21:00']);
  const [dayPick, setDayPick] = useState<Record<number, boolean>>(defaultMedDayPick());
  const [medKind, setMedKind] = useState<'scheduled' | 'prn'>('scheduled');

  const addMut = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Name required');
      if (editingId) {
        const prev = meds.find((x) => x.id === editingId);
        if (prev && isScheduledMed(prev) && medKind === 'prn') {
          await cancelRemindersForMed(editingId);
        }
      }
      if (medKind === 'prn') {
        return upsertMed({
          id: editingId ?? undefined,
          name: name.trim(),
          dose: dose.trim() || undefined,
          schedule: { prn: true },
        });
      }
      if (!medTimeSlotsValid(timeSlots)) throw new Error('Add at least one time as HH:MM (e.g. 08:00)');
      if (!medDaysPickValid(dayPick)) throw new Error('Select at least one day');
      const timesCsv = timeSlots.map((t) => t.trim()).filter(Boolean).join(',');
      const daysCsv = MED_APP_DAYS.filter((d) => dayPick[d]).join(',');
      const schedule = parseSchedule(timesCsv, daysCsv);
      return upsertMed({
        id: editingId ?? undefined,
        name: name.trim(),
        dose: dose.trim() || undefined,
        schedule,
      });
    },
    onSuccess: async (savedMed: Med) => {
      setEditingId(null);
      setName('');
      setDose('');
      setTimeSlots(['08:00', '21:00']);
      setDayPick(defaultMedDayPick());
      setMedKind('scheduled');

      await qc.invalidateQueries({ queryKey: ['meds'] });

      try {
        await cancelRemindersForMed(savedMed.id!);
        if (isScheduledMed(savedMed)) {
          await scheduleForMed(savedMed);
        }
        await rescheduleRefillRemindersIfEnabled();
      } catch {
        // silent
      }

      Alert.alert(
        'Saved',
        isPrnMed(savedMed)
          ? 'As-needed medication saved. Log doses when you take them — no recurring reminders.'
          : 'Medication saved and reminders scheduled for the next 24h.',
      );
    },
    onError: (e: any) => Alert.alert('Error', e?.message ?? 'Failed to save med'),
  });

  const schedulePreview = useCallback((m: Med) => {
    if (isPrnMed(m)) return 'As needed (no fixed schedule)';
    const s = m.schedule as { times?: string[]; days?: number[] } | undefined;
    const timesPreview = s?.times?.join(', ') ?? '';
    const daysPreview = s?.days?.join(', ') ?? '';
    return s?.times?.length ? `Times: ${timesPreview} • Days: ${daysPreview}` : 'No schedule';
  }, []);

  // ---------- Due Today block: status chip + highlight ----------
  const dueTodayItems = useMemo(() => buildTodayDoseRows(meds, logs), [meds, logs]);

  // Hero + summary metrics generated from due rows + logs.
  const medsHeroMetrics = useMemo(() => {
    const hasScheduledMeds = meds.some((m) => isScheduledMed(m));
    const dosesToday = dueTodayItems.length;
    const takenToday = dueTodayItems.filter((r) => r.logged?.status === 'taken').length;
    const skippedToday = dueTodayItems.filter((r) => r.logged?.status === 'skipped').length;
    const missedToday = dueTodayItems.filter((r) => r.logged?.status === 'missed').length;
    const overdueToday = dueTodayItems.filter((r) => r.past && !r.logged).length + missedToday;

    let nextDose: Date | null = null;
    for (const m of meds) {
      if (!isScheduledMed(m)) continue;
      const nextTimes = upcomingDoseTimes(m.schedule as { times: string[]; days: number[] }, 3);
      for (const dt of nextTimes) {
        if (!nextDose || dt.getTime() < nextDose.getTime()) nextDose = dt;
      }
    }

    const now = Date.now();
    const nextDoseInMin = nextDose ? Math.max(0, Math.round((nextDose.getTime() - now) / 60000)) : null;
    const nextDoseLabel = nextDose ? nextDose.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'None scheduled soon';

    const { pct } = computeAdherenceFromSchedule(logs as MedDoseLog[], meds, 7);
    const adherencePct7d = Math.max(0, Math.min(100, pct));
    const daysWithLogs = new Set(
      logs
        .map((l) => {
          const d = looseDate(l as MedDoseLogCompat);
          return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
        })
        .filter(Boolean) as string[],
    ).size;

    let tone: MedsHeroState['tone'] = 'steady';
    let title = '💊 On Track';
    let subtitle = 'Your schedule is holding steady. Keep your usual anchor routine.';
    if (meds.length === 0) {
      tone = 'empty';
      title = '💊 No active meds';
      subtitle = 'Add your first medication to unlock reminders and adherence tracking.';
    } else if (overdueToday > 0) {
      tone = 'unstable';
      title = '⏳ Dose Overdue';
      subtitle = `${overdueToday} overdue dose${overdueToday === 1 ? '' : 's'} need attention.`;
    } else if (hasScheduledMeds && adherencePct7d < 60) {
      tone = 'unstable';
      title = '⚠️ Adherence Low';
      subtitle = 'Recent adherence dipped. Start by locking in the next dose.';
    } else if (hasScheduledMeds && nextDoseInMin !== null && nextDoseInMin <= 45) {
      tone = 'drift';
      title = '🕒 Dose Due Soon';
      subtitle = `Next dose in ${formatRelativeMinutes(nextDoseInMin)}.`;
    } else if (hasScheduledMeds && adherencePct7d < 80) {
      tone = 'drift';
      title = '🌗 Minor Drift';
      subtitle = 'Small slips are normal. Re-anchor the next dose to a fixed habit.';
    } else if (!hasScheduledMeds && meds.some((m) => isPrnMed(m))) {
      tone = 'steady';
      title = '💊 As-needed meds';
      subtitle = 'Log doses when you take them — no fixed schedule to compare against.';
    }

    const adherenceDelta = hasScheduledMeds ? `${adherencePct7d}% 7d` : 'PRN / as needed';

    const heroState: MedsHeroState = {
      title,
      subtitle,
      tone,
      deltas: [
        `${takenToday}/${dosesToday || 0} today`,
        adherenceDelta,
        nextDose ? `Next ${nextDoseLabel}` : hasScheduledMeds ? 'No next dose' : 'No scheduled doses',
      ],
    };

    return {
      dosesToday,
      takenToday,
      skippedToday,
      missedToday,
      overdueToday,
      nextDoseLabel,
      adherencePct7d,
      daysWithLogs,
      heroState,
    };
  }, [dueTodayItems, logs, meds]);

  const medsConfidence = useMemo(
    () => confidenceFromDays(medsHeroMetrics.daysWithLogs),
    [medsHeroMetrics.daysWithLogs],
  );

  // Today plan summary card values.
  const todaysPlan = useMemo(
    () => ({
      dosesToday: medsHeroMetrics.dosesToday,
      taken: medsHeroMetrics.takenToday,
      skipped: medsHeroMetrics.skippedToday,
      missed: medsHeroMetrics.missedToday,
      nextDoseLabel: medsHeroMetrics.nextDoseLabel,
    }),
    [medsHeroMetrics],
  );

  // Focus / highlight handler (keeps your behaviour)
  const focusMedId = route?.params?.focusMedId as string | undefined;
  const focusScheduledFor = route?.params?.focusScheduledFor as string | undefined;

  useEffect(() => {
    if (focusProcessedRef.current) return;
    if (!focusMedId || !focusScheduledFor) return;

    const targetMs = Date.parse(focusScheduledFor);
    if (!Number.isFinite(targetMs)) return;

    let matchedKey: string | null = null;

    for (const it of dueTodayItems) {
      if (it.med.id !== focusMedId) continue;
      const ms = Date.parse(it.dueISO);
      if (!Number.isFinite(ms)) continue;
      if (Math.abs(ms - targetMs) <= 5 * 60 * 1000) {
        matchedKey = it.key;
        break;
      }
    }

    focusProcessedRef.current = true;

    if (matchedKey) {
      setHighlightKey(matchedKey);
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ y: Math.max(dueTodayYRef.current - 12, 0), animated: true });
      }
      const timer = setTimeout(() => setHighlightKey(null), 5000);
      return () => clearTimeout(timer);
    } else if (focusMedId) {
      setHighlightMedId(focusMedId);
      const timer = setTimeout(() => setHighlightMedId(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [focusMedId, focusScheduledFor, dueTodayItems]);

  // ---------- History bottom sheet ----------
  const [showHistory, setShowHistory] = useState(false);
  const [filterMedId, setFilterMedId] = useState<string | null>(null);

  return (
    <>
      <ScrollView
        ref={scrollRef}
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 0,
          paddingBottom: 140,
          backgroundColor: theme.colors.background,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <MedsHero
          hasMeds={meds.length > 0}
          adherencePct={medsHeroMetrics.adherencePct7d}
          dosesToday={medsHeroMetrics.dosesToday}
          takenToday={medsHeroMetrics.takenToday}
          overdueToday={medsHeroMetrics.overdueToday}
          heroState={medsHeroMetrics.heroState}
          confidence={medsConfidence}
          trendDaysCount={medsHeroMetrics.daysWithLogs}
        />

        {meds.length > 0 ? (
          <View style={{ marginBottom: sectionSpacing }}>
            <InformationalCard icon="information-outline" style={utilitySurface}>
              <Text variant="titleSmall" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                What you&apos;re tracking here
              </Text>
              <Text variant="bodySmall" style={{ marginTop: 8, color: theme.colors.onSurfaceVariant, lineHeight: 20 }}>
                Reclaim stores what you enter (name, dose, and either a fixed schedule or as-needed logging). Scheduled
                meds support reminders and adherence; as-needed meds are tracked by logging doses — not daily adherence
                expectations. This isn&apos;t a drug reference and won&apos;t judge effectiveness or tell you what a
                medication does medically.
              </Text>
            </InformationalCard>
          </View>
        ) : null}

        {/* Scientific insight (InsightCard is fine as-is per your requirement) */}
        <View style={{ marginBottom: sectionSpacing }}>
          {insightsEnabled ? (
            <>
              {insightStatus === 'loading' ? (
                <Card mode="outlined" style={{ borderRadius: cardRadius, marginBottom: 12, backgroundColor: cardSurface }}>
                  <Card.Content style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color={theme.colors.onSurfaceVariant} />
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                      Loading insight…
                    </Text>
                  </Card.Content>
                </Card>
              ) : null}

              {insightStatus === 'error' ? (
                <Card mode="outlined" style={{ borderRadius: cardRadius, marginBottom: 12, backgroundColor: cardSurface }}>
                  <Card.Content style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>
                      {insightError ?? "We couldn't refresh insights right now."}
                    </Text>
                    <Button
                      mode="text"
                      onPress={() => {
                        logTelemetry({
                          name: 'insight_refresh_pressed',
                          properties: {
                            screenSource: 'meds',
                            reason: 'meds-retry',
                          },
                        }).catch((e) => { if (__DEV__) logger.debug('[MedsScreen]', e); });
                        refreshInsight('meds-retry').catch((e) => { if (__DEV__) logger.debug('[MedsScreen]', e); });
                      }}
                      style={ghostCapsule.style}
                      contentStyle={ghostCapsule.contentStyle}
                      labelStyle={[ghostCapsule.labelStyle, { color: theme.colors.primary }]}
                    >
                      Try again
                    </Button>
                  </Card.Content>
                </Card>
              ) : null}

              {medsInsight && insightStatus === 'ready' ? (
                <View>
                <InsightCard
                  insight={medsInsight}
                  onRefreshPress={() => {
                    // Log telemetry for manual refresh
                    logTelemetry({
                      name: 'insight_refresh_pressed',
                      properties: {
                        screenSource: 'meds',
                        reason: 'meds-manual',
                      },
                    }).catch((e) => { if (__DEV__) logger.debug('[MedsScreen]', e); }); // Non-blocking
                    refreshInsight('meds-manual').catch((e) => { if (__DEV__) logger.debug('[MedsScreen]', e); });
                  }}
                  onActionPress={() => {
                    if (insightActionBusy) return;
                    setInsightActionBusy(true);
                    refreshInsight('meds-action')
                      .catch((e) => { if (__DEV__) logger.debug('[MedsScreen]', e); })
                      .finally(() => setInsightActionBusy(false));
                  }}
                  isProcessing={insightActionBusy}
                  disabled={insightActionBusy}
                  testID="meds-insight-card"
                  screenSource="meds"
                />
                {medicationInsightHints?.length ? (
                  <MedicationContextFootnotes hints={medicationInsightHints} accessibilityLabel="Medication context" />
                ) : null}
                </View>
              ) : insightStatus === 'ready' ? (
                <View>
                  <InformationalCard style={utilitySurface}>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                      No new insight right now.
                    </Text>
                  </InformationalCard>
                  {medicationInsightHints?.length ? (
                    <MedicationContextFootnotes hints={medicationInsightHints} accessibilityLabel="Medication context" />
                  ) : null}
                </View>
              ) : null}
            </>
          ) : (
            <Card mode="outlined" style={{ borderRadius: cardRadius, backgroundColor: cardSurface }}>
              <Card.Content>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                  Scientific insights are turned off.
                </Text>
                <Text variant="bodySmall" style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>
                  Enable them in Settings to see personalized medication nudges here.
                </Text>
              </Card.Content>
            </Card>
          )}
        </View>

        {/* Reminders status */}
        <View style={{ marginBottom: sectionSpacing }}>
          <SchedulingCard
            title="Reminders"
            subtitle="Medication reminder status"
            status={
              <View>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                  Notifications: {
                    permStatus === 'granted' ? 'Active' :
                    permStatus === 'denied' ? 'Denied — check device settings' :
                    permStatus === 'undetermined' ? 'Not yet enabled' :
                    permStatus ?? 'Unknown'
                  }
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginTop: 4 }}>
                  Scheduled: {totalScheduled} total • {next24hScheduled} in next 24h
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  Last scheduled: {lastScheduleAt
                    ? `${new Date(lastScheduleAt).toLocaleDateString()} at ${new Date(lastScheduleAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Not yet'}
                </Text>
                {remindersDisabled ? (
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                    Reminders are disabled (clear to stay off; reschedule to re-enable).
                  </Text>
                ) : null}
                {statusError ? (
                  <HelperText type="error" visible style={{ marginTop: 4 }}>
                    {statusError}
                  </HelperText>
                ) : null}
              </View>
            }
            primaryActionLabel="Reschedule now"
            onPrimaryAction={() => scheduleAllSilent().catch((e) => { if (__DEV__) logger.debug('[MedsScreen]', e); })}
            primaryActionDisabled={medsQ.isLoading}
            secondaryActionLabel={permStatus !== 'granted' || remindersDisabled ? 'Enable reminders' : undefined}
            onSecondaryAction={() =>
              requestPermission()
                .then(async () => {
                  await AsyncStorage.setItem(REMINDERS_DISABLED_KEY, 'false');
                  await scheduleAllSilent().catch((e) => { if (__DEV__) logger.debug('[MedsScreen]', e); });
                  await refreshReminderStatus();
                })
                .catch((e) => { if (__DEV__) logger.debug('[MedsScreen]', e); })
            }
            tertiaryActionLabel="Clear all"
            onTertiaryAction={() =>
              cancelAllReminders()
                .then(async () => {
                  await AsyncStorage.removeItem(LAST_SCHEDULE_KEY);
                  await AsyncStorage.setItem(REMINDERS_DISABLED_KEY, 'true');
                  await refreshReminderStatus();
                })
                .catch((e) => { if (__DEV__) logger.debug('[MedsScreen]', e); })
            }
          />
        </View>

        {/* Today — doses due with quick actions (consolidated, no duplicate plan card) */}
        {dueTodayItems.length ? (
          <View style={{ marginBottom: sectionSpacing }}>
            <Card
              mode="elevated"
              style={{ borderRadius: cardRadius, backgroundColor: cardSurface }}
              onLayout={(e: LayoutChangeEvent) => {
                dueTodayYRef.current = e.nativeEvent.layout.y;
              }}
            >
              <Card.Content>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                    Today
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {todaysPlan.taken}/{todaysPlan.dosesToday} done · Next {todaysPlan.nextDoseLabel}
                  </Text>
                </View>

                {dueTodayItems.map(({ key, med, dueISO, past, logged }, index) => {
                  const isHighlight = highlightKey === key;
                  const status = logged?.status
                    ? logged.status === 'taken'
                      ? { label: 'Taken', tone: 'done' as const }
                      : logged.status === 'skipped'
                        ? { label: 'Skipped', tone: 'muted' as const }
                        : { label: 'Missed', tone: 'alert' as const }
                    : past
                      ? { label: 'Overdue', tone: 'alert' as const }
                      : { label: 'Due', tone: 'muted' as const };

                  const timeStr = new Date(dueISO).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                  const statusColor =
                    status.tone === 'alert'
                      ? theme.colors.error
                      : status.tone === 'done'
                        ? theme.colors.primary
                        : theme.colors.onSurfaceVariant;

                  return (
                    <View
                      key={key}
                      style={{
                        paddingVertical: 14,
                        borderTopWidth: index === 0 ? 0 : 1,
                        borderTopColor: theme.colors.outlineVariant,
                        backgroundColor: isHighlight ? theme.colors.secondaryContainer : undefined,
                        borderRadius: isHighlight ? 12 : 0,
                        paddingHorizontal: isHighlight ? 12 : 0,
                      }}
                    >
                      <View
                        style={{
                          borderRadius: 10,
                          padding: 12,
                          backgroundColor: theme.colors.surfaceVariant,
                          opacity: 0.92,
                        }}
                      >
                        <Text
                          variant="labelSmall"
                          style={{
                            color: theme.colors.onSurfaceVariant,
                            letterSpacing: 0.2,
                            marginBottom: 6,
                          }}
                        >
                          {timeStr}
                          <Text style={{ color: theme.colors.onSurfaceVariant, opacity: 0.6 }}>{' · '}</Text>
                          <Text style={{ color: statusColor, fontWeight: '600' }}>{status.label}</Text>
                        </Text>
                        <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                          {med.name}
                        </Text>
                        {med.dose ? (
                          <Text
                            variant="bodySmall"
                            style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, lineHeight: 18 }}
                          >
                            {med.dose}
                          </Text>
                        ) : null}
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                        {logged?.status === 'taken' ? (
                          <Chip
                            icon="check-circle-outline"
                            mode="flat"
                            style={{ alignSelf: 'flex-start', backgroundColor: theme.colors.surfaceVariant }}
                            textStyle={{ color: theme.colors.onSurfaceVariant, fontWeight: '600' }}
                          >
                            Taken
                          </Chip>
                        ) : (
                          <>
                            <Button
                              mode="contained"
                              onPress={() => logMut.mutate({ med_id: med.id!, status: 'taken', scheduled_for: dueISO })}
                              buttonColor={theme.colors.primary}
                              textColor={theme.colors.onPrimary}
                              style={[{ flex: 1, minWidth: 0 }, doseRowCompact.style, primaryCapsule.style]}
                              contentStyle={[doseRowCompact.contentStyle, { minHeight: 42 }]}
                              labelStyle={[doseRowCompact.labelStyle, { color: theme.colors.onPrimary }]}
                            >
                              Take
                            </Button>
                            <Button
                              mode="outlined"
                              onPress={() => logMut.mutate({ med_id: med.id!, status: 'skipped', scheduled_for: dueISO })}
                              style={[{ flex: 1, minWidth: 0 }, doseRowCompact.style, tertiaryCapsule.style]}
                              contentStyle={[doseRowCompact.contentStyle, { minHeight: 42 }]}
                              labelStyle={doseRowCompact.labelStyle}
                            >
                              Skip
                            </Button>
                          </>
                        )}
                      </View>
                    </View>
                  );
                })}
              </Card.Content>
            </Card>
          </View>
        ) : null}

        {/* Active medications — compact list */}
        <View style={{ marginBottom: sectionSpacing }}>
          {medsQ.isLoading ? (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Loading medications…
            </Text>
          ) : null}

          {medsQ.error ? (
            <HelperText type="error" visible style={{ marginBottom: 12 }}>
              {(medsQ.error as any)?.message ?? 'Failed to load medications.'}
            </HelperText>
          ) : null}

          {Array.isArray(medsQ.data) && medsQ.data.length === 0 && !medsQ.isLoading ? (
            <Card mode="outlined" style={{ borderRadius: cardRadius, backgroundColor: cardSurface }}>
              <Card.Content style={{ alignItems: 'center', paddingVertical: 24 }}>
                <MaterialCommunityIcons
                  name="pill"
                  size={48}
                  color={theme.colors.primary}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
                <Text variant="titleMedium" style={{ marginTop: 12 }}>
                  No medications yet
                </Text>
                <Text variant="bodyMedium" style={{ marginTop: 6, textAlign: 'center', color: theme.colors.onSurfaceVariant }}>
                  Add medications below — fixed schedules can use reminders; as-needed meds are tracked when you log doses.
                </Text>
              </Card.Content>
            </Card>
          ) : (
            <Card mode="elevated" style={{ borderRadius: cardRadius, backgroundColor: cardSurface }}>
              <Card.Content style={{ paddingHorizontal: 0, paddingVertical: 8 }}>
                <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
                  <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
                    Your medications
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                    Tap to view details, edit, or log doses
                  </Text>
                </View>

                {meds.map((m, idx) => {
                  const isHighlight = highlightMedId === m.id;
                  const times = isPrnMed(m)
                    ? 'As needed'
                    : (m.schedule as { times?: string[] })?.times?.join(', ') ?? '—';
                  const desc = isPrnMed(m)
                    ? (m.dose ? `${m.dose} · As needed (PRN)` : 'As needed (PRN) — tap ⊕ to log')
                    : m.dose
                      ? `${m.dose} · ${times}`
                      : times;

                  return (
                    <View
                      key={m.id ?? m.name}
                      style={{
                        backgroundColor: isHighlight ? theme.colors.secondaryContainer : undefined,
                        borderTopWidth: idx === 0 ? 0 : 1,
                        borderTopColor: theme.colors.outlineVariant,
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                        borderRadius: isHighlight ? 12 : 0,
                      }}
                    >
                      <List.Item
                        title={m.name}
                        description={desc}
                        descriptionNumberOfLines={1}
                        onPress={() => navigation.navigate('MedDetails', { id: m.id! })}
                        left={(props:any) => <List.Icon {...props} icon="pill" />}
                        right={(props:any) => (
                          <View style={[props.style, { flexDirection: 'row', alignItems: 'center' }]}>
                            {isPrnMed(m) ? (
                              <IconButton
                                icon="check-circle-outline"
                                size={18}
                                iconColor={theme.colors.primary}
                                onPress={() => {
                                  const iso = new Date().toISOString();
                                  logMut.mutate({ med_id: m.id!, status: 'taken', scheduled_for: iso });
                                }}
                                accessibilityLabel={`Log ${m.name} taken now`}
                              />
                            ) : null}
                            <IconButton
                              icon="pencil-outline"
                              size={18}
                              iconColor={props.color}
                              onPress={() => {
                                setEditingId(m.id!);
                                setMedKind(isPrnMed(m) ? 'prn' : 'scheduled');
                                setName(m.name);
                                setDose(m.dose ?? '');
                                if (isPrnMed(m)) {
                                  setTimeSlots(['08:00', '21:00']);
                                  setDayPick(defaultMedDayPick());
                                } else {
                                  const sched = m.schedule;
                                  if (sched && !isPrnSchedule(sched)) {
                                    const t = sched.times.filter(Boolean).length ? [...sched.times] : ['08:00', '21:00'];
                                    setTimeSlots(t);
                                    const nextPick = defaultMedDayPick();
                                    MED_APP_DAYS.forEach((d) => {
                                      nextPick[d] = false;
                                    });
                                    (sched.days ?? [...MED_APP_DAYS]).forEach((d) => {
                                      if (typeof d === 'number' && d >= 1 && d <= 7) nextPick[d] = true;
                                    });
                                    if (!medDaysPickValid(nextPick)) setDayPick(defaultMedDayPick());
                                    else setDayPick(nextPick);
                                  } else {
                                    setTimeSlots(['08:00', '21:00']);
                                    setDayPick(defaultMedDayPick());
                                  }
                                }
                              }}
                              accessibilityLabel={`Edit ${m.name}`}
                            />
                            <IconButton
                              icon="trash-can-outline"
                              size={18}
                              iconColor={theme.colors.error}
                              onPress={() => {
                                Alert.alert(
                                  'Delete medication?',
                                  `Delete "${m.name}" and cancel its reminders?`,
                                  [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'Delete', style: 'destructive', onPress: () => delMut.mutate(m.id!) },
                                  ],
                                );
                              }}
                              accessibilityLabel={`Delete ${m.name}`}
                            />
                          </View>
                        )}
                        titleStyle={{ color: theme.colors.onSurface, fontWeight: '700' }}
                        descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                        style={{ backgroundColor: 'transparent' }}
                      />
                    </View>
                  );
                })}
              </Card.Content>
            </Card>
          )}
        </View>

        {/* Add / Update medication (SectionHeader moved INSIDE card) */}
        <View style={{ marginBottom: sectionSpacing }}>
          <Card mode="elevated" style={{ borderRadius: cardRadius, backgroundColor: cardSurface }}>
            <Card.Content>
              <SectionHeader title={editingId ? 'Update medication' : 'Add medication'} icon="clipboard-edit-outline" />

              <TextInput
                mode="outlined"
                label="Name"
                value={name}
                onChangeText={setName}
                placeholder="e.g. Sertraline"
                accessibilityLabel="Medication name"
                style={{ marginTop: 8, marginBottom: 12 }}
              />

              <TextInput
                mode="outlined"
                label="Dose (optional)"
                value={dose}
                onChangeText={setDose}
                placeholder="e.g. 50 mg"
                accessibilityLabel="Medication dose"
                style={{ marginBottom: 12 }}
              />

              <Text variant="labelLarge" style={{ marginBottom: 8, color: theme.colors.onSurfaceVariant }}>
                Type
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <Chip mode={medKind === 'scheduled' ? 'flat' : 'outlined'} selected={medKind === 'scheduled'} onPress={() => setMedKind('scheduled')}>
                  Scheduled
                </Chip>
                <Chip mode={medKind === 'prn' ? 'flat' : 'outlined'} selected={medKind === 'prn'} onPress={() => setMedKind('prn')}>
                  As needed
                </Chip>
              </View>

              {medKind === 'scheduled' ? (
                <>
              <Text variant="labelLarge" style={{ marginTop: 4, marginBottom: 6, color: theme.colors.onSurfaceVariant }}>
                Times (24h)
              </Text>
              {timeSlots.map((slot, idx) => (
                <View
                  key={`med-time-${idx}`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 }}
                >
                  <TextInput
                    mode="outlined"
                    label={`Dose time ${idx + 1}`}
                    value={slot}
                    onChangeText={(txt) =>
                      setTimeSlots((prev) => prev.map((s, i) => (i === idx ? txt : s)))
                    }
                    placeholder="08:00"
                    accessibilityLabel={`Medication time ${idx + 1}`}
                    keyboardType="numbers-and-punctuation"
                    style={{ flex: 1 }}
                  />
                  <IconButton
                    icon="close"
                    size={20}
                    disabled={timeSlots.length <= 1}
                    onPress={() => setTimeSlots((prev) => prev.filter((_, i) => i !== idx))}
                    accessibilityLabel={`Remove time ${idx + 1}`}
                  />
                </View>
              ))}
              <Button
                mode="text"
                compact
                onPress={() => setTimeSlots((prev) => [...prev, '12:00'])}
                               style={{ alignSelf: 'flex-start', marginBottom: 8 }}
              >
                Add another time
              </Button>
              <HelperText type="error" visible={medKind === 'scheduled' && !medTimeSlotsValid(timeSlots)} style={{ marginBottom: 8 }}>
                Enter at least one time as HH:MM (e.g. 08:00).
              </HelperText>

              <Text variant="labelLarge" style={{ marginBottom: 8, color: theme.colors.onSurfaceVariant }}>
                Days (Mon–Sun)
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {MED_APP_DAYS.map((d) => (
                  <Chip
                    key={`med-day-${d}`}
                    mode={dayPick[d] ? 'flat' : 'outlined'}
                    selected={dayPick[d]}
                    onPress={() => setDayPick((p) => ({ ...p, [d]: !p[d] }))}
                    style={{ marginBottom: 0 }}
                  >
                    {MED_DAY_LABEL[d]}
                  </Chip>
                ))}
              </View>
              <HelperText type="error" visible={medKind === 'scheduled' && !medDaysPickValid(dayPick)} style={{ marginBottom: 12 }}>
                Select at least one day.
              </HelperText>
                </>
              ) : (
                <Text variant="bodySmall" style={{ marginBottom: 12, color: theme.colors.onSurfaceVariant, lineHeight: 20 }}>
                  As-needed medications are logged when you take them. Reclaim won&apos;t expect fixed daily doses or show schedule adherence % for them.
                </Text>
              )}

              <Button
                mode="contained"
                onPress={() => addMut.mutate()}
                loading={addMut.isPending}
                accessibilityLabel={editingId ? 'Update medication' : 'Save medication'}
                buttonColor={theme.colors.primary}
                textColor={theme.colors.onPrimary}
                style={primaryCapsule.style}
                contentStyle={primaryCapsule.contentStyle}
                labelStyle={[primaryCapsule.labelStyle, { color: theme.colors.onPrimary }]}
              >
                {addMut.isPending ? (editingId ? 'Updating…' : 'Saving…') : editingId ? 'Update medication' : 'Save medication'}
              </Button>

              {editingId ? (
                <Button
                  mode="text"
                  onPress={() => {
                    setEditingId(null);
                    setName('');
                    setDose('');
                    setTimeSlots(['08:00', '21:00']);
                    setDayPick(defaultMedDayPick());
                    setMedKind('scheduled');
                  }}
                  style={[ghostCapsule.style, { marginTop: 8 }]}
                  contentStyle={ghostCapsule.contentStyle}
                  labelStyle={ghostCapsule.labelStyle}
                  accessibilityLabel="Cancel medication edit"
                >
                  Cancel edit
                </Button>
              ) : null}
            </Card.Content>
          </Card>
        </View>

        {/* View history */}
        <View style={{ marginBottom: sectionSpacing, alignItems: 'flex-start' }}>
          <Button
            mode="text"
            icon="history"
            onPress={() => setShowHistory(true)}
            accessibilityLabel="View medication history"
            style={ghostCapsule.style}
            contentStyle={ghostCapsule.contentStyle}
            labelStyle={ghostCapsule.labelStyle}
          >
            View history
          </Button>
        </View>
      </ScrollView>

      <Portal>
        {showHistory ? (
          <Card
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingBottom: 32,
              backgroundColor: cardSurface,
            }}
          >
            <Card.Title
              title="History (last 7 days)"
              right={(props: any) => (
                <IconButton {...props} icon="close" onPress={() => setShowHistory(false)} accessibilityLabel="Close history" />
              )}
            />
            <Card.Content style={{ maxHeight: '65%' }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 8, rowGap: 8, marginBottom: 12 }}>
                <Chip selected={!filterMedId} onPress={() => setFilterMedId(null)} accessibilityLabel="Filter history to all medications">
                  All
                </Chip>
                {meds.map((m: Med) => (
                  <Chip
                    key={m.id}
                    selected={filterMedId === m.id}
                    onPress={() => setFilterMedId(m.id!)}
                    accessibilityLabel={`Filter history to ${m.name}`}
                  >
                    {m.name}
                  </Chip>
                ))}
              </View>

              <ScrollView>
                {(logs ?? [])
                  .filter((log) => (!filterMedId ? true : log.med_id === filterMedId))
                  .sort((a, b) => looseDate(b as any).getTime() - looseDate(a as any).getTime())
                  .map((log) => (
                    <View
                      key={log.id}
                      style={{
                        paddingVertical: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: theme.colors.outlineVariant,
                      }}
                    >
                      <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                        {looseDate(log as any).toLocaleString()}
                      </Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {meds.find((m) => m.id === log.med_id)?.name ?? log.med_id} • {log.status}
                      </Text>
                    </View>
                  ))}
              </ScrollView>
            </Card.Content>
          </Card>
        ) : null}
      </Portal>
    </>
  );
}
