// C:\Reclaim\app\src\screens\MoodScreen.tsx

import React, { useCallback, useMemo, useState } from 'react';
import { Alert, View, ScrollView, Animated, Easing } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Button,
  Card,
  Chip,
  HelperText,
  Switch,
  Text,
  TextInput,
  useTheme,
  Portal,
} from 'react-native-paper';

import { ActionCard, InformationalCard } from '@/components/ui';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import { useAppTheme } from '@/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  listMood,
  type MoodEntry,
  listDailyMoodFromCheckins,
  listMoodCheckinsDays,
  createMoodCheckin,
  getLocalDayDateZA,
  listSleepSessions, // ✅ sleep sessions
  listMedicationEvents, // ✅ meds events (wrapper: remote -> local)
} from '@/lib/api';

import {
  ensureNotificationPermission,
} from '@/hooks/useNotifications';
import { reconcileNotifications, forceRescheduleNotifications } from '@/lib/notifications/NotificationScheduler';

import { InsightCard } from '@/components/InsightCard';
import { getNotificationPreferences, updateNotificationPreferences } from '@/lib/notificationPreferences';
import { useScientificInsights } from '@/providers/InsightsProvider';
import { logTelemetry } from '@/lib/telemetry';

/* ---------- mental weather ---------- */
function moodWeather(rating: number, volatile: boolean) {
  if (volatile) return { emoji: '🌩️', label: 'Turbulent' };
  if (rating <= 4) return { emoji: '🌫️', label: 'Heavy' };
  if (rating <= 6) return { emoji: '☁️', label: 'Cloudy' };
  return { emoji: '☀️', label: 'Clear' };
}

/* ---------- helpers ---------- */
function daysAgo(n: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}
function dayKeyZA(d: Date | string) {
  const t = typeof d === 'string' ? new Date(d) : d;
  return getLocalDayDateZA(t);
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

  if (!n) {
    return {
      title: `Possible driver: ${driver}`,
      body: `Link ${driver.toLowerCase()} data to unlock cause hints.`,
    };
  }

  if (r === undefined) {
    return { title: `Possible driver: ${driver}`, body: `Not enough matched days yet (${n} matched). Keep logging.` };
  }

  const strength = Math.abs(r);
  const dir = r > 0 ? `${driver.toLowerCase()} ↔ better mood` : `${driver.toLowerCase()} ↔ lower mood (unexpected)`;

  if (strength < 0.2)
    return { title: `Possible driver: ${driver}`, body: `No clear relationship in the last ${n} matched days.` };
  if (strength < 0.45)
    return { title: `Possible driver: ${driver}`, body: `Weak signal (${dir}) across ${n} matched days.` };
  if (strength < 0.7)
    return { title: `Possible driver: ${driver}`, body: `Moderate signal (${dir}) across ${n} matched days.` };
  return { title: `Possible driver: ${driver}`, body: `Strong signal (${dir}) across ${n} matched days.` };
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
      title: '🌤️ Settling in',
      deltas: ['→ Mood'],
      subtitle: 'Log a few days to see your trend.',
    };
  }

  const values = last7.map((m) => m.rating);
  const baseline = mean(values) ?? current;
  const delta = current - baseline;
  const direction = delta >= 1 ? 'but clearing' : delta <= -1 ? 'worsening' : 'and steady';

  const vol = mad(values);
  const volatile = vol !== undefined ? vol > 1.6 : false;

  let stateLabel = 'Clear';
  let emoji = '☀️';
  if (volatile) {
    stateLabel = 'Turbulent';
    emoji = '🌩️';
  } else if (current <= 4) {
    stateLabel = 'Heavy';
    emoji = '🌫️';
  } else if (current <= 6) {
    stateLabel = 'Cloudy';
    emoji = '☁️';
  }

  const title = `${emoji} ${stateLabel}, ${direction}`;

  const deltas: string[] = [];
  if (delta >= 1) deltas.push('↑ Mood');
  else if (delta <= -1) deltas.push('↓ Mood');
  else deltas.push('→ Mood');

  const subtitle = (() => {
    if (volatile) return 'Mood swings are wider this week.';
    if (stateLabel === 'Heavy' && direction === 'but clearing') return 'Mood improving, still on the heavier side.';
    if (stateLabel === 'Clear' && direction === 'and steady') return 'Steady window — keep it light.';
    return undefined;
  })();

  return { title, deltas, subtitle, delta, volatile, stateLabel };
}

