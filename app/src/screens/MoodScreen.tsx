// C:\Reclaim\app\src\screens\MoodScreen.tsx

import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { Alert, Linking, View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Card,
  Chip,
  HelperText,
  Switch,
  Text,
  TextInput,
  useTheme,
  Portal,
} from 'react-native-paper';

import { InformationalCard, ReclaimButton } from '@/components/ui';
import { FirstVisitCoach } from '@/components/ui/FirstVisitCoach';
import { MoodHistoryRow } from '@/components/mood/MoodHistoryRow';
import { MoodWeatherGlyph } from '@/components/mood/MoodWeatherGlyph';
import { MoodHero } from '@/components/dashboard/MoodHero';
import { SchedulingCard } from '@/components/SchedulingCard';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import { useAppTheme } from '@/theme';
import {
  reclaimChip,
  reclaimGuidedActionCardShell,
  reclaimUtilityCardSurface,
} from '@/theme/reclaimVisualLanguage';
import {
  reclaimBelowHeroContent,
  reclaimHeroBleedScroll,
  reclaimSectionSpacing,
} from '@/theme/reclaimScreenLayout';
import { reclaimTextRoles } from '@/theme/reclaimTypography';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  type MoodEntry,
  createMoodCheckin,
  getLocalDayDate,
  listCanonicalMoodEntriesForDays,
  listMoodCheckinsDays,
  listSleepSessions, // ✅ sleep sessions
  listMedicationEvents, // ✅ meds events (wrapper: remote -> local)
} from '@/lib/api';
import { MOOD_CANONICAL_QUERY_KEY } from '@/lib/mood/moodQueryInvalidation';

import {
  ensureNotificationPermission,
} from '@/hooks/useNotifications';
import { reconcileNotifications, forceRescheduleNotifications } from '@/lib/notifications/NotificationScheduler';

import { InsightCard } from '@/components/InsightCard';
import { getNotificationPreferences, updateNotificationPreferences } from '@/lib/notificationPreferences';
import { useScientificInsights } from '@/providers/InsightsProvider';
import { useInsightForScreen } from '@/lib/insights/useInsightForScreen';
import type { InsightScope } from '@/lib/insights/pickInsightForScreen';
import { logTelemetry } from '@/lib/telemetry';
import { logger } from '@/lib/logger';
import { useAuth } from '@/providers/AuthProvider';
import { CRISIS_HELPLINE_LABEL, CRISIS_HELPLINE_URL } from '@/lib/storeCompliance';
import { gradeForecastWithMood } from '@/lib/forecastJournal';
import { moodWeather } from '@/lib/mood/moodWeather';
import { groupMoodHistoryByWeek } from '@/lib/mood/moodHistoryWeekGroups';
import {
  dismissMoodFirstVisitGuide,
  isMoodFirstVisitGuideDismissed,
} from '@/lib/firstRunGuide';

/** Stable preferred scopes for MoodScreen (avoids new array ref every render) */
const MOOD_PREFERRED_SCOPES: InsightScope[] = ['mood', 'global'];

