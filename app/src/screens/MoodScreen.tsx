import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
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
} from 'react-native-paper';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { upsertTodayEntry, listMood, type MoodEntry } from '@/lib/api';
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

export default function MoodScreen() {
  const theme = useTheme();
  const qc = useQueryClient();
  const {
    insight,
    status: insightStatus,
    refresh: refreshInsight,
    enabled: insightsEnabled,
  } = useScientificInsights();

  const moodQ = useQuery({
    queryKey: ['mood:all'],
    queryFn: async () => {
      try {
        return await listMood(365); // a year for trends
      } catch (error: any) {
        console.warn('MoodScreen: listMood error:', error?.message || error);
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
      await qc.invalidateQueries({ queryKey: ['mood:all'] });
      Alert.alert('Saved', 'Mood saved for today.');
      await refreshInsight('mood-log-success');
    },
    onError: (e: any) => Alert.alert('Error', e?.message ?? 'Failed to save mood'),
  });

  // quick 14-day series
  const last14Series = useMemo(() => {
    const rows: MoodEntry[] = (moodQ.data ?? []) as MoodEntry[];
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
  }, [moodQ.data]);

  const avg7 = useMemo(() => {
    const rows: MoodEntry[] = (moodQ.data ?? []) as MoodEntry[];
    const start7 = daysAgo(6);
    const xs = rows.filter(r => new Date(r.created_at) >= start7).map(r => r.rating);
    if (!xs.length) return null;
    return Math.round((xs.reduce((a,b)=>a+b,0)/xs.length)*10)/10;
  }, [moodQ.data]);

  const hasHistoricalMood = (moodQ.data?.length ?? 0) > 0;

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
    >
      <Card mode="elevated" style={{ borderRadius: 16, marginBottom: 16, backgroundColor: theme.colors.surface }}>
        <Card.Title
          title="How are you right now?"
          titleStyle={{ color: theme.colors.onSurface, fontWeight: '700' }}
        />
        <Card.Content>
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
      </Card>

      {insightsEnabled ? (
        <>
          {insightStatus === 'loading' ? (
            <Card mode="outlined" style={{ borderRadius: 16, marginBottom: 16, backgroundColor: theme.colors.surface }}>
              <Card.Content style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <MaterialCommunityIcons name="brain" size={20} color={theme.colors.primary} />
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  Refreshing scientific insight…
                </Text>
              </Card.Content>
            </Card>
          ) : null}

          {insightStatus === 'error' ? (
            <Card mode="outlined" style={{ borderRadius: 16, marginBottom: 16, backgroundColor: theme.colors.surface }}>
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
            </Card>
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
        <Card mode="outlined" style={{ borderRadius: 16, marginBottom: 16, backgroundColor: theme.colors.surface }}>
          <Card.Content>
            <Text variant="bodyMedium">Scientific insights are turned off.</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              You can enable them in Settings → Scientific insights for quick science-backed nudges.
            </Text>
          </Card.Content>
        </Card>
      )}

      {!hasHistoricalMood && !moodQ.isLoading && !moodQ.error ? (
        <Card mode="outlined" style={{ borderRadius: 16, marginBottom: 16, backgroundColor: theme.colors.surface }}>
          <Card.Content style={{ alignItems: 'center', paddingVertical: 24 }}>
            <MaterialCommunityIcons
              name="emoticon-happy-outline"
              size={48}
              color={theme.colors.primary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text variant="titleMedium" style={{ marginTop: 12 }}>
              Your mood awaits
            </Text>
            <Text
              variant="bodyMedium"
              style={{ marginTop: 6, textAlign: 'center', color: theme.colors.onSurfaceVariant }}
            >
              Save a few check-ins to unlock streaks, insights, and kinder reminders tailored to your day.
            </Text>
          </Card.Content>
        </Card>
      ) : null}

      <Card mode="elevated" style={{ borderRadius: 16, marginBottom: 16, backgroundColor: theme.colors.surface }}>
        <Card.Title title="Last 14 days" />
        <Card.Content>
          {moodQ.isLoading && (
            <Text variant="bodyMedium" style={{ marginTop: 6, color: theme.colors.onSurfaceVariant }}>
              Loading mood history…
            </Text>
          )}
          {moodQ.error && (
            <HelperText type="error" visible>
              {(moodQ.error as any)?.message ?? 'Failed to load mood history.'}
            </HelperText>
          )}
          {!moodQ.isLoading && !moodQ.error && hasHistoricalMood ? (
            <>
              <MiniBarSparkline data={last14Series} maxValue={10} height={72} barWidth={12} gap={4} theme={theme} />
              <Text variant="bodyMedium" style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>
                7-day average: {avg7 ?? '—'}
              </Text>
            </>
          ) : !moodQ.isLoading && !moodQ.error && !hasHistoricalMood ? (
            <Text variant="bodyMedium" style={{ marginTop: 6, color: theme.colors.onSurfaceVariant, textAlign: 'center', paddingVertical: 24 }}>
              No mood data yet. Start logging your mood to see your 14-day trend.
            </Text>
          ) : null}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}
