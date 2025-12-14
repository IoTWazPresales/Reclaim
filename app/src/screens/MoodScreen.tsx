import React, { useCallback, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
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
import { AppScreen, AppCard, ActionCard } from '@/components/ui';
import { useAppTheme } from '@/theme';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  upsertTodayEntry,
  listMood,
  type MoodEntry,
  listDailyMoodFromCheckins,
  listMoodCheckinsDays,
  createMoodCheckin,
  getLocalDayDateZA,
} from '@/lib/api';
import { scheduleMoodCheckinReminders, cancelMoodCheckinReminders, ensureNotificationPermission } from '@/hooks/useNotifications';
import { InsightCard } from '@/components/InsightCard';
import { useScientificInsights } from '@/providers/InsightsProvider';
import { logTelemetry } from '@/lib/telemetry';

/* ---------- tiny sparkline (bars) ---------- */
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
      <View style={{ height, position: 'absolute', left: 0, right: 0 }}>
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

/* ---------- helpers ---------- */
function daysAgo(n: number) {
  const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - n); return d;
}
function dayKey(d: Date | string) {
  const t = typeof d === 'string' ? new Date(d) : d;
  const x = new Date(t); x.setHours(0,0,0,0);
  return x.toISOString().slice(0, 10);
}

/* ---------- preset tags (can tweak later) ---------- */
const TAGS = [
  'energized','calm','focused','social',
  'anxious','low','irritable','overwhelmed',
  'tired','in_pain',
];

/* ---------- hero helpers ---------- */
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
  // history: exclude today if present, use last 7 days
  const sorted = [...history].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const todayKey = dayKey(new Date());
  const past = sorted.filter((m) => dayKey(m.created_at) !== todayKey);
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
  if (!context.hasHistory) {
    return 'Log a few days of mood to unlock trend-based insights.';
  }
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