function microInsightCopy(context: { delta?: number; volatile?: boolean; state?: string; hasHistory: boolean }) {
  if (!context.hasHistory) return 'Log a few days of mood to unlock trend-based insights.';
  const { delta, volatile, state } = context;
  if (volatile) {
    return 'This week looks emotionally noisy. When swings widen, it can feel like the brain stays on light threat-scan even when nothing is wrong. Keep decisions small today.';
  }
  if (state === 'Heavy' && delta !== undefined && delta >= 1) {
    return 'Mood is still on the heavier side, but the trend is improving. This often happens when stress drops before energy fully returns. Aim for one easy win.';
  }
  if (state === 'Clear' && (delta === undefined || (delta > -1 && delta < 1))) {
    return 'You’re in a stable window. When mood is steady, frustration tolerance and habit follow-through tend to improve. Use this to reinforce one routine.';
  }
  return 'Noticing your pattern helps keep today predictable. Small, steady actions tend to work best on days like this.';
}

/* ---------- history helpers ---------- */
function topTags(entry: MoodEntry, max = 3) {
  return (entry.tags ?? []).slice(0, max);
}

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

/**
 * ✅ Local screen picker
 * Uses sourceTag convention:
 *  - prefer mood-tagged insights (sourceTag starts with "mood" OR contains "mood")
 *  - then global
 *  - then cooldown
 *  - then first available
 */
function pickMoodInsightLocal(candidates: any[]): any | null {
  if (!candidates?.length) return null;

  const norm = (x: any) => String(x ?? '').toLowerCase().trim();
  const tagOf = (x: any) => norm(x?.sourceTag);

  const isMood = (x: any) => {
    const t = tagOf(x);
    return t === 'mood' || t.startsWith('mood-') || t.includes('mood');
  };
  const isGlobal = (x: any) => tagOf(x) === 'global';
  const isCooldown = (x: any) => tagOf(x) === 'cooldown' || norm(x?.id).includes('cooldown');

  return candidates.find(isMood) ?? candidates.find(isGlobal) ?? candidates.find(isCooldown) ?? candidates[0] ?? null;
}

