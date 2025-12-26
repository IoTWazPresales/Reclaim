import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Alert,
  View,
  ScrollView,
  AppState,
  AppStateStatus,
  LayoutChangeEvent,
  Animated,
  Easing,
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
import { ActionCard, SectionHeader } from '@/components/ui';
import { useAppTheme } from '@/theme';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { Med, MedLog } from '@/lib/api';
import {
  deleteMed,
  listMeds,
  parseSchedule,
  upsertMed,
  logMedDose,
  listMedLogsLastNDays,
  upcomingDoseTimes,
} from '@/lib/api';
import {
  useNotifications,
  cancelAllReminders,
  scheduleMedReminderActionable,
  cancelRemindersForMed,
  requestPermission,
} from '@/hooks/useNotifications';
import { useMedReminderScheduler } from '@/hooks/useMedReminderScheduler';
import { rescheduleRefillRemindersIfEnabled } from '@/lib/refillReminders';
import { InsightCard } from '@/components/InsightCard';
import { useScientificInsights } from '@/providers/InsightsProvider';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const LAST_SCHEDULE_KEY = '@reclaim/meds:lastScheduleAt:v1';
const REMINDERS_DISABLED_KEY = '@reclaim/meds:remindersDisabled:v1';

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
type MedLogCompat = MedLog & { scheduled_for?: string | null; created_at?: string | null };
function logWhenISO(l: MedLogCompat): string {
  return l.scheduled_for ?? l.taken_at ?? l.created_at ?? new Date().toISOString();
}
function looseDate(l: MedLogCompat): Date {
  return new Date(logWhenISO(l));
}

/* ---------- Basic validators for form UX ---------- */
function valTimesCSV(s: string) {
  // loose validator: HH:MM[,HH:MM]...
  return s.split(',').every((p) => /^\d{1,2}:\d{2}$/.test(p.trim()));
}
function valDaysCSVorRanges(s: string) {
  // Accepted: "1-5,7" or "1,2,6,7"
  return s.split(',').every((p) => /^([1-7])(-([1-7]))?$/.test(p.trim()));
}

