import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme, type MD3Theme, Button } from 'react-native-paper';
import { SchedulingCard } from '@/components/SchedulingCard';

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
import { useMedReminderScheduler } from '@/hooks/useMedReminderScheduler';
import { cancelRemindersForMed } from '@/hooks/useNotifications';
import {
  findMedCatalogItemByName,
  getCategoryLabel,
  formatEffectTagLabel,
  formatStateImpactTagLabel,
  type MedCatalogItem,
} from '@/lib/medCatalog';
import { computeMedContextNotes, confidenceLabel, type MedContextInput } from '@/lib/medIntelligence';
import { useAppTheme } from '@/theme';
import { reclaimUtilityCardSurface } from '@/theme/reclaimVisualLanguage';
import { isMedDoseLogRelatedQueryKey } from '@/lib/sync/postReplayQueryInvalidation';

type RouteParams = { id: string };

type DoseRow = MedDoseLog & { scheduled_for?: string | null; taken_at?: string | null; created_at?: string | null };

const logWhenISO = (l: DoseRow) => l.scheduled_for ?? l.taken_at ?? l.created_at ?? new Date().toISOString();
const logWhenDate = (l: DoseRow) => new Date(logWhenISO(l));

function MiniBar({ pct, theme }: { pct: number; theme: MD3Theme }) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <View style={{ height: 10, backgroundColor: theme.colors.surfaceVariant, borderRadius: 999, overflow: 'hidden', marginTop: 6 }}>
      <View style={{ width: `${clamped}%`, height: '100%', backgroundColor: theme.colors.primary }} />
    </View>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
  theme,
  appTheme,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  theme: MD3Theme;
  appTheme: ReturnType<typeof useAppTheme>;
}) {
  return (
    <View style={{ marginTop: 12, padding: 12, borderRadius: 12, ...reclaimUtilityCardSurface(appTheme, 'quiet') }}>
      <Text style={{ fontWeight: '700', color: theme.colors.onSurface }}>{title}</Text>
      {!!subtitle && (
        <Text style={{ marginTop: 4, fontSize: 12, opacity: 0.72, color: theme.colors.onSurfaceVariant }}>{subtitle}</Text>
      )}
      {children}
    </View>
  );
}