/* ---------- MiniBarSparkline (matches SleepHistorySection) ---------- */
function MiniBarSparkline({
  data,
  maxValue,
  height = 36,
  barWidth = 8,
  gap = 2,
}: {
  data: number[];
  maxValue?: number;
  height?: number;
  barWidth?: number;
  gap?: number;
}) {
  const theme = useTheme();
  const max = Math.max(1, maxValue ?? (data.length ? Math.max(...data) : 1));
  const scale = (v: number) => Math.max(1, Math.round((Math.min(v, max) / max) * height));

  return (
    <View style={{ marginTop: 6, overflow: 'hidden', width: '100%' }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'nowrap' }}>
        {data.map((v, i) => (
          <View
            key={`mood-bar-${i}`}
            style={{
              width: barWidth,
              height: scale(v),
              marginRight: i === data.length - 1 ? 0 : gap,
              borderRadius: 4,
              backgroundColor: theme.colors.primary,
              opacity: v === 0 ? 0.2 : 1,
            }}
          />
        ))}
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
  cardSurface: string;
  cardRadius: number;
};
function MoodHistorySection({ entries, excludeDayKey, onOpen, cardSurface, cardRadius }: MoodHistorySectionProps) {
  const theme = useTheme();

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

  // Oldest -> newest (flow right like Sleep)
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

  return (
    <View>
      {/* ✅ Header card ALWAYS (like Sleep) */}
      <Card mode="elevated" style={{ borderRadius: cardRadius, backgroundColor: cardSurface, marginBottom: 12 }}>
        <Card.Content>
          <FeatureCardHeader icon="history" title="History" subtitle="Last 14 days" />
          <MiniBarSparkline
            data={ratingSeries.length ? ratingSeries : [0, 0, 0, 0, 0, 0, 0]}
            maxValue={10}
            height={72}
            barWidth={12}
            gap={4}
          />
          <Text style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>
            7-day average: {avg7 !== null ? `${avg7}/10` : '—'}
          </Text>
        </Card.Content>
      </Card>

      {/* Daily cards */}
      {history.map((entry) => {
        const k = dayKeyZA(entry.day_date ?? entry.created_at);
        const meta = buildHistoryMeta(entry, entries);
        const volatile = !!(meta as any).volatile7;
        const w = moodWeather(entry.rating, volatile);

        const delta = (meta as any).delta7;
        const deltaText =
          (meta as any).windowN >= 3 && delta !== undefined
            ? `${sign(Math.round(delta * 10) / 10)}${Math.round(delta * 10) / 10} vs 7d`
            : '—';

        const tagList = topTags(entry, 3);

        return (
          <Card
            key={entry.id ?? k}
            mode="elevated"
            style={{ borderRadius: cardRadius, backgroundColor: cardSurface, marginBottom: 12 }}
            onPress={() => onOpen({ ...entry, __meta: meta as any })}
          >
            <Card.Content>
              <Text style={{ color: theme.colors.onSurface, fontWeight: '700' }}>{formatDayPretty(k)}</Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                {w.emoji} {w.label}
                {volatile ? ' • swings wider' : ''}
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 10 }}>
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: theme.colors.surfaceVariant,
                    borderWidth: 1,
                    borderColor: theme.colors.outlineVariant,
                  }}
                >
                  <Text style={{ color: theme.colors.onSurface, fontWeight: '900' }}>{entry.rating}/10</Text>
                </View>

                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: theme.colors.surfaceVariant,
                    borderWidth: 1,
                    borderColor: theme.colors.outlineVariant,
                  }}
                >
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontWeight: '800' }}>{deltaText}</Text>
                </View>
              </View>

              {tagList.length ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {tagList.map((t) => (
                    <View
                      key={`${entry.id}-${t}`}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 999,
                        backgroundColor: theme.colors.surfaceVariant,
                        borderWidth: 1,
                        borderColor: theme.colors.outlineVariant,
                      }}
                    >
                      <Text style={{ color: theme.colors.onSurfaceVariant, fontWeight: '600' }}>
                        #{t.replace('_', ' ')}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {entry.note ? (
                <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }} numberOfLines={2}>
                  {entry.note}
                </Text>
              ) : (
                <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }} numberOfLines={1}>
                  Tap for detail
                </Text>
              )}
            </Card.Content>
          </Card>
        );
      })}

      {/* ✅ Separate empty-state card (like Sleep) */}
      {!history.length ? (
        <Card mode="elevated" style={{ borderRadius: cardRadius, backgroundColor: cardSurface }}>
          <Card.Content>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>No history yet.</Text>
          </Card.Content>
        </Card>
      ) : null}
    </View>
  );
}