export default function MoodScreen() {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const qc = useQueryClient();
  const {
    insight,
    insights,
    status: insightStatus,
    refresh: refreshInsight,
    enabled: insightsEnabled,
    lastContext,
    lastSource,
  } = useScientificInsights();

  const moodLocalQ = useQuery({
    queryKey: ['mood:local'],
    queryFn: async () => {
      try {
        return await listMood(365); // fallback
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
    if (moodSupabaseQ.data && Array.isArray(moodSupabaseQ.data) && moodSupabaseQ.data.length) {
      return moodSupabaseQ.data;
    }
    return (moodLocalQ.data ?? []) as MoodEntry[];
  }, [moodSupabaseQ.data, moodLocalQ.data]);

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

  // form state
  const [rating, setRating] = useState<number>(7);
  const [note, setNote] = useState('');
  const [sel, setSel] = useState<string[]>([]);
  const [remindersOn, setRemindersOn] = useState<boolean>(false);
  const [insightActionBusy, setInsightActionBusy] = useState(false);

  // detect existing reminder state by reading permission only (simple UI model)
  React.useEffect(() => {
    (async () => {
      const ok = await ensureNotificationPermission();
      setRemindersOn(ok); // permission ≠ scheduled, but fine for now
    })();
  }, []);

  const handleInsightAction = useCallback(async () => {
    if (!insight) return;
    setInsightActionBusy(true);
    try {
      await logTelemetry({
        name: 'insight_action_triggered',
        properties: {
          insightId: insight.id,
          source: 'mood_screen',
        },
      });
      Alert.alert('Noted', insight.action ?? 'We saved that for you.');
      await refreshInsight('mood-action');
    } catch (error: any) {
      Alert.alert('Heads up', error?.message ?? 'Could not follow up on that insight.');
    } finally {
      setInsightActionBusy(false);
    }
  }, [insight, refreshInsight]);

  const handleInsightRefresh = useCallback(() => {
    refreshInsight('mood-manual').catch((error: any) => {
      Alert.alert('Refresh failed', error?.message ?? 'Unable to refresh insights right now.');
    });
  }, [refreshInsight]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const tagLine = sel.length ? ` ${sel.map(t => `#${t}`).join(' ')}` : '';
      return upsertTodayEntry({
        mood: rating,
        note: (note?.trim() ?? '') + tagLine,
      });
    },
    onSuccess: async () => {
      setNote('');
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['mood:daily:supabase'] }),
        qc.invalidateQueries({ queryKey: ['mood:local'] }),
        qc.invalidateQueries({ queryKey: ['mood:checkins:7d'] }),
        qc.invalidateQueries({ queryKey: ['mood:daily:history'] }),
      ]);
      Alert.alert('Saved', 'Mood saved for today.');
      await refreshInsight('mood-log-success');
    },
    onError: (e: any) => Alert.alert('Error', e?.message ?? 'Failed to save mood'),
  });

  // quick 14-day series
  const last14Series = useMemo(() => {
    const rows: MoodEntry[] = moodSeries ?? [];
    const start14 = daysAgo(13);
    const byDay = new Map<string, number[]>();
    for (const m of rows) {
      const k = dayKey(m.created_at);
      if (new Date(k) < start14) continue;
      const arr = byDay.get(k) ?? [];
      arr.push(m.rating);
      byDay.set(k, arr);
    }
    const days: string[] = []; for (let i=13;i>=0;i--) days.push(dayKey(daysAgo(i)));
    const mean = (xs: number[]) => xs.length ? xs.reduce((a,b)=>a+b,0)/xs.length : 0;
    return days.map(k => mean(byDay.get(k) ?? []));
  }, [moodSeries]);

  const avg7 = useMemo(() => {
    const rows: MoodEntry[] = moodSeries ?? [];
    const start7 = daysAgo(6);
    const xs = rows.filter(r => new Date(r.created_at) >= start7).map(r => r.rating);
    if (!xs.length) return null;
    return Math.round((xs.reduce((a,b)=>a+b,0)/xs.length)*10)/10;
  }, [moodSeries]);

  const hasHistoricalMood = (moodSeries?.length ?? 0) > 0;
  const moodLoading = moodSupabaseQ.isLoading && !moodSupabaseQ.data;
  const moodError = moodSupabaseQ.error && !moodSupabaseQ.data;

  const hero = useMemo(() => deriveHeroState(rating, moodSeries ?? []), [rating, moodSeries]);

  const [historyModal, setHistoryModal] = useState<MoodEntry | null>(null);

  return (
    <AppScreen padding="lg" paddingBottom={120}>
      {/* Hero: Mental Weather (match sleep hero styling) */}
      <ActionCard
        icon="emoticon-happy-outline"
        style={{ marginBottom: 12 }}
        contentContainerStyle={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}
      >
        <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
          {hero.title}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, rowGap: 6, columnGap: 8 }}>
          {hero.deltas.map((d) => (
            <Chip
              key={d}
              mode="outlined"
              compact
              style={{ borderRadius: 8 }}
              contentStyle={{ paddingHorizontal: 10, paddingVertical: 2 }}
              textStyle={{ fontSize: 13, lineHeight: 18 }}
            >
              {d}
            </Chip>
          ))}
        </View>
        {hasHistoricalMood ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Based on your recent check-ins.
          </Text>
        ) : null}
        {hero.subtitle ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {hero.subtitle}
          </Text>
        ) : null}
      </ActionCard>

      {/* Scientific insight (shared engine) */}
      <View style={{ marginBottom: 12 }}>
        {insightsEnabled ? (
          <>
            {insightStatus === 'loading' ? (
              <Card mode="outlined" style={{ borderRadius: 16, backgroundColor: appTheme.colors.surface, marginBottom: 12 }}>
                <Card.Content style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color={theme.colors.onSurfaceVariant} />
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    Refreshing insights…
                  </Text>
                </Card.Content>
              </Card>
            ) : null}
            {(() => {
              const picked =
                (insights ?? []).find((ins) => ins.sourceTag?.toLowerCase().startsWith('mood')) || insight;
              return picked && insightStatus === 'ready' ? (
                <InsightCard
                  insight={{
                    ...picked,
                    why:
                      picked.why ??
                      microInsightCopy({
                        delta: hero.delta,
                        volatile: hero.volatile,
                        state: hero.stateLabel,
                        hasHistory: (moodSeries?.length ?? 0) >= 3,
                      }),
                  }}
                  onActionPress={handleInsightAction}
                  onRefreshPress={handleInsightRefresh}
                  isProcessing={insightActionBusy}
                  disabled={insightActionBusy}
                  testID="mood-insight-card"
                />
              ) : null;
            })()}
          </>
        ) : null}
      </View>

      <Card style={{ borderRadius: 16, marginBottom: 12, backgroundColor: appTheme.colors.surface }}>
        <Card.Content>
          <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 4 }}>
            Today’s check-ins
          </Text>
          {(() => {
            const today = getLocalDayDateZA(new Date());
            const rows = (checkinsQ.data ?? []).filter((c) => c.day_date === today).slice(0, 5);
            if (!rows.length) {
              return <Text style={{ color: theme.colors.onSurfaceVariant }}>No check-ins yet today.</Text>;
            }
            return rows.map((row) => (
              <View key={row.id} style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.colors.outlineVariant }}>
                <Text style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                  {new Date(row.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} • {row.rating}
                </Text>
                {row.tags?.length ? (
                  <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                    {row.tags.map((t) => `#${t}`).join(' ')}
                  </Text>
                ) : null}
                {row.note ? (
                  <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                    {row.note}
                  </Text>
                ) : null}
              </View>
            ));
          })()}
        </Card.Content>
      </Card>

      <AppCard>
        <Card.Title
          title="How are you right now?"
          titleStyle={{ color: theme.colors.onSurface, fontWeight: '700' }}
        />
        <Card.Content>
          <Button
            mode="contained-tonal"
            onPress={async () => {
              try {
                await createMoodCheckin({ rating, note: note?.trim() ?? '', tags: sel });
                await Promise.all([
                  qc.invalidateQueries({ queryKey: ['mood:checkins:7d'] }),
                  qc.invalidateQueries({ queryKey: ['mood:daily:supabase'] }),
                ]);
                Alert.alert('Logged', 'Check-in saved.');
              } catch (error: any) {
                Alert.alert('Error', error?.message ?? 'Failed to log check-in');
              }
            }}
            style={{ alignSelf: 'flex-start', marginBottom: 8 }}
            accessibilityLabel="Log a quick check-in"
          >
            Log a check-in
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
                  onPress={() =>
                    setSel((current) => (active ? current.filter((x) => x !== tag) : [...current, tag]))
                  }
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

          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
            <Button
              mode="contained"
              onPress={() => saveMut.mutate()}
              loading={saveMut.isPending}
              style={{ marginRight: 12 }}
              accessibilityLabel="Save today's mood"
            >
              {saveMut.isPending ? 'Saving…' : 'Save mood'}
            </Button>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
                      await scheduleMoodCheckinReminders();
                      setRemindersOn(true);
                      Alert.alert('Enabled', 'Mood reminders scheduled for 08:00 and 20:00.');
                    } else {
                      await cancelMoodCheckinReminders();
                      setRemindersOn(false);
                      Alert.alert('Disabled', 'Mood reminders canceled.');
                    }
                  } catch (e: any) {
                    Alert.alert('Error', e?.message ?? 'Failed to update reminders');
                  }
                }}
                accessibilityLabel="Toggle mood reminders"
              />
              <Text variant="bodyMedium" style={{ marginLeft: 8 }}>
                Remind me
              </Text>
            </View>
          </View>
        </Card.Content>
      </AppCard>

      {insightsEnabled ? (
        <>
          {insightStatus === 'loading' ? (
            <AppCard mode="outlined">
              <Card.Content style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <MaterialCommunityIcons name="brain" size={20} color={theme.colors.primary} />
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  Refreshing scientific insight…
                </Text>
              </Card.Content>
            </AppCard>
          ) : null}

          {insightStatus === 'error' ? (
            <AppCard mode="outlined">
              <Card.Content
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
              >
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>
                  We couldn't refresh insights right now.
                </Text>
                <Button mode="text" compact onPress={handleInsightRefresh}>
                  Try again
                </Button>
              </Card.Content>
            </AppCard>
          ) : null}

          {insight && insightStatus === 'ready' ? (
            <InsightCard
              insight={insight}
              onActionPress={handleInsightAction}
              onRefreshPress={handleInsightRefresh}
              isProcessing={insightActionBusy}
              disabled={insightActionBusy}
              testID="mood-insight-card"
            />
          ) : null}
        </>
      ) : (
        <AppCard mode="outlined">
          <Card.Content>
            <Text variant="bodyMedium">Scientific insights are turned off.</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: appTheme.spacing.xs }}>
              You can enable them in Settings → Scientific insights for quick science-backed nudges.
            </Text>
          </Card.Content>
        </AppCard>
      )}

      {!hasHistoricalMood && !moodLoading && !moodError ? (
        <AppCard mode="outlined">
          <Card.Content style={{ alignItems: 'center', paddingVertical: appTheme.spacing.xxl }}>
            <MaterialCommunityIcons
              name="emoticon-happy-outline"
              size={48}
              color={theme.colors.primary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text variant="titleMedium" style={{ marginTop: appTheme.spacing.md }}>
              Your mood awaits
            </Text>
            <Text
              variant="bodyMedium"
              style={{ marginTop: appTheme.spacing.xs, textAlign: 'center', color: theme.colors.onSurfaceVariant }}
            >
              Save a few check-ins to unlock streaks, insights, and kinder reminders tailored to your day.
            </Text>
          </Card.Content>
        </AppCard>
      ) : null}

      <View style={{ marginBottom: 12 }}>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 8 }}>
          History
        </Text>

        {moodLoading && (
          <Text variant="bodyMedium" style={{ marginTop: appTheme.spacing.xs, color: theme.colors.onSurfaceVariant }}>
            Loading mood history…
          </Text>
        )}
        {moodError && (
          <HelperText type="error" visible>
            {(moodError as any)?.message ?? 'Failed to load mood history.'}
          </HelperText>
        )}

        {!moodLoading && !moodError && hasHistoricalMood ? (
          <>
            <Card
              mode="elevated"
              style={{ borderRadius: 16, marginBottom: 12, backgroundColor: theme.colors.surface }}
            >
              <Card.Content>
                <MiniBarSparkline data={last14Series} maxValue={10} height={72} barWidth={12} gap={4} />
                <Text
                  variant="bodyMedium"
                  style={{ marginTop: appTheme.spacing.sm, color: theme.colors.onSurfaceVariant }}
                >
                  7-day average: {avg7 ?? '—'}
                </Text>
              </Card.Content>
            </Card>

            {moodSeries.slice(0, 14).map((entry) => (
              <Card
                key={entry.id}
                mode="elevated"
                onPress={() => setHistoryModal(entry)}
                style={{ borderRadius: 16, marginBottom: 12, backgroundColor: theme.colors.surface }}
              >
                <Card.Content>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                      {entry.day_date ?? entry.created_at?.slice(0, 10)}
                    </Text>
                    <Text style={{ color: theme.colors.onSurface, fontWeight: '700' }}>Rating: {entry.rating}</Text>
                  </View>
                  {entry.tags?.length ? (
                    <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                      {entry.tags.map((t) => `#${t}`).join(' ')}
                    </Text>
                  ) : null}
                  {entry.note ? (
                    <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }} numberOfLines={2}>
                      {entry.note}
                    </Text>
                  ) : null}
                </Card.Content>
              </Card>
            ))}
          </>
        ) : !moodLoading && !moodError && !hasHistoricalMood ? (
          <Card mode="elevated" style={{ borderRadius: 16, backgroundColor: theme.colors.surface }}>
            <Card.Content>
              <Text
                variant="bodyMedium"
                style={{
                  marginTop: appTheme.spacing.xs,
                  color: theme.colors.onSurfaceVariant,
                  textAlign: 'center',
                  paddingVertical: appTheme.spacing.md,
                }}
              >
                No mood data yet. Start logging your mood to see your history.
              </Text>
            </Card.Content>
          </Card>
        ) : null}
      </View>

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
                <Text style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                  {historyModal.day_date ?? historyModal.created_at?.slice(0, 10)}
                </Text>
                <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  Rating: {historyModal.rating}
                </Text>
                {historyModal.tags?.length ? (
                  <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                    {historyModal.tags.map((t) => `#${t}`).join(' ')}
                  </Text>
                ) : null}
                {historyModal.note ? (
                  <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}>
                    {historyModal.note}
                  </Text>
                ) : null}
                <Button
                  mode="contained-tonal"
                  style={{ marginTop: 12, alignSelf: 'flex-start' }}
                  onPress={() => setHistoryModal(null)}
                >
                  Close
                </Button>
              </Card.Content>
            </Card>
          </View>
        ) : null}
      </Portal>
    </AppScreen>
  );
}