export default function MedDetailsScreen() {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const route = useRoute();
  const nav = useNavigation();
  const qc = useQueryClient();
  const { scheduleForMed } = useMedReminderScheduler();

  const { id } = (route.params as RouteParams) ?? { id: '' };

  const medsQ = useQuery({ queryKey: ['meds'], queryFn: () => listMeds() });
  const logsQ = useQuery({
    queryKey: ['med_logs:30', id],
    queryFn: () => listMedDoseLogsMergedForMedLastNDays(id, 30),
    enabled: !!id,
  });
  const moodQ = useQuery({ queryKey: ['mood_checkins:30'], queryFn: () => listMoodCheckins(30) });
  const sleepQ = useQuery({ queryKey: ['sleep_sessions:14'], queryFn: () => listSleepSessions(14) });

  const med: Med | undefined = useMemo(() => {
    const arr = (medsQ.data ?? []) as Med[];
    return arr.find((m) => m.id === id);
  }, [medsQ.data, id]);

  const medLogs = useMemo(() => (logsQ.data ?? []) as DoseRow[], [logsQ.data]);

  const logTakenMut = useMutation({
    mutationFn: () => {
      const iso = new Date().toISOString();
      return logMedDose({ med_id: id, status: 'taken', scheduled_for: iso });
    },
    onSuccess: () => {
      qc.invalidateQueries({ predicate: (q) => isMedDoseLogRelatedQueryKey(q.queryKey) });
    },
    onError: (e: any) => Alert.alert('Log error', e?.message ?? 'Failed to log dose'),
  });

  const takenCount30 = useMemo(() => medLogs.filter((l) => l.status === 'taken').length, [medLogs]);
  const lastTakenLabel = useMemo(() => {
    const taken = medLogs.filter((l) => l.status === 'taken');
    let best = 0;
    for (const l of taken) {
      const t = new Date(l.taken_at ?? l.scheduled_for ?? '').getTime();
      if (Number.isFinite(t) && t > best) best = t;
    }
    return best ? new Date(best).toLocaleString() : null;
  }, [medLogs]);

  const scheduleAdherence30 = useMemo(() => {
    if (!med || !isScheduledMed(med)) return null;
    return computeAdherenceFromSchedule(medLogs as MedDoseLog[], [med], 30);
  }, [med, medLogs]);

  const byDay = useMemo(() => {
    const map = new Map<string, DoseRow[]>();
    for (const l of medLogs) {
      const d = logWhenDate(l);
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString();
      map.set(key, [...(map.get(key) ?? []), l]);
    }
    return Array.from(map.entries()).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [medLogs]);

  const formatLocalDateYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const moodSignals = useMemo(() => {
    const moods = (moodQ.data ?? []) as MoodCheckin[];
    if (!moods.length) return { latest: undefined, trend3dPct: undefined, tags: [] };

    const sorted = [...moods].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const latest = sorted[0];
    const latestMood = (latest as any)?.rating ?? (latest as any)?.mood;
    const latestTags = Array.isArray((latest as any)?.tags)
      ? (latest as any).tags.filter(Boolean).map((t: any) => String(t).toLowerCase())
      : [];

    const recent3 = sorted.slice(0, 3).map((m) => (m as any)?.rating ?? (m as any)?.mood).filter((v): v is number => typeof v === 'number');
    const previous3 = sorted.slice(3, 6).map((m) => (m as any)?.rating ?? (m as any)?.mood).filter((v): v is number => typeof v === 'number');

    let trend3dPct: number | undefined;

    if (sorted.length >= 6 && recent3.length > 0 && previous3.length > 0) {
      const distinctDays = new Set<string>();
      for (const m of sorted.slice(0, 6)) {
        const date = new Date(m.created_at);
        distinctDays.add(formatLocalDateYYYYMMDD(date));
      }

      if (distinctDays.size >= 3) {
        const recentAvg = recent3.reduce((a, b) => a + b, 0) / recent3.length;
        const previousAvg = previous3.reduce((a, b) => a + b, 0) / previous3.length;
        if (previousAvg !== 0) {
          trend3dPct = ((recentAvg - previousAvg) / previousAvg) * 100;
        }
      }
    }

    return {
      latest: typeof latestMood === 'number' ? latestMood : undefined,
      trend3dPct,
      tags: latestTags,
    };
  }, [moodQ.data]);

  const groupSleepByDate = (sessions: SleepSession[]): Map<string, number> => {
    const dayMap = new Map<string, number>();

    const getDurationHours = (s: SleepSession): number | undefined => {
      if (!s.start_time || !s.end_time) return undefined;
      const start = new Date(s.start_time).getTime();
      const end = new Date(s.end_time).getTime();
      if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return undefined;
      return (end - start) / (1000 * 60 * 60);
    };

    for (const session of sessions) {
      const duration = getDurationHours(session);
      if (duration === undefined) continue;
      const endDate = new Date(session.end_time);
      const dayKey = formatLocalDateYYYYMMDD(endDate);
      const existing = dayMap.get(dayKey) ?? 0;
      dayMap.set(dayKey, existing + duration);
    }

    return dayMap;
  };

  const isNightSession = (session: SleepSession): boolean => {
    if (!session.start_time || !session.end_time) return false;
    const start = new Date(session.start_time);
    const end = new Date(session.end_time);
    const startHour = start.getHours();
    const endHour = end.getHours();
    return startHour >= 18 || endHour < 12;
  };

  const sleepSignals = useMemo(() => {
    const sessions = (sleepQ.data ?? []) as SleepSession[];
    if (!sessions.length) return { lastNightHours: undefined, avg7dHours: undefined, sparseData: false };

    const getDurationHours = (s: SleepSession): number | undefined => {
      if (!s.start_time || !s.end_time) return undefined;
      const start = new Date(s.start_time).getTime();
      const end = new Date(s.end_time).getTime();
      if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return undefined;
      return (end - start) / (1000 * 60 * 60);
    };

    const dayMap = groupSleepByDate(sessions);
    const daysWithData = dayMap.size;
    const sparseData = daysWithData < 3;

    const now = new Date();
    let totalHours = 0;
    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayKey = formatLocalDateYYYYMMDD(date);
      totalHours += dayMap.get(dayKey) ?? 0;
    }
    const avg7dHours = sparseData ? undefined : totalHours / 7;

    let lastNightHours: number | undefined;
    const sorted = [...sessions].sort((a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime());
    const nightSessions = sorted.filter(isNightSession);
    if (nightSessions.length > 0) {
      lastNightHours = getDurationHours(nightSessions[0]);
    } else if (sorted.length > 0) {
      lastNightHours = getDurationHours(sorted[0]);
    }

    return {
      lastNightHours,
      avg7dHours,
      sparseData,
    };
  }, [sleepQ.data]);

  const adherenceSignals = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const logs7d = medLogs.filter((l) => {
      const d = logWhenDate(l);
      return d >= sevenDaysAgo;
    });

    const logs3d = medLogs.filter((l) => {
      const d = logWhenDate(l);
      return d >= threeDaysAgo;
    });

    const taken7d = logs7d.filter((l) => l.status === 'taken').length;
    const total7d = logs7d.length || 1;
    const adherencePct7d = Math.round((taken7d / total7d) * 100);

    const knownStatusLogs3d = logs3d.filter((l) => l.status === 'taken' || l.status === 'missed' || l.status === 'skipped');
    const unknownStatusCount = logs3d.length - knownStatusLogs3d.length;
    const unknownStatusPct = logs3d.length > 0 ? (unknownStatusCount / logs3d.length) * 100 : 0;

    let missedDoses3d: number | undefined;
    let hasUnknownStatus = false;

    if (unknownStatusPct > 30) {
      missedDoses3d = undefined;
      hasUnknownStatus = true;
    } else {
      missedDoses3d = knownStatusLogs3d.filter((l) => l.status === 'missed' || l.status === 'skipped').length;
      hasUnknownStatus = unknownStatusCount > 0;
    }

    return {
      adherencePct7d,
      missedDoses3d,
      hasUnknownStatus,
    };
  }, [medLogs]);

  const catalogMatch = useMemo(() => (med ? findMedCatalogItemByName(med.name) : null), [med]);

  const contextNotes = useMemo(() => {
    if (!med) return [];

    const stressTags = new Set(['stressed', 'overwhelmed', 'anxious', 'stress']);
    const hasStressTag = moodSignals.tags.some((t: string) => stressTags.has(t.toLowerCase()));

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

  if (!med) {
    return (
      <View style={{ flex: 1, padding: 16, backgroundColor: theme.colors.background }}>
        <Text style={{ fontWeight: '700', fontSize: 18, color: theme.colors.onSurface }}>Medication</Text>
        <Text style={{ marginTop: 8, color: theme.colors.error }}>Not found.</Text>
        <TouchableOpacity onPress={() => (nav as any).goBack()} style={{ marginTop: 12 }}>
          <Text style={{ color: theme.colors.primary }}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const times = (med.schedule as { times?: string[] })?.times?.join(', ') ?? '—';
  const days = (med.schedule as { days?: number[] })?.days?.join(',') ?? '—';
  const prn = isPrnMed(med);
  const hasSchedule = isScheduledMed(med);
  const curated = !!catalogMatch;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, backgroundColor: theme.colors.background }}>
      {/* Header summary */}
      <View style={{ marginBottom: 4 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: theme.colors.onSurface }}>{med.name}</Text>
        {!!med.dose && <Text style={{ marginTop: 2, opacity: 0.85, color: theme.colors.onSurfaceVariant }}>{med.dose}</Text>}
        <Text
          style={{
            marginTop: 8,
            alignSelf: 'flex-start',
            fontSize: 12,
            fontWeight: '600',
            overflow: 'hidden',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: theme.colors.surfaceVariant,
            color: theme.colors.onSurfaceVariant,
          }}
        >
          {prn ? 'As needed (PRN)' : curated ? 'Curated profile available' : 'General profile mode'}
        </Text>
        {prn ? (
          <Button
            mode="contained-tonal"
            style={{ marginTop: 12, alignSelf: 'flex-start' }}
            onPress={() => logTakenMut.mutate()}
            loading={logTakenMut.isPending}
            accessibilityLabel="Log this medication as taken now"
          >
            Log taken now
          </Button>
        ) : null}
        <Text style={{ marginTop: 8, fontSize: 12, opacity: 0.75, color: theme.colors.onSurfaceVariant }}>
          Educational context only — not a diagnosis and not instructions to change medication. Decisions belong with your clinician or pharmacist.
        </Text>
      </View>

      {/* Schedule / reminders */}
      <SectionCard title="Schedule & reminders" theme={theme} appTheme={appTheme}>
        {prn ? (
          <>
            <Text style={{ marginTop: 8, opacity: 0.88, color: theme.colors.onSurfaceVariant }}>
              This entry is as-needed. Reclaim does not expect fixed daily doses and will not run recurring dose reminders for it.
            </Text>
            <Text style={{ marginTop: 8, fontSize: 12, opacity: 0.7, color: theme.colors.onSurfaceVariant }}>
              Log when you take a dose using the button above or from the Meds list.
            </Text>
          </>
        ) : (
          <>
            <Text style={{ marginTop: 8, opacity: 0.88, color: theme.colors.onSurfaceVariant }}>
              {hasSchedule ? (
                <>
                  Times: {times}
                  {'\n'}
                  Days: {days}{' '}
                  <Text style={{ opacity: 0.65 }}>(1=Mon…7=Sun)</Text>
                </>
              ) : (
                'No fixed schedule saved for this entry. You can add times on the Meds screen.'
              )}
            </Text>
            <Text style={{ marginTop: 8, fontSize: 12, opacity: 0.7, color: theme.colors.onSurfaceVariant }}>
              Reminders schedule the next ~24 hours on your device. They are not a guarantee of delivery (phone settings may affect alerts).
            </Text>
            <View style={{ marginTop: 12 }}>
              <SchedulingCard
                title="Reminders"
                subtitle="Manage this medication’s reminders"
                status={
                  <View>
                    <Text style={{ opacity: 0.85, color: theme.colors.onSurfaceVariant }}>Times: {times}</Text>
                    <Text style={{ opacity: 0.85, color: theme.colors.onSurfaceVariant }}>
                      Days: {days} <Text style={{ opacity: 0.6, color: theme.colors.onSurfaceVariant }}>(1=Mon…7=Sun)</Text>
                    </Text>
                  </View>
                }
                primaryActionLabel="Schedule next 24h"
                onPrimaryAction={async () => {
                  try {
                    await scheduleForMed(med);
                    Alert.alert('Scheduled', 'Next 24h reminders set.');
                  } catch (e: any) {
                    Alert.alert('Error', e?.message ?? 'Failed to schedule');
                  }
                }}
                secondaryActionLabel="Cancel reminders"
                onSecondaryAction={async () => {
                  try {
                    await cancelRemindersForMed(med.id!);
                    Alert.alert('Canceled', 'All reminders for this med canceled.');
                  } catch (e: any) {
                    Alert.alert('Error', e?.message ?? 'Failed');
                  }
                }}
              />
            </View>
          </>
        )}
      </SectionCard>

      {/* Active ingredient / classification */}
      <SectionCard
        title="Active ingredient & classification"
        subtitle="From your entry and our small curated catalog when available."
        theme={theme}
        appTheme={appTheme}
      >
        {catalogMatch ? (
          <>
            {!!catalogMatch.activeIngredients?.length && (
              <Text style={{ marginTop: 8, opacity: 0.9, color: theme.colors.onSurface }}>
                Active ingredient(s): {catalogMatch.activeIngredients.join(', ')}
              </Text>
            )}
            <Text style={{ marginTop: 6, opacity: 0.88, color: theme.colors.onSurfaceVariant }}>
              Class: {catalogMatch.medicationClass ?? getCategoryLabel(catalogMatch.category)}
            </Text>
            <Text style={{ marginTop: 6, fontSize: 12, opacity: 0.72, color: theme.colors.onSurfaceVariant }}>
              Catalog match uses your medication name; spelling or formulation differences can affect matching.
            </Text>
          </>
        ) : (
          <>
            <Text style={{ marginTop: 8, opacity: 0.9, color: theme.colors.onSurface }}>
              Reclaim doesn’t yet have a curated educational profile for “{med.name}”.
            </Text>
            <Text style={{ marginTop: 8, opacity: 0.85, color: theme.colors.onSurfaceVariant }}>
              Your tracking here still helps you see timing and consistency over time. If the name doesn’t look right, consider confirming the exact spelling with your pharmacist or clinician — Reclaim can’t verify your prescription label.
            </Text>
          </>
        )}
      </SectionCard>

      {/* How it works */}
      <SectionCard title="How it works" subtitle="High-level education — individual responses vary." theme={theme} appTheme={appTheme}>
        {catalogMatch ? (
          <CatalogEducationBlock catalog={catalogMatch} theme={theme} />
        ) : (
          <Text style={{ marginTop: 8, opacity: 0.88, color: theme.colors.onSurfaceVariant }}>
            Without a curated entry, we still show schedule, reminders, and your logging below. That’s useful context for you and your care team — it’s not proof of what medication you’re taking or how it affects you.
          </Text>
        )}
      </SectionCard>

      {/* Why this may matter today */}
      <SectionCard
        title="Why this may matter today"
        subtitle="Pattern-based notes — not medical advice."
        theme={theme}
        appTheme={appTheme}
      >
        {contextNotes.length === 0 ? (
          <Text style={{ marginTop: 8, opacity: 0.85, color: theme.colors.onSurfaceVariant }}>
            No personalized notes right now — keep logging mood and sleep for deeper context.
          </Text>
        ) : (
          <View style={{ marginTop: 8 }}>
            {contextNotes.map((note) => {
              const reasonsHumanized = note.reasons
                .map((r) => {
                  if (r === 'stress_flag') return 'stress';
                  if (r === 'stress_tag_present') return 'stress tags';
                  if (r === 'mood_latest_low') return 'low mood';
                  if (r === 'mood_trend_down') return 'mood trend';
                  if (r === 'sleep_lastNight_low') return 'last night sleep';
                  if (r === 'sleep_avg7d_low') return 'recent sleep';
                  if (r === 'adherence_low') return 'adherence';
                  if (r === 'missed_doses_recent') return 'missed doses';
                  return r;
                })
                .join(', ');

              return (
                <View key={note.id} style={{ marginTop: 8, padding: 10, backgroundColor: theme.colors.surfaceVariant, borderRadius: 8 }}>
                  <Text style={{ fontWeight: '600', color: theme.colors.onSurface }}>{note.title}</Text>
                  <Text style={{ marginTop: 4, opacity: 0.9, color: theme.colors.onSurface }}>{note.message}</Text>
                  <View style={{ flexDirection: 'row', marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 11, opacity: 0.7, color: theme.colors.onSurfaceVariant }}>
                      Confidence: {confidenceLabel(note.confidence)}
                    </Text>
                    {reasonsHumanized ? (
                      <Text style={{ fontSize: 11, opacity: 0.6, color: theme.colors.onSurfaceVariant, marginLeft: 8 }}>
                        • Based on: {reasonsHumanized}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </SectionCard>

      {/* Possible state relevance */}
      <SectionCard
        title="Possible state relevance"
        subtitle="How Reclaim may use medication as context — not proof of cause."
        theme={theme}
        appTheme={appTheme}
      >
        {catalogMatch && (catalogMatch.effectTags?.length || catalogMatch.stateImpactTags?.length) ? (
          <>
            <Text style={{ marginTop: 8, fontSize: 12, opacity: 0.78, color: theme.colors.onSurfaceVariant }}>
              Tags describe where this medication type might overlap with how you interpret sleep, mood, energy, pain, or training — as one signal among many. They are not predictions about you personally.
            </Text>
            {!!catalogMatch.effectTags?.length && (
              <View style={{ marginTop: 10 }}>
                <Text style={{ fontWeight: '600', color: theme.colors.onSurface }}>May affect interpretation</Text>
                {catalogMatch.effectTags.map((tag) => (
                  <Text key={tag} style={{ marginTop: 4, opacity: 0.88, color: theme.colors.onSurfaceVariant }}>
                    • {formatEffectTagLabel(tag)}
                  </Text>
                ))}
              </View>
            )}
            {!!catalogMatch.stateImpactTags?.length && (
              <View style={{ marginTop: 10 }}>
                <Text style={{ fontWeight: '600', color: theme.colors.onSurface }}>Where context might show up</Text>
                {catalogMatch.stateImpactTags.map((tag) => (
                  <Text key={tag} style={{ marginTop: 4, opacity: 0.88, color: theme.colors.onSurfaceVariant }}>
                    • {formatStateImpactTagLabel(tag)}
                  </Text>
                ))}
              </View>
            )}
          </>
        ) : (
          <Text style={{ marginTop: 8, opacity: 0.88, color: theme.colors.onSurfaceVariant }}>
            When a medication is part of your routine, it can be one context signal alongside sleep, mood, soreness, and training — never the whole story. Without curated tags for this name, stick to your logs and care-team guidance.
          </Text>
        )}
      </SectionCard>

      {/* Recent doses */}
      <SectionCard title="Recent doses" subtitle="Merged device + cloud history when signed in." theme={theme} appTheme={appTheme}>
        {logsQ.isLoading ? (
          <Text style={{ marginTop: 8, opacity: 0.7, color: theme.colors.onSurfaceVariant }}>Loading…</Text>
        ) : byDay.length === 0 ? (
          <Text style={{ marginTop: 8, opacity: 0.75, color: theme.colors.onSurfaceVariant }}>
            {prn
              ? 'No doses logged in the last 30 days. As-needed medications are tracked by use, not daily adherence.'
              : 'No doses logged in the last 30 days.'}
          </Text>
        ) : (
          byDay.map(([day, rows]) => (
            <View key={day} style={{ marginTop: 10 }}>
              <Text style={{ fontWeight: '700', marginBottom: 4, color: theme.colors.onSurface }}>{day}</Text>
              {rows.map((l) => {
                const when = logWhenDate(l);
                const rowKey = l.id ?? `${l.scheduled_for ?? ''}-${l.status}-${l.taken_at ?? ''}`;
                return (
                  <Text key={rowKey} style={{ opacity: 0.85, marginBottom: 4, color: theme.colors.onSurfaceVariant }}>
                    {when.toLocaleTimeString()} • {l.status}
                  </Text>
                );
              })}
            </View>
          ))
        )}
      </SectionCard>

      {/* Logging summary */}
      <SectionCard
        title="30-day logging summary"
        subtitle={prn ? 'Use counts for as-needed medications — not schedule adherence %.' : 'Expected slots vs taken for fixed schedules — not clinical validation.'}
        theme={theme}
        appTheme={appTheme}
      >
        {prn ? (
          <>
            <Text style={{ marginTop: 6, opacity: 0.85, color: theme.colors.onSurfaceVariant }}>
              Logged (taken): {takenCount30} time{takenCount30 === 1 ? '' : 's'} in the last 30 days
            </Text>
            <Text style={{ marginTop: 6, opacity: 0.85, color: theme.colors.onSurfaceVariant }}>
              Last taken: {lastTakenLabel ?? '—'}
            </Text>
          </>
        ) : scheduleAdherence30 ? (
          <>
            <Text style={{ marginTop: 6, opacity: 0.85, color: theme.colors.onSurfaceVariant }}>
              Taken vs expected (30d): {scheduleAdherence30.taken}/{scheduleAdherence30.scheduled} ({scheduleAdherence30.pct}%)
            </Text>
            <MiniBar pct={scheduleAdherence30.pct} theme={theme} />
          </>
        ) : (
          <Text style={{ marginTop: 6, opacity: 0.85, color: theme.colors.onSurfaceVariant }}>Add a fixed schedule on the Meds screen to see adherence for this medication.</Text>
        )}
      </SectionCard>

      {/* Education boundary */}
      <SectionCard title="Education boundary" theme={theme} appTheme={appTheme}>
        <Text style={{ marginTop: 6, opacity: 0.88, color: theme.colors.onSurfaceVariant }}>
          Reclaim explains context so your patterns make more sense. It does not tell you to start, stop, combine, avoid, or change dose. If something feels off with your medication plan, that conversation belongs with a qualified professional.
        </Text>
        {catalogMatch?.sourceNote ? (
          <Text style={{ marginTop: 10, fontSize: 12, opacity: 0.72, fontStyle: 'italic', color: theme.colors.onSurfaceVariant }}>
            {catalogMatch.sourceNote}
          </Text>
        ) : null}
        {catalogMatch ? (
          <Text style={{ marginTop: 10, fontSize: 12, opacity: 0.72, fontStyle: 'italic', color: theme.colors.onSurfaceVariant }}>
            {catalogMatch.safetyNote}
          </Text>
        ) : null}
      </SectionCard>

      <TouchableOpacity onPress={() => (nav as any).goBack()} style={{ alignSelf: 'flex-start', marginTop: 14 }}>
        <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>Open in Meds to edit</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function CatalogEducationBlock({ catalog, theme }: { catalog: MedCatalogItem; theme: MD3Theme }) {
  return (
    <>
      <Text style={{ marginTop: 8, fontSize: 12, opacity: 0.72, color: theme.colors.onSurfaceVariant }}>
        {getCategoryLabel(catalog.category)}
        {catalog.medicationClass ? ` • ${catalog.medicationClass}` : ''} • Confidence: {confidenceLabel(catalog.confidence)}
      </Text>
      <Text style={{ marginTop: 10, opacity: 0.92, color: theme.colors.onSurface }}>{catalog.mechanism}</Text>
      {!!catalog.plainEnglishMechanism && (
        <Text style={{ marginTop: 8, opacity: 0.88, color: theme.colors.onSurfaceVariant }}>{catalog.plainEnglishMechanism}</Text>
      )}
      {!!catalog.commonUses?.length && (
        <View style={{ marginTop: 10 }}>
          <Text style={{ fontWeight: '600', color: theme.colors.onSurface }}>Common uses (general)</Text>
          {catalog.commonUses.map((u, idx) => (
            <Text key={idx} style={{ marginTop: 4, opacity: 0.85, color: theme.colors.onSurfaceVariant }}>
              • {u}
            </Text>
          ))}
        </View>
      )}
      {(catalog.onsetWindow || catalog.durationWindow) && (
        <View style={{ marginTop: 10 }}>
          <Text style={{ fontWeight: '600', color: theme.colors.onSurface }}>Timing (general, not personalized)</Text>
          {!!catalog.onsetWindow && (
            <Text style={{ marginTop: 4, opacity: 0.85, color: theme.colors.onSurfaceVariant }}>Onset: {catalog.onsetWindow}</Text>
          )}
          {!!catalog.durationWindow && (
            <Text style={{ marginTop: 4, opacity: 0.85, color: theme.colors.onSurfaceVariant }}>Duration: {catalog.durationWindow}</Text>
          )}
        </View>
      )}
      {!!catalog.whatYouMightNotice?.length && (
        <View style={{ marginTop: 10 }}>
          <Text style={{ fontWeight: '600', marginBottom: 4, color: theme.colors.onSurface }}>What some people notice</Text>
          {(catalog.whatYouMightNotice ?? []).map((item, idx) => (
            <Text key={idx} style={{ marginTop: 2, opacity: 0.85, color: theme.colors.onSurfaceVariant }}>
              • {item}
            </Text>
          ))}
        </View>
      )}
      {!!catalog.mentalHealthLinks?.length && (
        <View style={{ marginTop: 10 }}>
          <Text style={{ fontWeight: '600', marginBottom: 4, color: theme.colors.onSurface }}>Related context</Text>
          {(catalog.mentalHealthLinks ?? []).map((item, idx) => (
            <Text key={idx} style={{ marginTop: 2, opacity: 0.85, color: theme.colors.onSurfaceVariant }}>
              • {item}
            </Text>
          ))}
        </View>
      )}
    </>
  );
}