/* ---------- MoodScreen ---------- */
export default function MoodScreen() {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const reduceMotion = useReducedMotion();
  const sectionSpacing = appTheme.spacing.lg ?? 16;
  const cardRadius = 16;
  const cardSurface = appTheme.colors.surface;
  const qc = useQueryClient();

  // Insights provider (don’t destructure `insight`)
  const insightsCtx = useScientificInsights();
  const rankedInsights = (insightsCtx as any)?.insights ?? [];
  const insightStatus = insightsCtx.status;
  const refreshInsight = insightsCtx.refresh;
  const insightsEnabled = insightsCtx.enabled;
  const insightError = insightsCtx.error;

  // Trend range like Sleep
  const [trendRange, setTrendRange] = useState<'7d' | '30d' | '365d'>('7d');

  const heroOpacity = React.useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const heroTranslateY = React.useRef(new Animated.Value(reduceMotion ? 0 : 8)).current;
  const heroSubOpacity = React.useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const heroSubTranslateY = React.useRef(new Animated.Value(reduceMotion ? 0 : 8)).current;

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

  const moodLocalQ = useQuery({
    queryKey: ['mood:local'],
    queryFn: async () => {
      try {
        return await listMood(365);
      } catch (error: any) {
        console.warn('MoodScreen: listMood error:', error?.message || error);
        return [];
      }
    },
    retry: false,
    throwOnError: false,
  });

  const moodSupabaseQ = useQuery({
    queryKey: ['mood:daily:supabase'],
    queryFn: async () => {
      try {
        return await listDailyMoodFromCheckins(365);
      } catch (error: any) {
        console.warn('MoodScreen: listDailyMoodFromCheckins error:', error?.message || error);
        return null;
      }
    },
    retry: false,
    throwOnError: false,
  });

  const moodSeries: MoodEntry[] = useMemo(() => {
    const supa = moodSupabaseQ.data;
    if (supa && Array.isArray(supa) && supa.length) return supa;
    return (moodLocalQ.data ?? []) as MoodEntry[];
  }, [moodSupabaseQ.data, moodLocalQ.data]);

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
        console.warn('MoodScreen: listMoodCheckinsDays error:', error?.message || error);
        return [];
      }
    },
    retry: false,
    throwOnError: false,
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
  });

  const [rating, setRating] = useState<number>(7);
  const [note, setNote] = useState('');
  const [sel, setSel] = useState<string[]>([]);
  const [remindersOn, setRemindersOn] = useState<boolean>(false);
  const [insightActionBusy, setInsightActionBusy] = useState(false);

  const [reflection, setReflection] = useState<'yes' | 'somewhat' | 'no' | null>(null);
  const [reflectionNote, setReflectionNote] = useState('');

  React.useEffect(() => {
    (async () => {
      const prefs = await getNotificationPreferences();
      setRemindersOn(prefs.moodRemindersEnabled ?? false);
    })();
  }, []);

  const moodLoading = moodSupabaseQ.isLoading && !moodSupabaseQ.data;
  const moodError = moodSupabaseQ.error && !moodSupabaseQ.data;

  const hero = useMemo(() => deriveHeroState(rating, moodSeries ?? []), [rating, moodSeries]);

  // Screen-level selection
  const moodInsight = useMemo(() => {
    const candidates = Array.isArray(rankedInsights) ? rankedInsights : [];
    const selected = pickMoodInsightLocal(candidates);
    if (!selected) return null;

    return {
      ...selected,
      why:
        selected.why ??
        microInsightCopy({
          delta: (hero as any).delta,
          volatile: (hero as any).volatile,
          state: (hero as any).stateLabel,
          hasHistory: (moodSeries?.length ?? 0) >= 3,
        }),
    };
  }, [rankedInsights, hero, moodSeries?.length]);

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

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 140,
        backgroundColor: theme.colors.background,
      }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Hero */}
      <View>
        <ActionCard
          icon="emoticon-happy-outline"
          style={{ marginBottom: sectionSpacing }}
          contentContainerStyle={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}
        >
          <View style={{ position: 'relative', alignSelf: 'stretch' }}>
            <View style={{ position: 'relative', zIndex: 1 }}>
              <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                {hero.title}
              </Text>

              <Animated.View style={{ opacity: heroSubOpacity, transform: [{ translateY: heroSubTranslateY }] }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, rowGap: 6, columnGap: 8 }}>
                  {hero.deltas.map((d) => (
                    <Chip
                      key={d}
                      mode="outlined"
                      compact
                      style={{
                        borderRadius: 10,
                        backgroundColor: theme.colors.surfaceVariant,
                        borderWidth: 1,
                        borderColor: theme.colors.outlineVariant,
                        paddingHorizontal: 10,
                        paddingVertical: 2,
                      }}
                      textStyle={{ fontSize: 13, lineHeight: 18, color: theme.colors.onSurfaceVariant, opacity: 0.9 }}
                    >
                      {d}
                    </Chip>
                  ))}
                </View>

                {(moodSeries?.length ?? 0) > 0 ? (
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Based on your recent check-ins.
                  </Text>
                ) : null}

                {hero.subtitle ? (
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {hero.subtitle}
                  </Text>
                ) : null}

                {/* Confidence */}
                <View
                  style={{
                    marginTop: 10,
                    paddingTop: 10,
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.outlineVariant,
                  }}
                >
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Confidence: {confidence.label} ({confidence.confPct}%) • based on {trendDaysCount} day
                    {trendDaysCount === 1 ? '' : 's'} of recent data
                  </Text>
                </View>

                {/* Cause hints */}
                <View style={{ marginTop: 10 }}>
                  <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                    {sleepCauseHint.title}
                  </Text>
                  <Text variant="bodySmall" style={{ marginTop: 4, color: theme.colors.onSurfaceVariant }}>
                    {sleepCauseHint.body}
                  </Text>

                  <View style={{ height: 10 }} />

                  <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                    {medsCauseHint.title}
                  </Text>
                  <Text variant="bodySmall" style={{ marginTop: 4, color: theme.colors.onSurfaceVariant }}>
                    {medsCauseHint.body}
                  </Text>
                </View>

                {/* Reflection prompt */}
                <View style={{ marginTop: 12 }}>
                  <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                    Does this match your experience?
                  </Text>

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, rowGap: 8, columnGap: 8 }}>
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
                    placeholder="Optional: what feels off / what’s missing?"
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                    multiline
                    style={{ marginTop: 10, minHeight: 64 }}
                    contentStyle={{ paddingTop: 10, paddingBottom: 10 }}
                    textColor={theme.colors.onSurface}
                  />

                  <Button
                    mode="contained-tonal"
                    style={{ marginTop: 10, alignSelf: 'flex-start' }}
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
                        Alert.alert('Saved', 'Reflection saved.');
                        setReflectionNote('');
                      } catch (e: any) {
                        Alert.alert('Error', e?.message ?? 'Could not save reflection.');
                      }
                    }}
                    disabled={!reflection && !(reflectionNote?.trim()?.length)}
                  >
                    Save reflection
                  </Button>
                </View>
              </Animated.View>
            </View>
          </View>
        </ActionCard>
      </View>

      {/* Scientific insight */}
      <View style={{ marginBottom: sectionSpacing }}>
        {insightsEnabled ? (
          <>
            {insightStatus === 'loading' ? (
              <Card mode="outlined" style={{ borderRadius: cardRadius, backgroundColor: cardSurface, marginBottom: 12 }}>
                <Card.Content style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color={theme.colors.onSurfaceVariant} />
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    Refreshing insights…
                  </Text>
                </Card.Content>
              </Card>
            ) : null}

            {insightStatus === 'error' ? (
              <Card mode="outlined" style={{ borderRadius: cardRadius, backgroundColor: cardSurface, marginBottom: 12 }}>
                <Card.Content style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>
                    {insightError ?? "We couldn't refresh insights right now."}
                  </Text>
                  <Button mode="text" compact onPress={() => refreshInsight('mood-manual')}>
                    Try again
                  </Button>
                </Card.Content>
              </Card>
            ) : null}

            {moodInsight && insightStatus === 'ready' ? (
              <InsightCard
                insight={moodInsight}
                onActionPress={handleInsightAction}
                onRefreshPress={handleInsightRefresh}
                isProcessing={insightActionBusy}
                disabled={insightActionBusy}
                testID="mood-insight-card"
              />
            ) : insightStatus === 'ready' ? (
              <InformationalCard>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                  No new insight right now.
                </Text>
              </InformationalCard>
            ) : null}
          </>
        ) : (
          <Card mode="outlined" style={{ borderRadius: cardRadius, backgroundColor: cardSurface }}>
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

      {/* Today */}
      <View style={{ marginBottom: sectionSpacing }}>
        <Card mode="elevated" style={{ borderRadius: cardRadius, backgroundColor: cardSurface }}>
          <Card.Content>
            <FeatureCardHeader icon="calendar-today" title="Today" subtitle="Your latest check-ins" />

            {(() => {
              const today = getLocalDayDateZA(new Date());
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
      <View style={{ marginBottom: sectionSpacing }}>
        <Card mode="elevated" style={{ borderRadius: cardRadius, backgroundColor: cardSurface }}>
          <Card.Content>
            <FeatureCardHeader icon="clipboard-text-outline" title="Check-in" subtitle="Quick rating + tags + note" />

            <Button
              mode="contained-tonal"
              onPress={async () => {
                try {
                  const trimmedNote = note?.trim() ?? '';
                  await createMoodCheckin({ rating, note: trimmedNote, tags: sel });

                  setNote('');

                  await Promise.all([
                    qc.invalidateQueries({ queryKey: ['mood:checkins:7d'] }),
                    qc.invalidateQueries({ queryKey: ['mood:daily:supabase'] }),
                    qc.invalidateQueries({ queryKey: ['mood:local'] }),
                    qc.invalidateQueries({ queryKey: ['sleep:sessions:30d'] }),
                    qc.invalidateQueries({ queryKey: ['meds:events:30d'] }),
                  ]);

                  Alert.alert('Logged', 'Check-in saved.');
                  await refreshInsight('mood-log-success');
                } catch (error: any) {
                  Alert.alert('Error', error?.message ?? 'Failed to log check-in');
                }
              }}
              style={{ alignSelf: 'flex-start', marginBottom: 8 }}
              accessibilityLabel="Log a quick check-in"
            >
              Save check-in
            </Button>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                const selected = n === rating;
                return (
                  <Chip
                    key={n}
                    selected={selected}
                    onPress={() => setRating(n)}
                    style={{ marginRight: 8, marginBottom: 8 }}
                    accessibilityLabel={`Set mood rating to ${n}`}
                  >
                    {n}
                  </Chip>
                );
              })}
            </View>

            <Text variant="titleSmall" style={{ marginTop: 12, color: theme.colors.onSurface }}>
              Quick tags
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
              {TAGS.map((tag) => {
                const active = sel.includes(tag);
                return (
                  <Chip
                    key={tag}
                    mode={active ? 'flat' : 'outlined'}
                    selected={active}
                    onPress={() => setSel((current) => (active ? current.filter((x) => x !== tag) : [...current, tag]))}
                    style={{ marginRight: 8, marginBottom: 8 }}
                    accessibilityLabel={`Toggle mood tag ${tag.replace('_', ' ')}`}
                  >
                    {tag.replace('_', ' ')}
                  </Chip>
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

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, columnGap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 8 }}>
                <Switch
                  value={remindersOn}
                  onValueChange={async (value: boolean) => {
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
                  }}
                  accessibilityLabel="Toggle mood reminders"
                />
                <Text variant="bodyMedium">Remind me</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </View>

      {/* ✅ Trends / Averages (Sleep-style layout) */}
      <View style={{ marginBottom: sectionSpacing }}>
        <Card mode="elevated" style={{ borderRadius: cardRadius, backgroundColor: cardSurface }}>
          <Card.Content>
            <FeatureCardHeader icon="chart-line" title="Trends" subtitle="7D • 30D • 365D averages" />

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {(['7d', '30d', '365d'] as const).map((key) => (
                <Button
                  key={key}
                  mode={trendRange === key ? 'contained' : 'outlined'}
                  compact
                  onPress={() => setTrendRange(key)}
                  accessibilityLabel={`Show ${key} mood trends`}
                >
                  {key.toUpperCase()}
                </Button>
              ))}
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
                    Volatility (MAD)
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
                    {avgDeltaVsPrev !== null ? `${sign(avgDeltaVsPrev)}${avgDeltaVsPrev}` : '—'}
                  </Text>
                </Card.Content>
              </Card>
            </View>
          </Card.Content>
        </Card>
      </View>

      {/* ✅ History (SleepHistorySection-style: header card always, + separate empty card) */}
      <View style={{ marginBottom: sectionSpacing }}>
        {moodLoading ? (
          <Card mode="elevated" style={{ borderRadius: cardRadius, backgroundColor: cardSurface }}>
            <Card.Content>
              <FeatureCardHeader icon="history" title="History" subtitle="Last 14 days" />
              <Text style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>Loading mood history…</Text>
            </Card.Content>
          </Card>
        ) : moodError ? (
          <Card mode="elevated" style={{ borderRadius: cardRadius, backgroundColor: cardSurface }}>
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
            cardSurface={cardSurface}
            cardRadius={cardRadius}
          />
        )}
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
                      ? `${sign(Math.round(delta * 10) / 10)}${Math.round(delta * 10) / 10}`
                      : undefined;

                  const hasHistory = meta.windowN >= 3;

                  const copy = microInsightCopy({
                    delta: delta,
                    volatile,
                    state: volatile ? 'Turbulent' : w.label,
                    hasHistory,
                  });

                  return (
                    <>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Text style={{ fontSize: 24 }}>{w.emoji}</Text>
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

                      <Button
                        mode="contained-tonal"
                        style={{ marginTop: 14, alignSelf: 'flex-start' }}
                        onPress={() => setHistoryModal(null)}
                      >
                        Close
                      </Button>
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