/* ---------- helpers ---------- */
function daysAgo(n: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}
function dayKeyZA(d: Date | string) {
  const t = typeof d === 'string' ? new Date(d) : d;
  return getLocalDayDate(t);
}
function addDaysISO(dayIso: string, delta: number) {
  const d = new Date(`${dayIso}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}
function shiftMapDays(map: Map<string, number>, deltaDays: number) {
  // deltaDays = +1 means: X on 2025-12-01 applies to mood on 2025-12-02
  const out = new Map<string, number>();
  for (const [k, v] of map.entries()) out.set(addDaysISO(k, deltaDays), v);
  return out;
}
function formatDayPretty(dayIso: string) {
  const d = new Date(dayIso);
  if (isNaN(d.getTime())) return dayIso;
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}
function sign(n: number) {
  if (!Number.isFinite(n) || n === 0) return '±';
  return n > 0 ? '+' : '';
}
function fmtDelta(n: number): string {
  if (!Number.isFinite(n) || Math.abs(n) < 0.5) return 'No change';
  const r = Math.round(n);
  return r > 0 ? `+${r}` : `${r}`;
}
function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

/* ---------- confidence + cause linking helpers ---------- */
function confidenceFromDays(days: number) {
  // 0d -> 0%, 3d ~45%, 7d ~75%, 14d+ ~90%
  const pct = Math.round(100 * (1 - Math.exp(-days / 6)));
  const confPct = clamp(pct, 0, 95);

  let label: 'Low' | 'Medium' | 'High' = 'Low';
  if (confPct >= 75) label = 'High';
  else if (confPct >= 45) label = 'Medium';

  return { confPct, label };
}

function pearson(xs: number[], ys: number[]) {
  if (xs.length !== ys.length || xs.length < 4) return undefined;
  const n = xs.length;

  const meanLocal = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / n;
  const mx = meanLocal(xs);
  const my = meanLocal(ys);

  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const vx = xs[i] - mx;
    const vy = ys[i] - my;
    num += vx * vy;
    dx += vx * vx;
    dy += vy * vy;
  }
  const den = Math.sqrt(dx * dy);
  if (!den) return undefined;
  return num / den;
}

function correlateByDay(moodByDay: Map<string, number>, xByDay?: Map<string, number>) {
  if (!xByDay) return { r: undefined as number | undefined, n: 0 };

  const keys: string[] = [];
  for (const k of moodByDay.keys()) {
    if (xByDay.has(k)) keys.push(k);
  }
  keys.sort();

  const xs: number[] = [];
  const ys: number[] = [];
  for (const k of keys) {
    const m = moodByDay.get(k);
    const x = xByDay.get(k);
    if (typeof m === 'number' && typeof x === 'number' && isFinite(m) && isFinite(x)) {
      ys.push(m);
      xs.push(x);
    }
  }

  const r = pearson(xs, ys);
  return { r, n: xs.length };
}

function bestCorrelation(
  moodByDay: Map<string, number>,
  xByDay?: Map<string, number>,
  opts?: { preferLag?: boolean },
) {
  if (!xByDay) return { r: undefined as number | undefined, n: 0, mode: 'none' as const };

  const same = correlateByDay(moodByDay, xByDay);
  const prev = correlateByDay(moodByDay, shiftMapDays(xByDay, +1));

  const sameOk = same.n >= 4 && typeof same.r === 'number' && Number.isFinite(same.r);
  const prevOk = prev.n >= 4 && typeof prev.r === 'number' && Number.isFinite(prev.r);

  if (!sameOk && !prevOk) {
    if (prev.n > same.n) return { ...prev, mode: 'prev' as const };
    return { ...same, mode: 'same' as const };
  }
  if (sameOk && !prevOk) return { ...same, mode: 'same' as const };
  if (!sameOk && prevOk) return { ...prev, mode: 'prev' as const };

  const pickPrev = Math.abs(prev.r!) >= Math.abs(same.r!);
  if (opts?.preferLag && Math.abs(prev.r!) === Math.abs(same.r!)) return { ...prev, mode: 'prev' as const };
  return pickPrev ? { ...prev, mode: 'prev' as const } : { ...same, mode: 'same' as const };
}

function causeLinkCopyGeneric(args: { driver: string; r?: number; n: number }) {
  const { driver, r, n } = args;
  const short = driver === 'Sleep' ? 'sleep' : 'medication rhythm';

  if (!n) {
    return {
      title: `${driver} & mood`,
      body: `When ${short} is synced, we can line it up with your mood logs on the same calendar days. Connect your health source in Integrations to start.`,
    };
  }

  if (r === undefined) {
    return {
      title: `${driver} & mood`,
      body: `We’re building this picture (${n} overlapping day${n === 1 ? '' : 's'} so far). A few more quick check-ins usually make the pattern easier to read — no rush.`,
    };
  }

  const strength = Math.abs(r);
  const dir =
    r > 0
      ? `On days when ${short} looks stronger, mood tended to be a bit higher`
      : `On days when ${short} dipped, mood sometimes dipped too — worth a gentle look, not a verdict`;

  if (strength < 0.2)
    return {
      title: `${driver} & mood`,
      body: `Across the last ${n} matched days, nothing stands out as a steady link. That often means other factors are louder — we’ll keep watching as you log.`,
    };
  if (strength < 0.45)
    return {
      title: `${driver} & mood`,
      body: `A soft pattern across ${n} days: ${dir}. Treat it as a hint to notice, not a rule.`,
    };
  if (strength < 0.7)
    return {
      title: `${driver} & mood`,
      body: `A moderate pattern across ${n} days: ${dir}. Useful context alongside how you actually felt.`,
    };
  return {
    title: `${driver} & mood`,
    body: `A clearer pattern across ${n} days: ${dir}. Still one lens among many — your lived experience matters most.`,
  };
}

/* ---------- preset tags ---------- */
const TAGS = ['energized', 'calm', 'focused', 'social', 'anxious', 'low', 'irritable', 'overwhelmed', 'tired', 'in_pain'];

/* ---------- trend helpers ---------- */
function mean(values: number[]): number | undefined {
  if (!values.length) return undefined;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
function mad(values: number[]): number | undefined {
  if (values.length < 2) return undefined;
  const m = mean(values);
  if (m === undefined) return undefined;
  const devs = values.map((v) => Math.abs(v - m));
  return mean(devs);
}

function deriveHeroState(current: number | undefined, history: MoodEntry[]) {
  const sorted = [...history].sort((a, b) => (b.day_date ?? b.created_at).localeCompare(a.day_date ?? a.created_at));
  const todayKey = dayKeyZA(new Date());
  const past = sorted.filter((m) => dayKeyZA(m.day_date ?? m.created_at) !== todayKey);
  const last7 = past.slice(0, 7);

  if (!current || last7.length < 3) {
    return {
      title: 'Settling in',
      deltas: ['→ Mood'],
      subtitle: 'Log a few days to see your trend.',
    };
  }

  const values = last7.map((m) => m.rating);
  const baseline = mean(values) ?? current;
  const delta = current - baseline;
  const direction =
    delta >= 1 ? 'lifting vs recent days' : delta <= -1 ? 'below your recent average' : 'near your recent average';

  const vol = mad(values);
  const volatile = vol !== undefined ? vol > 1.6 : false;

  // Hero headers carry no emoji — the orbit art conveys the state.
  let stateLabel = 'Clear';
  if (volatile) {
    stateLabel = 'Turbulent';
  } else if (current <= 4) {
    stateLabel = 'Heavy';
  } else if (current <= 6) {
    stateLabel = 'Cloudy';
  }

  const title = `${stateLabel} — ${direction}`;

  const deltas: string[] = [];
  if (delta >= 1) deltas.push('↑ Mood');
  else if (delta <= -1) deltas.push('↓ Mood');
  else deltas.push('→ Mood');

  const subtitle = (() => {
    if (volatile) return 'Mood swings are wider this week.';
    if (stateLabel === 'Heavy' && delta >= 1) return 'Mood improving, still on the heavier side.';
    if (stateLabel === 'Clear' && delta > -1 && delta < 1) return 'Steady window — keep it light.';
    return undefined;
  })();

  return { title, deltas, subtitle, delta, volatile, stateLabel };
}

const NEGATIVE_MOOD_TAGS = new Set(['anxious', 'low', 'irritable', 'overwhelmed', 'tired', 'in_pain']);

function microInsightCopy(context: { delta?: number; volatile?: boolean; state?: string; hasHistory: boolean; tags?: string[] }) {
  if (!context.hasHistory) return 'Log a few days of mood to unlock trend-based insights.';
  const { delta, volatile, state, tags = [] } = context;

  const negTags = tags.filter((t) => NEGATIVE_MOOD_TAGS.has(t));
  const negNote =
    negTags.length > 0
      ? ` You noted ${negTags.slice(0, 2).map((t) => t.replace('_', ' ')).join(' and ')} — that context sits alongside the score.`
      : '';

  if (volatile) {
    return 'This week looks emotionally noisy. When swings widen, it can feel like the brain stays on light threat-scan even when nothing is wrong. Keep decisions small today.';
  }
  if (state === 'Heavy' && delta !== undefined && delta >= 1) {
    return 'Mood is still on the heavier side, but the trend is improving. This often happens when stress drops before energy fully returns. Aim for one easy win.';
  }
  if (state === 'Clear' && (delta === undefined || (delta > -1 && delta < 1))) {
    return `You're in a stable window. When mood is steady, frustration tolerance and habit follow-through tend to improve. Use this to reinforce one routine.${negNote}`;
  }
  return `Noticing your pattern helps keep today predictable. Small, steady actions tend to work best on days like this.${negNote}`;
}

/* ---------- history helpers ---------- */
function buildHistoryMeta(entry: MoodEntry, allSeries: MoodEntry[]) {
  const key = dayKeyZA(entry.day_date ?? entry.created_at);
  const prev = allSeries
    .filter((x) => dayKeyZA(x.day_date ?? x.created_at) < key)
    .sort((a, b) => (b.day_date ?? b.created_at).localeCompare(a.day_date ?? a.created_at));

  const last7 = prev.slice(0, 7);
  const windowN = last7.length;
  if (windowN < 3) return { windowN };

  const vals = last7.map((x) => x.rating);
  const baseline7 = mean(vals);
  const vol = mad(vals);
  const volatile7 = vol !== undefined ? vol > 1.6 : false;
  const delta7 = baseline7 !== undefined ? entry.rating - baseline7 : undefined;

  return { delta7, volatile7, baseline7, windowN };
}