export default function MedsScreen() {
  // Keep notif categories/listener alive
  useNotifications();
  const reduceMotion = useReducedMotion();

  const navigation = useNavigation<any>(); // MedsStack: navigate('MedDetails', { id })
  const route = useRoute<any>();
  const qc = useQueryClient();

  const { scheduleForMed } = useMedReminderScheduler();

  const theme = useTheme();
  const appTheme = useAppTheme();
  const sectionSpacing = appTheme.spacing.lg ?? 16;
  const cardRadius = 16;
  const cardSurface = appTheme.colors.surface;

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
  });

  const logsQ = useQuery({
    queryKey: ['meds_log:last7'],
    queryFn: async () => {
      try {
        return await listMedLogsLastNDays(7);
      } catch (error: any) {
        console.warn('MedsScreen: listMedLogsLastNDays error:', error?.message || error);
        return [];
      }
    },
    retry: false,
    throwOnError: false,
  });

  const meds = (Array.isArray(medsQ.data) ? medsQ.data : []) as Med[];
  const logs = (Array.isArray(logsQ.data) ? logsQ.data : []) as MedLog[];

  const scrollRef = useRef<ScrollView>(null);
  const dueTodayYRef = useRef(0);
  const focusProcessedRef = useRef(false);

  const [highlightKey, setHighlightKey] = useState<string | null>(null);
  const [highlightMedId, setHighlightMedId] = useState<string | null>(null);

  // Hero micro-motion (calm entrance): run on focus only (not on state updates)
  const heroOpacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const heroTranslateY = useRef(new Animated.Value(reduceMotion ? 0 : 8)).current;
  const heroSubOpacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const heroSubTranslateY = useRef(new Animated.Value(reduceMotion ? 0 : 8)).current;

  useFocusEffect(
    useCallback(() => {
      if (reduceMotion) {
        heroOpacity.setValue(1);
        heroTranslateY.setValue(0);
        heroSubOpacity.setValue(1);
        heroSubTranslateY.setValue(0);
        return;
      }

      heroOpacity.setValue(0);
      heroTranslateY.setValue(8);
      heroSubOpacity.setValue(0);
      heroSubTranslateY.setValue(8);

      const ease = Easing.out(Easing.cubic);
      const duration = 200;
      const staggerMs = 70;

      Animated.parallel([
        Animated.timing(heroOpacity, { toValue: 1, duration, easing: ease, useNativeDriver: true }),
        Animated.timing(heroTranslateY, { toValue: 0, duration, easing: ease, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(staggerMs),
          Animated.parallel([
            Animated.timing(heroSubOpacity, { toValue: 1, duration, easing: ease, useNativeDriver: true }),
            Animated.timing(heroSubTranslateY, { toValue: 0, duration, easing: ease, useNativeDriver: true }),
          ]),
        ]),
      ]).start();
    }, [reduceMotion, heroOpacity, heroTranslateY, heroSubOpacity, heroSubTranslateY]),
  );

  // ----- Scientific Insights -----
  const {
    insight,
    insights,
    status: insightStatus,
    refresh: refreshInsight,
    enabled: insightsEnabled,
    error: insightError,
  } = useScientificInsights();
  const [insightActionBusy, setInsightActionBusy] = useState(false);
  const medsInsight = useMemo(() => {
    return (insights ?? []).find((ins) => ins.sourceTag?.toLowerCase().startsWith('meds')) || insight;
  }, [insight, insights]);

  // ----- Hero: Medication Stability -----
  const stability = useMemo(() => {
    const activeMeds = meds.length;

    // Doses due today (all occurrences)
    const today = startOfToday();
    const end = endOfToday();
    let dosesToday = 0;
    for (const m of meds) {
      const todays = getTodaysDoses(m.schedule, today);
      dosesToday += todays.filter((dt) => isSameDay(dt, today) && dt <= end).length;
    }

    // Next upcoming dose (across all meds)
    let nextDose: Date | null = null;
    for (const m of meds) {
      const nextTimes = upcomingDoseTimes(m.schedule as any, 3);
      for (const dt of nextTimes) {
        if (!nextDose || dt.getTime() < nextDose.getTime()) nextDose = dt;
      }
    }

    // Adherence pct (last 7d) from logs
    const taken = logs.filter((l) => l.status === 'taken').length;
    const scheduled = logs.length || 1;
    const adherencePct7d = Math.round((taken / scheduled) * 100);

    // Missed in last 48h
    const now = Date.now();
    const twoDaysAgo = now - 48 * 60 * 60 * 1000;
    const missed48h = logs.filter(
      (l) =>
        l.status === 'missed' &&
        (l as any).scheduled_for &&
        new Date((l as any).scheduled_for).getTime() >= twoDaysAgo,
    ).length;

    let state = 'Steady Routine';
    let emoji = '🌿';
    let subtitle: string | undefined;

    if (missed48h >= 2 || adherencePct7d < 60) {
      state = 'Unstable Timing';
      emoji = '⏳';
      subtitle = 'Let’s anchor the next dose to a simple daily habit.';
    } else if (missed48h === 1 || adherencePct7d < 75) {
      state = 'Minor Drift';
      emoji = '🌗';
      subtitle = 'Small slips happen—line up the next dose with something you always do.';
    } else if (adherencePct7d >= 90 && missed48h === 0) {
      state = 'Steady Routine';
      emoji = '🌿';
      subtitle = 'Your schedule is holding steady. Keep the same anchor points.';
    } else {
      state = 'Rebuilding Consistency';
      emoji = '🌱';
      subtitle = 'Start with the very next dose—same time, same cue each day.';
    }

    const nextDoseLabel = nextDose ? nextDose.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : null;

    return {
      title: `${emoji} ${state}`,
      subtitle,
      chips: [
        { label: 'Active meds', value: String(activeMeds || 0) },
        { label: 'Doses today', value: String(dosesToday || 0) },
        ...(nextDoseLabel ? [{ label: 'Next dose', value: nextDoseLabel }] : []),
      ],
    };
  }, [meds, logs]);

  // Today’s plan summary (purely presentational)
  const todaysPlan = useMemo(() => {
    const today = startOfToday();
    const end = endOfToday();

    let dosesToday = 0;
    for (const m of meds) {
      const todays = getTodaysDoses(m.schedule, today);
      dosesToday += todays.filter((dt) => isSameDay(dt, today) && dt <= end).length;
    }

    const logsToday = logs.filter((l) => {
      const t = (l as any).scheduled_for ?? l.taken_at ?? (l as any).created_at;
      if (!t) return false;
      return isSameDay(new Date(t), today);
    });

    const taken = logsToday.filter((l) => l.status === 'taken').length;
    const skipped = logsToday.filter((l) => l.status === 'skipped').length;
    const missed = logsToday.filter((l) => l.status === 'missed').length;

    let nextDose: Date | null = null;
    for (const m of meds) {
      const nextTimes = upcomingDoseTimes(m.schedule as any, 3);
      for (const dt of nextTimes) {
        if (!nextDose || dt.getTime() < nextDose.getTime()) nextDose = dt;
      }
    }
    const nextDoseLabel = nextDose
      ? nextDose.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : 'None scheduled soon';

    return { dosesToday, taken, skipped, missed, nextDoseLabel };
  }, [meds, logs]);

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
    refreshReminderStatus().catch(() => {});
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
          await scheduleAllSilent().catch(() => {});
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meds_log:last7'] }),
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
  const [times, setTimes] = useState('08:00,21:00'); // CSV
  const [days, setDays] = useState('1-7'); // CSV or ranges

  const addMut = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Name required');
      if (!valTimesCSV(times)) throw new Error('Times must be CSV of HH:MM (e.g., 08:00,21:00)');
      if (!valDaysCSVorRanges(days)) throw new Error('Days must be CSV of 1..7 or ranges like 1-5');
      const schedule = parseSchedule(times, days);
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
      setTimes('08:00,21:00');
      setDays('1-7');

      await qc.invalidateQueries({ queryKey: ['meds'] });

      try {
        await cancelRemindersForMed(savedMed.id!);
        await scheduleForMed(savedMed);
        await rescheduleRefillRemindersIfEnabled();
      } catch {
        // silent
      }

      Alert.alert('Saved', 'Medication saved and reminders scheduled for the next 24h.');
    },
    onError: (e: any) => Alert.alert('Error', e?.message ?? 'Failed to save med'),
  });

  const scheduleAll = async () => {
    try {
      if (!meds?.length) {
        Alert.alert('Nothing to schedule', 'Add a medication first.');
        return;
      }
      await cancelAllReminders();
      let count = 0;
      for (const m of meds) {
        await scheduleForMed(m);
        count++;
      }
      await rescheduleRefillRemindersIfEnabled();
      Alert.alert('Reminders set', `Scheduled reminders for ${count} medication${count === 1 ? '' : 's'} (next 24h each).`);
    } catch (e: any) {
      Alert.alert('Scheduling error', e?.message ?? 'Failed to schedule');
    }
  };

  const schedulePreview = useCallback((m: Med) => {
    const s = m.schedule;
    const timesPreview = s?.times?.join(', ') ?? '';
    const daysPreview = s?.days?.join(', ') ?? '';
    return s ? `Times: ${timesPreview} • Days: ${daysPreview}` : 'No schedule';
  }, []);

  // ---------- Due Today block: status chip + highlight ----------
  const dueTodayItems = useMemo(() => {
    const today = startOfToday();
    const end = endOfToday();
    if (!Array.isArray(meds) || meds.length === 0) return [];

    const rows: Array<{ key: string; med: Med; dueISO: string; past: boolean; logged?: MedLog }> = [];

    for (const m of meds) {
      const all = getTodaysDoses(m.schedule, today);
      for (const dt of all) {
        if (isSameDay(dt, today) && dt <= end) {
          const isPast = dt.getTime() < Date.now();

          const logged = logs.find((l) => {
            if (l.med_id !== m.id) return false;
            const sf = (l as MedLogCompat).scheduled_for;
            if (!sf) return false;
            return Math.abs(new Date(sf).getTime() - dt.getTime()) < 60_000; // within 1 minute
          });

          rows.push({
            key: `${m.id}-${dt.toISOString()}`,
            med: m,
            dueISO: dt.toISOString(),
            past: isPast,
            logged,
          });
        }
      }
    }

    rows.sort((a, b) => a.dueISO.localeCompare(b.dueISO));
    return rows;
  }, [meds, logs]);

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
          paddingTop: 16,
          paddingBottom: 140,
          backgroundColor: theme.colors.background,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero: Medication Stability */}
        <View>
          <ActionCard icon="pill" style={{ marginBottom: sectionSpacing }} contentContainerStyle={{ flexDirection: 'column', gap: 8 }}>
            <View style={{ position: 'relative' }}>
              <View style={{ position: 'relative', zIndex: 1 }}>
                <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                  {stability.title}
                </Text>
                {stability.subtitle ? (
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    {stability.subtitle}
                  </Text>
                ) : null}
                <Animated.View style={{ opacity: heroSubOpacity, transform: [{ translateY: heroSubTranslateY }] }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                    {stability.chips.map((chip) => (
                      <Chip
                        key={chip.label}
                        mode="outlined"
                        compact
                        style={{
                          borderRadius: 10,
                          backgroundColor: theme.colors.surfaceVariant,
                          borderWidth: 1,
                          borderColor: theme.colors.outlineVariant,
                        }}
                        contentStyle={{ paddingHorizontal: 10, paddingVertical: 2 }}
                        textStyle={{ fontSize: 13, lineHeight: 18, color: theme.colors.onSurfaceVariant, opacity: 0.9 }}
                      >
                        {chip.value} • {chip.label}
                      </Chip>
                    ))}
                  </View>
                </Animated.View>
              </View>
            </View>
          </ActionCard>
        </View>

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
                    <Button mode="text" compact onPress={() => refreshInsight('meds-retry').catch(() => {})}>
                      Try again
                    </Button>
                  </Card.Content>
                </Card>
              ) : null}

              {medsInsight && insightStatus === 'ready' ? (
                <InsightCard
                  insight={medsInsight}
                  onRefreshPress={() => refreshInsight('meds-manual').catch(() => {})}
                  onActionPress={() => {
                    if (insightActionBusy) return;
                    setInsightActionBusy(true);
                    refreshInsight('meds-action')
                      .catch(() => {})
                      .finally(() => setInsightActionBusy(false));
                  }}
                  isProcessing={insightActionBusy}
                  disabled={insightActionBusy}
                  testID="meds-insight-card"
                />
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

        {/* Today’s plan (SectionHeader moved INSIDE card) */}
        <View style={{ marginBottom: sectionSpacing }}>
          <Card mode="elevated" style={{ borderRadius: cardRadius, backgroundColor: cardSurface }}>
            <Card.Content>
              <SectionHeader title="Today’s plan" icon="calendar-today" />
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginTop: 8 }}>
                Doses today: {todaysPlan.dosesToday}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginTop: 4 }}>
                Logged today — Taken: {todaysPlan.taken} · Skipped: {todaysPlan.skipped} · Missed: {todaysPlan.missed}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginTop: 4 }}>
                Next dose: {todaysPlan.nextDoseLabel}
              </Text>
            </Card.Content>
          </Card>
        </View>

        {/* Reminders status (SectionHeader moved INSIDE card) */}
        <View style={{ marginBottom: sectionSpacing }}>
          <Card mode="elevated" style={{ borderRadius: cardRadius, backgroundColor: cardSurface }}>
            <Card.Content>
              <SectionHeader title="Reminders" icon="bell-ring-outline" />

              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginTop: 8 }}>
                Permission: {permStatus}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, marginTop: 4 }}>
                Scheduled: {totalScheduled} total • {next24hScheduled} in next 24h
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                Last scheduled at: {lastScheduleAt ? new Date(lastScheduleAt).toLocaleString() : 'Not yet'}
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

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 8, rowGap: 8, marginTop: 10 }}>
                <Button
                  mode="outlined"
                  onPress={() =>
                    requestPermission()
                      .then(async () => {
                        await AsyncStorage.setItem(REMINDERS_DISABLED_KEY, 'false');
                        await scheduleAllSilent().catch(() => {});
                        await refreshReminderStatus();
                      })
                      .catch(() => {})
                  }
                >
                  Enable reminders
                </Button>

                <Button mode="contained" onPress={() => scheduleAllSilent().catch(() => {})} disabled={medsQ.isLoading}>
                  Reschedule now
                </Button>

                <Button
                  mode="text"
                  onPress={() =>
                    cancelAllReminders()
                      .then(async () => {
                        await AsyncStorage.removeItem(LAST_SCHEDULE_KEY);
                        await AsyncStorage.setItem(REMINDERS_DISABLED_KEY, 'true');
                        await refreshReminderStatus();
                      })
                      .catch(() => {})
                  }
                >
                  Clear all
                </Button>
              </View>
            </Card.Content>
          </Card>
        </View>

        {/* Due today (SectionHeader moved INSIDE card) */}
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
                <SectionHeader title="Due today" icon="calendar-clock" />

                {dueTodayItems.map(({ key, med, dueISO, past, logged }, index) => {
                  const isHighlight = highlightKey === key;

                  const status = logged?.status
                    ? logged.status === 'taken'
                      ? { label: 'Taken', icon: 'check-circle-outline' as const }
                      : logged.status === 'skipped'
                        ? { label: 'Skipped', icon: 'minus-circle-outline' as const }
                        : { label: 'Missed', icon: 'alert-circle-outline' as const }
                    : past
                      ? { label: 'Past', icon: 'clock-outline' as const }
                      : { label: 'Due', icon: 'timer-sand' as const };

                  return (
                    <View
                      key={key}
                      style={{
                        paddingVertical: 12,
                        borderTopWidth: index === 0 ? 0 : 1,
                        borderTopColor: theme.colors.outlineVariant,
                        backgroundColor: isHighlight ? theme.colors.secondaryContainer : undefined,
                        borderRadius: isHighlight ? 10 : 0,
                        paddingHorizontal: isHighlight ? 8 : 0,
                        marginTop: index === 0 ? 8 : 0,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <View style={{ flex: 1 }}>
                          <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                            {new Date(dueISO).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} • {med.name}
                            {med.dose ? ` — ${med.dose}` : ''}
                          </Text>
                          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                            {schedulePreview(med)}
                          </Text>
                        </View>

                        <Chip
                          mode="outlined"
                          compact
                          icon={status.icon}
                          style={{
                            borderRadius: 999,
                            backgroundColor: theme.colors.surfaceVariant,
                            borderColor: theme.colors.outlineVariant,
                          }}
                          textStyle={{ color: theme.colors.onSurfaceVariant, fontWeight: '700' }}
                        >
                          {status.label}
                        </Chip>
                      </View>

                      <View style={{ flexDirection: 'row', marginTop: 10, columnGap: 8, rowGap: 8, flexWrap: 'wrap' }}>
                        {logged?.status === 'taken' ? (
                          <>
                            <Button mode="contained-tonal" disabled>
                              Taken
                            </Button>
                            <Button
                              mode="outlined"
                              onPress={() => {
                                Alert.alert(
                                  'Already logged',
                                  'This dose has already been logged as taken. To change it, please delete the log entry first.',
                                  [{ text: 'OK' }],
                                );
                              }}
                            >
                              Reset
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              mode="contained"
                              onPress={() => logMut.mutate({ med_id: med.id!, status: 'taken', scheduled_for: dueISO })}
                            >
                              Take
                            </Button>
                            <Button
                              mode="outlined"
                              onPress={() => logMut.mutate({ med_id: med.id!, status: 'skipped', scheduled_for: dueISO })}
                            >
                              Skip
                            </Button>
                            <Button
                              mode="text"
                              textColor={theme.colors.error}
                              onPress={() => logMut.mutate({ med_id: med.id!, status: 'missed', scheduled_for: dueISO })}
                            >
                              Missed
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

        {/* Active medications (NO accordion; inline Edit/Delete; SectionHeader moved INSIDE card) */}
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
                  Add your first medication below to start scheduling reminders and tracking adherence.
                </Text>
              </Card.Content>
            </Card>
          ) : (
            <Card mode="elevated" style={{ borderRadius: cardRadius, backgroundColor: cardSurface }}>
              <Card.Content style={{ paddingHorizontal: 0, paddingVertical: 10 }}>
                <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
                  <SectionHeader title="Active medications" icon="pill" />
                </View>

                {meds.map((m, idx) => {
                  const isHighlight = highlightMedId === m.id;
                  const desc = m.dose ? `${m.dose} • ${schedulePreview(m)}` : schedulePreview(m);

                  return (
                    <View
                      key={m.id ?? m.name}
                      style={{
                        backgroundColor: isHighlight ? theme.colors.secondaryContainer : undefined,
                        borderTopWidth: idx === 0 ? 0 : 1,
                        borderTopColor: theme.colors.outlineVariant,
                        paddingHorizontal: 8,
                        borderRadius: isHighlight ? 12 : 0,
                      }}
                    >
                      <List.Item
                        title={m.name}
                        description={desc}
                        onPress={() => navigation.navigate('MedDetails', { id: m.id! })}
                        left={(props:any) => <List.Icon {...props} icon="pill" />}
                        right={(props:any) => (
                          <View style={[props.style, { flexDirection: 'row', alignItems: 'center' }]}>
                            <IconButton
                              icon="pencil-outline"
                              size={18}
                              iconColor={props.color}
                              onPress={() => {
                                setEditingId(m.id!);
                                setName(m.name);
                                setDose(m.dose ?? '');
                                setTimes(m.schedule?.times?.join(',') ?? '08:00,21:00');
                                setDays(m.schedule?.days?.join(',') ?? '1-7');
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

              <TextInput
                mode="outlined"
                label="Times (HH:MM CSV)"
                value={times}
                onChangeText={setTimes}
                placeholder="08:00,21:00"
                accessibilityLabel="Medication times"
                keyboardType="numbers-and-punctuation"
              />
              <HelperText type="error" visible={!valTimesCSV(times)} style={{ marginBottom: 12 }}>
                Use HH:MM separated by commas (e.g. 08:00,21:00)
              </HelperText>

              <TextInput
                mode="outlined"
                label="Days (1=Mon…7=Sun; CSV or ranges)"
                value={days}
                onChangeText={setDays}
                placeholder="1-7"
                accessibilityLabel="Medication schedule days"
                keyboardType="numbers-and-punctuation"
              />
              <HelperText type="error" visible={!valDaysCSVorRanges(days)} style={{ marginBottom: 12 }}>
                Use numbers 1-7 or ranges like 1-5 separated by commas.
              </HelperText>

              <Button
                mode="contained"
                onPress={() => addMut.mutate()}
                loading={addMut.isPending}
                accessibilityLabel={editingId ? 'Update medication' : 'Save medication'}
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
                    setTimes('08:00,21:00');
                    setDays('1-7');
                  }}
                  style={{ marginTop: 8 }}
                  accessibilityLabel="Cancel medication edit"
                >
                  Cancel edit
                </Button>
              ) : null}
            </Card.Content>
          </Card>
        </View>

        {/* Quick actions (SectionHeader moved INSIDE card) */}
        <View style={{ marginBottom: sectionSpacing }}>
          <Card mode="elevated" style={{ borderRadius: cardRadius, backgroundColor: cardSurface }}>
            <Card.Content>
              <SectionHeader title="Quick actions" icon="flash" />

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 12, marginTop: 10 }}>
                <Button mode="contained" onPress={scheduleAll} accessibilityLabel="Schedule reminders for all medications">
                  Schedule reminders
                </Button>

                <Button
                  mode="outlined"
                  onPress={async () => {
                    await cancelAllReminders();
                    Alert.alert('Cleared', 'All reminders canceled.');
                  }}
                  accessibilityLabel="Clear all medication reminders"
                >
                  Clear reminders
                </Button>

                <Button mode="text" onPress={() => setShowHistory(true)} accessibilityLabel="View medication history">
                  View history
                </Button>

                <Button
                  mode="outlined"
                  icon="bell-ring"
                  onPress={async () => {
                    try {
                      const med = meds[0];
                      if (!med) {
                        Alert.alert('Add a medication first');
                        return;
                      }
                      const when = new Date(Date.now() + 10_000);
                      await scheduleMedReminderActionable({
                        medId: med.id!,
                        medName: med.name,
                        doseTimeISO: when.toISOString(),
                        title: `Time to take ${med.name}`,
                        body: med.dose ? `Dose: ${med.dose}` : undefined,
                      });
                      Alert.alert('Test scheduled', `Actionable reminder for "${med.name}" in ~10 seconds.`);
                    } catch (e: any) {
                      Alert.alert('Notification error', e?.message ?? 'Failed to schedule test notification');
                    }
                  }}
                  accessibilityLabel="Schedule a test actionable reminder"
                >
                  Test reminder in 10s
                </Button>
              </View>
            </Card.Content>
          </Card>
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