/* ✅ build Sleep hours per ZA day (YYYY-MM-DD) */
function sleepHoursByDayZA(
  sessions: Array<{ start_time: string; end_time: string; duration_minutes?: number | null }>,
) {
  const byDay = new Map<string, number>();

  for (const s of sessions ?? []) {
    if (!s?.start_time || !s?.end_time) continue;

    let minutes =
      typeof s.duration_minutes === 'number' && Number.isFinite(s.duration_minutes) && s.duration_minutes > 0
        ? s.duration_minutes
        : undefined;

    if (minutes === undefined) {
      const start = new Date(s.start_time).getTime();
      const end = new Date(s.end_time).getTime();
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
      minutes = Math.round((end - start) / 60000);
    }

    const hours = Math.max(0, minutes / 60);
    const k = dayKeyZA(new Date(s.start_time));
    byDay.set(k, (byDay.get(k) ?? 0) + hours);
  }

  return byDay;
}

/* ✅ build Medication adherence per ZA day (0..1) */
function medAdherenceByDayZA(
  events: Array<{ status: 'taken' | 'missed' | 'skipped'; taken_at?: string | null; scheduled_for?: string | null }>,
) {
  const taken = new Map<string, number>();
  const denom = new Map<string, number>();

  for (const e of events ?? []) {
    const whenISO = e.scheduled_for ?? e.taken_at ?? null;
    if (!whenISO) continue;

    const day = dayKeyZA(whenISO);
    if (e.status === 'skipped') continue;

    denom.set(day, (denom.get(day) ?? 0) + 1);
    if (e.status === 'taken') taken.set(day, (taken.get(day) ?? 0) + 1);
  }

  const out = new Map<string, number>();
  for (const [day, d] of denom.entries()) {
    const t = taken.get(day) ?? 0;
    out.set(day, d > 0 ? t / d : 0);
  }
  return out;
}

/* ---------- MiniBarSparkline (matches SleepHistorySection) ---------- */
function MiniBarSparkline({
  data,
  maxValue,
  height = 36,
  barWidth = 8,
  gap = 2,
  onBarPress,
}: {
  data: number[];
  maxValue?: number;
  height?: number;
  barWidth?: number;
  gap?: number;
  onBarPress?: (index: number) => void;
}) {
  const theme = useTheme();
  const max = Math.max(1, maxValue ?? (data.length ? Math.max(...data) : 1));
  const scale = (v: number) => Math.max(1, Math.round((Math.min(v, max) / max) * height));

  return (
    <View style={{ marginTop: 6, overflow: 'hidden', width: '100%' }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'nowrap' }}>
        {data.map((v, i) => {
          const bar = (
            <View
              style={{
                width: barWidth,
                height: scale(v),
                borderRadius: 4,
                backgroundColor: theme.colors.primary,
                opacity: v === 0 ? 0.2 : 1,
              }}
            />
          );
          return onBarPress ? (
            <Pressable
              key={`mood-bar-${i}`}
              onPress={() => onBarPress(i)}
              accessibilityRole="button"
              accessibilityLabel={`Mood day ${i + 1}, rating ${v}`}
              style={{ marginRight: i === data.length - 1 ? 0 : gap }}
            >
              {bar}
            </Pressable>
          ) : (
            <View key={`mood-bar-${i}`} style={{ marginRight: i === data.length - 1 ? 0 : gap }}>
              {bar}
            </View>
          );
        })}
      </View>
      <View pointerEvents="none" style={{ height, position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: theme.colors.outlineVariant,
          }}
        />
      </View>
    </View>
  );
}

/* ---------- MoodHistorySection (SleepHistorySection layout match) ---------- */
type MoodHistoryModalModel = MoodEntry & {
  __meta?: { delta7?: number; volatile7?: boolean; baseline7?: number; windowN: number };
};
type MoodHistorySectionProps = {
  entries: MoodEntry[];
  excludeDayKey?: string | null;
  onOpen: (entry: MoodHistoryModalModel) => void;
  outerCardStyle: object;
  scrollRef: React.RefObject<ScrollView | null>;
  scrollContentRef: React.RefObject<View | null>;
};
function MoodHistorySection({
  entries,
  excludeDayKey,
  onOpen,
  outerCardStyle,
  scrollRef,
  scrollContentRef,
}: MoodHistorySectionProps) {
  const theme = useTheme();
  const rowRefs = useRef<Record<string, View | null>>({});
  const [flashId, setFlashId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const out: MoodEntry[] = [];
    for (const e of entries ?? []) {
      const k = dayKeyZA(e.day_date ?? e.created_at);
      if (excludeDayKey && k === excludeDayKey) continue;
      out.push(e);
    }
    return out;
  }, [entries, excludeDayKey]);

  const history = useMemo(() => filtered.slice(0, 14), [filtered]);

  const ratingSeries = useMemo(() => {
    return history
      .map((e) => clamp(Number(e.rating ?? 0), 0, 10))
      .reverse();
  }, [history]);

  const avg7 = useMemo(() => {
    if (!ratingSeries.length) return null;
    const last7 = ratingSeries.slice(-7);
    const a = last7.reduce((sum, v) => sum + v, 0) / Math.max(1, last7.length);
    return Math.round(a * 10) / 10;
  }, [ratingSeries]);

  const weekGroups = useMemo(
    () => groupMoodHistoryByWeek(history, (e) => dayKeyZA(e.day_date ?? e.created_at)),
    [history],
  );

  const scrollToRow = useCallback(
    (rowId: string) => {
      const node = rowRefs.current[rowId];
      const content = scrollContentRef.current;
      const scroll = scrollRef.current;
      if (!node || !content || !scroll) return;
      node.measureLayout(
        content,
        (_x, y) => {
          scroll.scrollTo({ y: Math.max(0, y - 12), animated: true });
          setFlashId(rowId);
          setTimeout(() => setFlashId(null), 650);
        },
        () => {},
      );
    },
    [scrollContentRef, scrollRef],
  );

  const handleBarPress = useCallback(
    (index: number) => {
      const entryIndex = history.length - 1 - index;
      const entry = history[entryIndex];
      if (!entry) return;
      const k = dayKeyZA(entry.day_date ?? entry.created_at);
      scrollToRow(entry.id ?? k);
    },
    [history, scrollToRow],
  );

  if (!history.length) {
    return (
      <Card mode="elevated" style={outerCardStyle}>
        <Card.Content>
          <FeatureCardHeader icon="history" title="History" subtitle="Last 14 days" />
          <Text style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>No history yet.</Text>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card mode="elevated" style={outerCardStyle}>
      <Card.Content>
        <FeatureCardHeader icon="history" title="History" subtitle="Last 14 days" />
        <MiniBarSparkline
          data={ratingSeries.length ? ratingSeries : [0, 0, 0, 0, 0, 0, 0]}
          maxValue={10}
          height={72}
          barWidth={12}
          gap={4}
          onBarPress={handleBarPress}
        />
        <Text style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>
          7-day average: {avg7 !== null ? `${avg7}/10` : '—'}
        </Text>

        <View style={{ marginTop: 16 }}>
          {weekGroups.map((group) => (
            <View key={group.label} style={{ marginBottom: 12 }}>
              <Text
                style={{
                  color: theme.colors.onSurfaceVariant,
                  fontWeight: '800',
                  fontSize: 12,
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                {group.label}
              </Text>
              {group.entries.map((entry) => {
                const k = dayKeyZA(entry.day_date ?? entry.created_at);
                const rowId = entry.id ?? k;
                const meta = buildHistoryMeta(entry, entries);
                const volatile = !!(meta as { volatile7?: boolean }).volatile7;
                const delta = (meta as { delta7?: number }).delta7;
                const windowN = (meta as { windowN: number }).windowN ?? 0;

                return (
                  <View
                    key={rowId}
                    ref={(r) => {
                      rowRefs.current[rowId] = r;
                    }}
                    collapsable={false}
                  >
                    <MoodHistoryRow
                      rowKey={rowId}
                      dayLabel={formatDayPretty(k)}
                      rating={entry.rating}
                      volatile={volatile}
                      delta={delta}
                      windowN={windowN}
                      tagCount={(entry.tags ?? []).length}
                      flash={flashId === rowId}
                      onPress={() => onOpen({ ...entry, __meta: meta as MoodHistoryModalModel['__meta'] })}
                    />
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </Card.Content>
    </Card>
  );
}

/* ---------- MoodScreen ---------- */
export default function MoodScreen() {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const reduceMotion = useReducedMotion();
  const guidedShell = useMemo(() => reclaimGuidedActionCardShell(appTheme), [appTheme]);
  const utilitySurface = useMemo(() => reclaimUtilityCardSurface(appTheme), [appTheme]);
  const qc = useQueryClient();
  const { session } = useAuth();

  // Insights provider (don’t destructure `insight`)
  const insightsCtx = useScientificInsights();
  const rankedInsights = (insightsCtx as any)?.insights ?? [];
  const insightStatus = insightsCtx.status;
  const refreshInsight = insightsCtx.refresh;
  const insightsEnabled = insightsCtx.enabled;
  const insightError = insightsCtx.error;

  // Trend range like Sleep
  const [trendRange, setTrendRange] = useState<'7d' | '30d' | '365d'>('7d');

  const moodCanonicalQ = useQuery({
    queryKey: [...MOOD_CANONICAL_QUERY_KEY, 365] as const,
    queryFn: async () => {
      try {
        return await listCanonicalMoodEntriesForDays(365);
      } catch (error: any) {
        console.warn('MoodScreen: canonical mood error:', error?.message || error);
        return [];
      }
    },
    retry: false,
    throwOnError: false,
    staleTime: 3_600_000, // 1 hour
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const moodSeries: MoodEntry[] = useMemo(() => {
    return (moodCanonicalQ.data ?? []) as MoodEntry[];
  }, [moodCanonicalQ.data]);

  const moodSeriesSorted = useMemo(() => {
    return [...(moodSeries ?? [])].sort((a, b) =>
      (b.day_date ?? b.created_at).localeCompare(a.day_date ?? a.created_at),
    );
  }, [moodSeries]);

  const checkinsQ = useQuery({
    queryKey: ['mood:checkins:7d'],
    queryFn: async () => {
      try {
        return await listMoodCheckinsDays(7);
      } catch (error: any) {
        console.warn('MoodScreen: canonical mood checkins error:', error?.message || error);
        return [];
      }
    },
    retry: false,
    throwOnError: false,
    staleTime: 1_800_000, // 30 min
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const sleepSessionsQ = useQuery({
    queryKey: ['sleep:sessions:30d'],
    queryFn: async () => {
      try {
        return await listSleepSessions(30);
      } catch (error: any) {
        console.warn('MoodScreen: listSleepSessions error:', error?.message || error);
        return [];
      }
    },
    retry: false,
    throwOnError: false,
    staleTime: 600_000, // 10 min — keep mood↔sleep correlation fresh after sync
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const medEventsQ = useQuery({
    queryKey: ['meds:events:30d'],
    queryFn: async () => {
      try {
        return await listMedicationEvents(30);
      } catch (error: any) {
        console.warn('MoodScreen: listMedicationEvents error:', error?.message || error);
        return [];
      }
    },
    retry: false,
    throwOnError: false,
    staleTime: 3_600_000, // 1 hour
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const [rating, setRating] = useState<number>(7);
  const [note, setNote] = useState('');
  const [sel, setSel] = useState<string[]>([]);
  const [remindersOn, setRemindersOn] = useState<boolean>(false);
  const [insightActionBusy, setInsightActionBusy] = useState(false);
  const [dismissedInsightId, setDismissedInsightId] = useState<string | null>(null);

  const [reflection, setReflection] = useState<'yes' | 'somewhat' | 'no' | null>(null);
  const [reflectionNote, setReflectionNote] = useState('');

  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;
      void getNotificationPreferences().then((p) => {
        if (!cancelled) setRemindersOn(!!p.moodRemindersEnabled);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  useEffect(() => {
    let cancelled = false;
    const uid = session?.user?.id;
    if (!uid) {
      setShowMoodFirstVisitGuide(false);
      return;
    }
    void isMoodFirstVisitGuideDismissed(uid).then((dismissed) => {
      if (!cancelled) setShowMoodFirstVisitGuide(!dismissed);
    });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const handleDismissMoodFirstVisitGuide = useCallback(async () => {
    setShowMoodFirstVisitGuide(false);
    await dismissMoodFirstVisitGuide(session?.user?.id);
  }, [session?.user?.id]);

  const handleMoodCoachShowMe = useCallback(() => {
    const node = checkInRef.current;
    const content = scrollContentRef.current;
    const scroll = scrollRef.current;
    if (node && content && scroll) {
      node.measureLayout(
        content,
        (_x, y) => scroll.scrollTo({ y: Math.max(0, y - 12), animated: true }),
        () => {},
      );
    }
    void handleDismissMoodFirstVisitGuide();
  }, [handleDismissMoodFirstVisitGuide]);

  const handleToggleReminders = useCallback(
    async (value: boolean) => {
      try {
        if (value) {
          const ok = await ensureNotificationPermission();
          if (!ok) {
            Alert.alert('Permission needed', 'Please enable notifications in system settings.');
            setRemindersOn(false);
            return;
          }
        }
        // Update notification preferences
        await updateNotificationPreferences({ moodRemindersEnabled: value });
        // Trigger reconciliation to apply changes
        await forceRescheduleNotifications();
        setRemindersOn(value);
        Alert.alert(
          value ? 'Enabled' : 'Disabled',
          value
            ? 'Mood reminders will be scheduled at 08:00 and 20:00.'
            : 'Mood reminders disabled.',
        );
      } catch (e: any) {
        Alert.alert('Error', e?.message ?? 'Failed to update reminders');
      }
    },
    []
  );

  const moodLoading = moodCanonicalQ.isLoading && !moodCanonicalQ.data;
  const moodError = moodCanonicalQ.error && !moodCanonicalQ.data;

  const hero = useMemo(() => deriveHeroState(rating, moodSeries ?? []), [rating, moodSeries]);

  // ✅ Mood insight (Phase 6: scope-based selection, same as Sleep/Meds)
  const baseMoodInsight = useInsightForScreen(rankedInsights, session, {
    screen: 'mood',
    preferredScopes: MOOD_PREFERRED_SCOPES,
    allowGlobalFallback: true,
  });
  const moodInsight = useMemo(() => {
    if (!baseMoodInsight) return null;
    return {
      ...baseMoodInsight,
      why:
        baseMoodInsight.why ??
        microInsightCopy({
          delta: (hero as any).delta,
          volatile: (hero as any).volatile,
          state: (hero as any).stateLabel,
          hasHistory: (moodSeries?.length ?? 0) >= 3,
        }),
    };
  }, [baseMoodInsight, hero, moodSeries?.length]);

  const handleInsightAction = useCallback(async () => {
    if (!moodInsight) return;
    setInsightActionBusy(true);
    try {
      await logTelemetry({
        name: 'insight_action_triggered',
        properties: { insightId: moodInsight.id, source: 'mood_screen' },
      });
      Alert.alert('Noted', moodInsight.action ?? 'We saved that for you.');
      await refreshInsight('mood-action');
    } catch (error: any) {
      Alert.alert('Heads up', error?.message ?? 'Could not follow up on that insight.');
    } finally {
      setInsightActionBusy(false);
    }
  }, [moodInsight, refreshInsight]);

  const handleInsightRefresh = useCallback(() => {
    // Log telemetry for manual refresh
    logTelemetry({
      name: 'insight_refresh_pressed',
      properties: {
        screenSource: 'mood',
        reason: 'mood-manual',
      },
    }).catch((e) => { if (__DEV__) logger.debug('[MoodScreen]', e); }); // Non-blocking

    refreshInsight('mood-manual').catch((error: any) => {
      Alert.alert('Refresh failed', error?.message ?? 'Unable to refresh insights right now.');
    });
  }, [refreshInsight]);

  // ---------- Confidence ----------
  const trendDaysCount = useMemo(() => {
    const sorted = [...(moodSeries ?? [])].sort((a, b) =>
      (b.day_date ?? b.created_at).localeCompare(a.day_date ?? a.created_at),
    );
    const today = dayKeyZA(new Date());
    const past = sorted.filter((m) => dayKeyZA(m.day_date ?? m.created_at) !== today).slice(0, 14);

    const days = new Set<string>();
    for (const m of past) days.add(dayKeyZA(m.day_date ?? m.created_at));
    return days.size;
  }, [moodSeries]);

  const confidence = useMemo(() => confidenceFromDays(trendDaysCount), [trendDaysCount]);

  // ---------- Cause linking ----------
  const moodByDay = useMemo(() => {
    const rows: MoodEntry[] = moodSeries ?? [];
    const byDay = new Map<string, number[]>();

    for (const m of rows) {
      const k = dayKeyZA(m.day_date ?? m.created_at);
      const arr = byDay.get(k) ?? [];
      arr.push(m.rating);
      byDay.set(k, arr);
    }

    const meanLocal = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

    const out = new Map<string, number>();
    for (const [k, xs] of byDay.entries()) out.set(k, meanLocal(xs));
    return out;
  }, [moodSeries]);

  const sleepByDay: Map<string, number> | undefined = useMemo(() => {
    const rows = (sleepSessionsQ.data ?? []) as any[];
    if (!rows.length) return undefined;
    return sleepHoursByDayZA(rows as any);
  }, [sleepSessionsQ.data]);

  const sleepMoodCorr = useMemo(
    () => bestCorrelation(moodByDay, sleepByDay, { preferLag: true }),
    [moodByDay, sleepByDay],
  );

  const sleepCauseHint = useMemo(() => {
    const base = causeLinkCopyGeneric({ driver: 'Sleep', r: sleepMoodCorr.r, n: sleepMoodCorr.n });
    if (sleepMoodCorr.mode === 'prev') return { ...base, title: `${base.title} (previous night)` };
    if (sleepMoodCorr.mode === 'same') return { ...base, title: `${base.title} (same day)` };
    return base;
  }, [sleepMoodCorr]);

  const medsByDay: Map<string, number> | undefined = useMemo(() => {
    const rows = (medEventsQ.data ?? []) as any[];
    if (!rows.length) return undefined;
    return medAdherenceByDayZA(rows as any);
  }, [medEventsQ.data]);

  const medsMoodCorr = useMemo(
    () => bestCorrelation(moodByDay, medsByDay, { preferLag: false }),
    [moodByDay, medsByDay],
  );

  const medsCauseHint = useMemo(() => {
    const base = causeLinkCopyGeneric({ driver: 'Medication adherence', r: medsMoodCorr.r, n: medsMoodCorr.n });
    if (medsMoodCorr.mode === 'prev') return { ...base, title: `${base.title} (previous day)` };
    if (medsMoodCorr.mode === 'same') return { ...base, title: `${base.title} (same day)` };
    return base;
  }, [medsMoodCorr]);

  // ---------- Trends (Sleep-style averages cards) ----------
  const trendDays = trendRange === '7d' ? 7 : trendRange === '30d' ? 30 : 365;

  const trendSeriesValues = useMemo(() => {
    const out: number[] = [];
    for (let i = trendDays - 1; i >= 0; i--) {
      const k = dayKeyZA(daysAgo(i));
      const v = moodByDay.get(k);
      if (typeof v === 'number' && Number.isFinite(v)) out.push(clamp(v, 0, 10));
    }
    return out;
  }, [trendDays, moodByDay]);

  const avgMood = useMemo(() => {
    const m = mean(trendSeriesValues);
    return m === undefined ? null : Math.round(m * 10) / 10;
  }, [trendSeriesValues]);

  const volatilityMAD = useMemo(() => {
    const v = mad(trendSeriesValues);
    return v === undefined ? null : Math.round(v * 10) / 10;
  }, [trendSeriesValues]);

  const avgDeltaVsPrev = useMemo(() => {
    // compare last N days vs previous N days (simple, stable)
    const keysLast: string[] = [];
    const keysPrev: string[] = [];
    for (let i = 0; i < trendDays; i++) keysLast.push(dayKeyZA(daysAgo(i)));
    for (let i = trendDays; i < trendDays * 2; i++) keysPrev.push(dayKeyZA(daysAgo(i)));

    const lastVals = keysLast.map((k) => moodByDay.get(k)).filter((v): v is number => typeof v === 'number' && isFinite(v));
    const prevVals = keysPrev.map((k) => moodByDay.get(k)).filter((v): v is number => typeof v === 'number' && isFinite(v));

    const lastAvg = mean(lastVals);
    const prevAvg = mean(prevVals);
    if (lastAvg === undefined || prevAvg === undefined) return null;

    const d = lastAvg - prevAvg;
    return Math.round(d * 10) / 10;
  }, [trendDays, moodByDay]);

  // ---------- History modal ----------
  const [historyModal, setHistoryModal] = useState<MoodHistoryModalModel | null>(null);
  const todayKey = dayKeyZA(new Date());
  const scrollRef = useRef<ScrollView>(null);
  const scrollContentRef = useRef<View>(null);
  const checkInRef = useRef<View>(null);
  const [showMoodFirstVisitGuide, setShowMoodFirstVisitGuide] = useState(false);

  const hasHistory = (moodSeries?.length ?? 0) >= 3;
  const heroVolatile = (hero as any).volatile ?? false;

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={[
        reclaimHeroBleedScroll,
        { backgroundColor: theme.colors.background },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View ref={scrollContentRef} collapsable={false}>
        <MoodHero
          rating={rating}
          volatile={heroVolatile}
          hasHistory={hasHistory}
          heroState={{ title: hero.title, deltas: hero.deltas, subtitle: hero.subtitle }}
          confidence={confidence}
          trendDaysCount={trendDaysCount}
          hasCheckins={(moodSeries?.length ?? 0) > 0}
        />
        <View style={reclaimBelowHeroContent}>
      {showMoodFirstVisitGuide ? (
        <View style={reclaimSectionSpacing}>
          <FirstVisitCoach
            visible
            message="Your first check-in takes 10 seconds — patterns appear after 3."
            showMeLabel="Show me"
            onShowMe={handleMoodCoachShowMe}
            onDismiss={() => void handleDismissMoodFirstVisitGuide()}
            style={utilitySurface}
          />
        </View>
      ) : null}
      {/* Scientific insight */}
      <View style={reclaimSectionSpacing}>
        {insightsEnabled ? (
          <>
            {insightStatus === 'loading' ? (
              <Card mode="elevated" style={[guidedShell, { marginBottom: 12 }]}>
                <Card.Content style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color={theme.colors.onSurfaceVariant} />
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    Refreshing insights…
                  </Text>
                </Card.Content>
              </Card>
            ) : null}

            {insightStatus === 'error' ? (
              <Card mode="elevated" style={[guidedShell, { marginBottom: 12 }]}>
                <Card.Content style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>
                    {insightError ?? "We couldn't refresh insights right now."}
                  </Text>
                  <ReclaimButton variant="ghost" onPress={() => refreshInsight('mood-manual')}>
                    Try again
                  </ReclaimButton>
                </Card.Content>
              </Card>
            ) : null}

            {moodInsight && insightStatus === 'ready' && dismissedInsightId !== moodInsight.id ? (
              <InsightCard
                insight={moodInsight}
                onActionPress={handleInsightAction}
                onRefreshPress={handleInsightRefresh}
                onDismiss={() => setDismissedInsightId(moodInsight.id)}
                isProcessing={insightActionBusy}
                disabled={insightActionBusy}
                testID="mood-insight-card"
                screenSource="mood"
                embedInTightVerticalStack
              />
            ) : insightStatus === 'ready' ? (
              <InformationalCard style={utilitySurface}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                  No new insight right now.
                </Text>
              </InformationalCard>
            ) : null}
          </>
        ) : (
          <Card mode="elevated" style={guidedShell}>
            <Card.Content>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                Scientific insights are turned off.
              </Text>
              <Text variant="bodySmall" style={{ marginTop: appTheme.spacing.xs, color: theme.colors.onSurfaceVariant }}>
                Enable them in Settings → Scientific insights for quick, science-backed nudges.
              </Text>
            </Card.Content>
          </Card>
        )}
      </View>

      {/* Cause links & reflection */}
      <View style={reclaimSectionSpacing}>
        <Card mode="elevated" style={guidedShell}>
          <Card.Content>
            <FeatureCardHeader
              icon="link-variant"
              title="Cause links"
              subtitle="How sleep and meds line up with your mood"
            />

            <Text variant="titleSmall" style={[reclaimTextRoles.sectionTitle, { color: theme.colors.onSurface, marginTop: 8 }]}>
              {sleepCauseHint.title}
            </Text>
            <Text variant="bodySmall" style={{ marginTop: 4, color: theme.colors.onSurfaceVariant }}>
              {sleepCauseHint.body}
            </Text>

            <View style={{ height: 12 }} />

            <Text variant="titleSmall" style={[reclaimTextRoles.sectionTitle, { color: theme.colors.onSurface }]}>
              {medsCauseHint.title}
            </Text>
            <Text variant="bodySmall" style={{ marginTop: 4, color: theme.colors.onSurfaceVariant }}>
              {medsCauseHint.body}
            </Text>

            <View
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTopWidth: 1,
                borderTopColor: theme.colors.outlineVariant,
              }}
            >
              <Text variant="titleSmall" style={[reclaimTextRoles.sectionTitle, { color: theme.colors.onSurface }]}>
                Does this feel true for you?
              </Text>
              <Text variant="bodySmall" style={{ marginTop: 4, color: theme.colors.onSurfaceVariant, lineHeight: 18 }}>
                Your take helps keep suggestions grounded — tap what fits and add a line if something’s missing.
              </Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, rowGap: 8, columnGap: 8 }}>
                <Chip
                      selected={reflection === 'yes'}
                      onPress={async () => {
                        setReflection('yes');
                        try {
                          await logTelemetry({ name: 'mood_reflection', properties: { value: 'yes', source: 'mood_hero' } });
                        } catch {}
                      }}
                      mode="outlined"
                    >
                      Yes
                    </Chip>

                    <Chip
                      selected={reflection === 'somewhat'}
                      onPress={async () => {
                        setReflection('somewhat');
                        try {
                          await logTelemetry({
                            name: 'mood_reflection',
                            properties: { value: 'somewhat', source: 'mood_hero' },
                          });
                        } catch {}
                      }}
                      mode="outlined"
                    >
                      Somewhat
                    </Chip>

                    <Chip
                      selected={reflection === 'no'}
                      onPress={async () => {
                        setReflection('no');
                        try {
                          await logTelemetry({ name: 'mood_reflection', properties: { value: 'no', source: 'mood_hero' } });
                        } catch {}
                      }}
                      mode="outlined"
                    >
                      No
                    </Chip>
                  </View>

                  <TextInput
                    mode="outlined"
                    value={reflectionNote}
                    onChangeText={setReflectionNote}
                    placeholder="Optional note — what feels closer to the truth?"
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                    multiline
                    style={{ marginTop: 10, minHeight: 64 }}
                    contentStyle={{ paddingTop: 10, paddingBottom: 10 }}
                    textColor={theme.colors.onSurface}
                  />

                  <ReclaimButton
                    variant="primary"
                    onPress={async () => {
                      try {
                        await logTelemetry({
                          name: 'mood_reflection_note',
                          properties: {
                            value: reflection ?? 'unset',
                            note: reflectionNote?.trim() ?? '',
                            source: 'mood_hero',
                          },
                        });
                        Alert.alert('Saved', 'Thanks — we’ll use that to keep this card grounded.');
                        setReflectionNote('');
                      } catch (e: any) {
                        Alert.alert('Error', e?.message ?? 'Could not save reflection.');
                      }
                    }}
                    disabled={!reflection && !(reflectionNote?.trim()?.length)}
                    style={{ marginTop: 12, alignSelf: 'stretch' }}
                    contentStyle={{ minHeight: 48 }}
                  >
                    Save my take
                  </ReclaimButton>
                  {!reflection && !(reflectionNote?.trim()?.length) && (
                    <Text variant="bodySmall" style={{ marginTop: 6, opacity: 0.6, color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                      Select Yes, Somewhat, or No — or add a note — to save.
                    </Text>
                  )}
            </View>
          </Card.Content>
        </Card>
      </View>

      {/* Today */}
      <View style={reclaimSectionSpacing}>
        <Card mode="elevated" style={guidedShell}>
          <Card.Content>
            <FeatureCardHeader icon="calendar-today" title="Today" subtitle="Your latest check-ins" />

            {(() => {
              const today = getLocalDayDate(new Date());
              const rows = (checkinsQ.data ?? []).filter((c: any) => c.day_date === today).slice(0, 5);
              if (!rows.length) {
                return <Text style={{ color: theme.colors.onSurfaceVariant }}>No check-ins yet today.</Text>;
              }
              return rows.map((row: any) => (
                <View
                  key={row.id}
                  style={{
                    paddingVertical: 6,
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.outlineVariant,
                  }}
                >
                  <Text style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                    {new Date(row.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} • {row.rating}
                  </Text>
                  {row.tags?.length ? (
                    <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                      {row.tags.map((t: string) => `#${t}`).join(' ')}
                    </Text>
                  ) : null}
                  {row.note ? <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>{row.note}</Text> : null}
                </View>
              ));
            })()}
          </Card.Content>
        </Card>
      </View>

      {/* Check-in */}
      <View style={reclaimSectionSpacing} ref={checkInRef} collapsable={false}>
        <Card mode="elevated" style={guidedShell}>
          <Card.Content>
            <FeatureCardHeader icon="clipboard-text-outline" title="Check-in" subtitle="Quick rating + tags + note" />

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                const selected = n === rating;
                const chip = reclaimChip(appTheme, selected ? 'selected' : 'actionable');
                return (
                  <Pressable
                    key={n}
                    onPress={() => setRating(n)}
                    style={[chip.container as object, { minWidth: 44, marginRight: 8, marginBottom: 8 }]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Set mood rating to ${n}`}
                  >
                    <Text style={chip.label as object}>{n}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text variant="titleSmall" style={{ marginTop: 12, color: theme.colors.onSurface }}>
              Quick tags
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
              {TAGS.map((tag) => {
                const active = sel.includes(tag);
                const chip = reclaimChip(appTheme, active ? 'selected' : 'actionable');
                return (
                  <Pressable
                    key={tag}
                    onPress={() => setSel((current) => (active ? current.filter((x) => x !== tag) : [...current, tag]))}
                    style={[chip.container as object, { marginRight: 8, marginBottom: 8 }]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`Toggle mood tag ${tag.replace('_', ' ')}`}
                  >
                    <Text style={chip.label as object}>{tag.replace('_', ' ')}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text variant="titleSmall" style={{ marginTop: 12, color: theme.colors.onSurface }}>
              Note (optional)
            </Text>

            <TextInput
              mode="outlined"
              value={note}
              onChangeText={setNote}
              placeholder="Anything you'd like to add..."
              placeholderTextColor={theme.colors.onSurfaceVariant}
              accessibilityLabel="Mood note"
              multiline
              style={{ marginTop: 6, minHeight: 80 }}
              contentStyle={{ paddingTop: 12, paddingBottom: 12 }}
              textColor={theme.colors.onSurface}
            />

            <ReclaimButton
              variant="primary"
              onPress={async () => {
                try {
                  const trimmedNote = note?.trim() ?? '';
                  await createMoodCheckin({ rating, note: trimmedNote, tags: sel });

                  setNote('');

                  await Promise.all([
                    qc.invalidateQueries({ queryKey: [...MOOD_CANONICAL_QUERY_KEY] }),
                    qc.invalidateQueries({ queryKey: ['mood:checkins:7d'] }),
                    qc.invalidateQueries({ queryKey: ['mood:daily:supabase'] }),
                    qc.invalidateQueries({ queryKey: ['mood:local'] }),
                    qc.invalidateQueries({ queryKey: ['sleep:sessions:30d'] }),
                    qc.invalidateQueries({ queryKey: ['meds:events:30d'] }),
                  ]);

                  // Grade today's forecast against the actual check-in.
                  const gradeLine = await gradeForecastWithMood(rating).catch(() => null);
                  Alert.alert('Logged', gradeLine ?? 'Check-in saved.');
                  await refreshInsight('mood-log-success');
                } catch (error: any) {
                  Alert.alert('Error', error?.message ?? 'Failed to log check-in');
                }
              }}
              style={{ alignSelf: 'flex-start', marginTop: 16 }}
              accessibilityLabel="Log a quick check-in"
            >
              Save check-in
            </ReclaimButton>

          </Card.Content>
        </Card>
      </View>

      {/* Crisis resources */}
      <View style={reclaimSectionSpacing}>
        <Card mode="elevated" style={guidedShell}>
          <Card.Content>
            <FeatureCardHeader icon="phone-in-talk" title="In crisis?" subtitle="Help is available 24/7" />
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              If you're struggling, reach out. The 988 Suicide & Crisis Lifeline offers free, confidential support.
            </Text>
            <ReclaimButton
              variant="tertiary"
              icon="open-in-new"
              onPress={() => Linking.openURL(CRISIS_HELPLINE_URL).catch((e) => { if (__DEV__) logger.debug('[MoodScreen]', e); })}
              textColor={theme.colors.error}
              style={{ alignSelf: 'flex-start', marginTop: 12 }}
              accessibilityLabel={`Open ${CRISIS_HELPLINE_LABEL} website`}
            >
              {CRISIS_HELPLINE_LABEL}
            </ReclaimButton>
          </Card.Content>
        </Card>
      </View>

      {/* Reminders */}
      <View style={reclaimSectionSpacing}>
        <SchedulingCard
          title="Reminders"
          subtitle="Mood check-in schedule"
          status={
            <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 8 }}>
              <Switch
                value={remindersOn}
                onValueChange={handleToggleReminders}
                accessibilityLabel="Toggle mood reminders"
              />
              <Text variant="bodyMedium">Remind me</Text>
            </View>
          }
          primaryActionLabel={remindersOn ? undefined : 'Enable reminders'}
          onPrimaryAction={remindersOn ? undefined : () => handleToggleReminders(true)}
        />
      </View>

      {/* ✅ Trends / Averages (Sleep-style layout) */}
      <View style={reclaimSectionSpacing}>
        <Card mode="elevated" style={guidedShell}>
          <Card.Content>
            <FeatureCardHeader icon="chart-line" title="Trends" subtitle="7D • 30D • 365D averages" />

            <View
              style={{
                flexDirection: 'row',
                padding: 3,
                marginBottom: 12,
                borderRadius: 999,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: theme.dark ? 'rgba(140, 175, 235, 0.16)' : 'rgba(37, 99, 235, 0.12)',
                backgroundColor: theme.dark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.045)',
              }}
              accessibilityRole="tablist"
            >
              {(['7d', '30d', '365d'] as const).map((key) => {
                const selected = trendRange === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setTrendRange(key)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Show ${key} mood trends`}
                    style={({ pressed }) => ({
                      flex: 1,
                      minWidth: 0,
                      paddingVertical: 8,
                      borderRadius: 999,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: selected ? theme.colors.primary : 'transparent',
                      opacity: pressed ? 0.88 : 1,
                    })}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '600',
                        letterSpacing: 0.06,
                        color: selected ? theme.colors.onPrimary : theme.colors.onSurfaceVariant,
                      }}
                    >
                      {key.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <Card mode="contained" style={{ flex: 1, minWidth: 140 }}>
                <Card.Content>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Avg mood
                  </Text>
                  <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                    {avgMood !== null ? `${avgMood}/10` : '—'}
                  </Text>
                </Card.Content>
              </Card>

              <Card mode="contained" style={{ flex: 1, minWidth: 140 }}>
                <Card.Content>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Day-to-day swing
                  </Text>
                  <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                    {volatilityMAD !== null ? `${volatilityMAD}` : '—'}
                  </Text>
                </Card.Content>
              </Card>

              <Card mode="contained" style={{ flex: 1, minWidth: 140 }}>
                <Card.Content>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Change vs previous
                  </Text>
                  <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                    {avgDeltaVsPrev !== null ? fmtDelta(avgDeltaVsPrev) : '—'}
                  </Text>
                </Card.Content>
              </Card>
            </View>
          </Card.Content>
        </Card>
      </View>

      {/* ✅ History (SleepHistorySection-style: header card always, + separate empty card) */}
      <View style={reclaimSectionSpacing}>
        {moodLoading ? (
          <Card mode="elevated" style={guidedShell}>
            <Card.Content>
              <FeatureCardHeader icon="history" title="History" subtitle="Last 14 days" />
              <Text style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>Loading mood history…</Text>
            </Card.Content>
          </Card>
        ) : moodError ? (
          <Card mode="elevated" style={guidedShell}>
            <Card.Content>
              <FeatureCardHeader icon="history" title="History" subtitle="Last 14 days" />
              <HelperText type="error" visible>
                {(moodError as any)?.message ?? 'Failed to load mood history.'}
              </HelperText>
            </Card.Content>
          </Card>
        ) : (
          <MoodHistorySection
            entries={moodSeriesSorted}
            excludeDayKey={todayKey}
            onOpen={(entry) => setHistoryModal(entry)}
            outerCardStyle={guidedShell}
            scrollRef={scrollRef}
            scrollContentRef={scrollContentRef}
          />
        )}
      </View>

          </View>
        </View>

      {/* Modal (kept as your original inline modal; no removals) */}
      <Portal>
        {historyModal ? (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: theme.colors.backdrop,
              justifyContent: 'center',
              padding: 16,
            }}
          >
            <Card style={{ borderRadius: 16, backgroundColor: appTheme.colors.surface }}>
              <Card.Content>
                {(() => {
                  const k = dayKeyZA(historyModal.day_date ?? historyModal.created_at);
                  const meta = historyModal.__meta ?? { windowN: 0 };
                  const volatile = !!meta.volatile7;
                  const w = moodWeather(historyModal.rating, volatile);

                  const delta = meta.delta7;
                  const deltaPretty =
                    meta.windowN >= 3 && delta !== undefined
                      ? fmtDelta(delta)
                      : undefined;

                  const hasHistory = meta.windowN >= 3;

                  const copy = microInsightCopy({
                    delta: delta,
                    volatile,
                    state: volatile ? 'Turbulent' : w.label,
                    hasHistory,
                    tags: historyModal.tags ?? [],
                  });

                  return (
                    <>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <MoodWeatherGlyph kind={w.kind} accent={appTheme.domainAccents.mood} size={28} />
                          <View>
                            <Text style={{ color: theme.colors.onSurface, fontWeight: '800', fontSize: 16 }}>
                              {formatDayPretty(k)}
                            </Text>
                            <Text style={{ color: theme.colors.onSurfaceVariant }}>
                              {w.label}
                              {volatile ? ' • swings wider' : ''}
                            </Text>
                          </View>
                        </View>

                        <View
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderRadius: 999,
                            backgroundColor: theme.colors.surfaceVariant,
                            borderWidth: 1,
                            borderColor: theme.colors.outlineVariant,
                          }}
                        >
                          <Text style={{ color: theme.colors.onSurface, fontWeight: '900' }}>{historyModal.rating}/10</Text>
                        </View>
                      </View>

                      <View style={{ marginTop: 12, gap: 6 }}>
                        {hasHistory && deltaPretty ? (
                          <Text style={{ color: theme.colors.onSurfaceVariant }}>
                            Trend vs baseline (last 7 days):{' '}
                            <Text style={{ color: theme.colors.onSurface, fontWeight: '800' }}>{deltaPretty}</Text>
                          </Text>
                        ) : (
                          <Text style={{ color: theme.colors.onSurfaceVariant }}>
                            Trend vs baseline: log a few more days to unlock.
                          </Text>
                        )}

                        <Text style={{ color: theme.colors.onSurfaceVariant }}>{copy}</Text>
                      </View>

                      {historyModal.tags?.length ? (
                        <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                          {historyModal.tags.map((t) => (
                            <Chip key={`tag-${t}`} mode="outlined" compact>
                              #{t.replace('_', ' ')}
                            </Chip>
                          ))}
                        </View>
                      ) : null}

                      {historyModal.note ? (
                        <View style={{ marginTop: 12 }}>
                          <Text style={{ color: theme.colors.onSurface, fontWeight: '700' }}>Note</Text>
                          <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>{historyModal.note}</Text>
                        </View>
                      ) : null}

                      <ReclaimButton variant="ghost" onPress={() => setHistoryModal(null)} style={{ marginTop: 14, alignSelf: 'flex-start' }}>
                        Close
                      </ReclaimButton>
                    </>
                  );
                })()}
              </Card.Content>
            </Card>
          </View>
        ) : null}
      </Portal>
    </ScrollView>
  );
}
