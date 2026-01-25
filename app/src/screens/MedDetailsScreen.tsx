import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from 'react-native-paper';

import { listMeds, listMedLogsLastNDays, logMedDose, listMoodCheckins, listSleepSessions, type Med, type MedLog, type MoodCheckin, type SleepSession } from '@/lib/api';
import { useMedReminderScheduler } from '@/hooks/useMedReminderScheduler';
import { cancelRemindersForMed } from '@/hooks/useNotifications';
import type { MedsStackParamList } from '@/routing/MedsStack';
import { findMedCatalogItemByName, getCategoryLabel } from '@/lib/medCatalog';
import { computeMedContextNotes, confidenceLabel, type MedContextInput } from '@/lib/medIntelligence';

type RouteParams = { id: string };

// Compat: some logs may have scheduled_for / created_at
type MedLogCompat = MedLog & { scheduled_for?: string | null; created_at?: string | null };
const logWhenISO = (l: MedLogCompat) => l.scheduled_for ?? l.taken_at ?? l.created_at ?? new Date().toISOString();
const logWhenDate = (l: MedLogCompat) => new Date(logWhenISO(l));

function MiniBar({ pct, theme }: { pct: number; theme: any }) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <View style={{ height: 10, backgroundColor: theme.colors.surfaceVariant, borderRadius: 999, overflow: 'hidden', marginTop: 6 }}>
      <View style={{ width: `${clamped}%`, height: '100%', backgroundColor: theme.colors.primary }} />
    </View>
  );
}

export default function MedDetailsScreen() {
  const theme = useTheme();
  const route = useRoute();
  const nav = useNavigation();
  const qc = useQueryClient();
  const { scheduleForMed } = useMedReminderScheduler();

  const { id } = (route.params as RouteParams) ?? { id: '' };

  const medsQ = useQuery({ queryKey: ['meds'], queryFn: () => listMeds() });
  const logsQ = useQuery({ queryKey: ['med_logs:30', id], queryFn: () => listMedLogsLastNDays(30) });
  const moodQ = useQuery({ queryKey: ['mood_checkins:30'], queryFn: () => listMoodCheckins(30) });
  const sleepQ = useQuery({ queryKey: ['sleep_sessions:14'], queryFn: () => listSleepSessions(14) });

  const med: Med | undefined = useMemo(() => {
    const arr = (medsQ.data ?? []) as Med[];
    return arr.find(m => m.id === id);
  }, [medsQ.data, id]);

  const medLogs = useMemo(() => {
    const all = (logsQ.data ?? []) as MedLog[];
    return all.filter(l => l.med_id === id) as MedLogCompat[];
  }, [logsQ.data, id]);

  const logMut = useMutation({
    mutationFn: (args: { med_id: string; status: 'taken'|'skipped'|'missed'; scheduled_for?: string }) => logMedDose(args),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['med_logs:30', id] }),
    onError: (e: any) => Alert.alert('Log error', e?.message ?? 'Failed to log dose'),
  });

  // Adherence (30d)
  const { pct30, taken30, total30 } = useMemo(() => {
    const taken = medLogs.filter(l => l.status === 'taken').length;
    const total = medLogs.length || 1;
    const pct = Math.round((taken / total) * 100);
    return { pct30: pct, taken30: taken, total30: total };
  }, [medLogs]);

  // Group logs by day (desc)
  const byDay = useMemo(() => {
    const map = new Map<string, MedLogCompat[]>();
    for (const l of medLogs) {
      const d = logWhenDate(l);
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString();
      map.set(key, [...(map.get(key) ?? []), l]);
    }
    return Array.from(map.entries()).sort(
      (a,b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()
    );
  }, [medLogs]);

  // Helper: format date as YYYY-MM-DD (local timezone)
  const formatLocalDateYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Compute mood signals
  const moodSignals = useMemo(() => {
    const moods = (moodQ.data ?? []) as MoodCheckin[];
    if (!moods.length) return { latest: undefined, trend3dPct: undefined, tags: [] };

    // Sort by created_at desc
    const sorted = [...moods].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const latest = sorted[0];
    const latestMood = (latest as any)?.rating ?? (latest as any)?.mood;
    const latestTags = Array.isArray((latest as any)?.tags) 
      ? (latest as any).tags.filter(Boolean).map((t: any) => String(t).toLowerCase())
      : [];

    // Trend: last 3 vs previous 3
    // Only compute if at least 6 checkins exist AND span ≥3 distinct calendar days
    const recent3 = sorted.slice(0, 3).map(m => (m as any)?.rating ?? (m as any)?.mood).filter((v): v is number => typeof v === 'number');
    const previous3 = sorted.slice(3, 6).map(m => (m as any)?.rating ?? (m as any)?.mood).filter((v): v is number => typeof v === 'number');

    let trend3dPct: number | undefined;
    
    // Quality gating: need at least 6 checkins
    if (sorted.length >= 6 && recent3.length > 0 && previous3.length > 0) {
      // Check if checkins span ≥3 distinct calendar days
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

  // Helper: group sleep sessions by date and sum durations per day
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
      
      // Use end_time date (local timezone) as the day key
      const endDate = new Date(session.end_time);
      const dayKey = formatLocalDateYYYYMMDD(endDate);
      
      const existing = dayMap.get(dayKey) ?? 0;
      dayMap.set(dayKey, existing + duration);
    }
    
    return dayMap;
  };

  // Helper: check if session overlaps typical night window (18:00–12:00 next day)
  const isNightSession = (session: SleepSession): boolean => {
    if (!session.start_time || !session.end_time) return false;
    const start = new Date(session.start_time);
    const end = new Date(session.end_time);
    
    const startHour = start.getHours();
    const endHour = end.getHours();
    
    // Night session: starts after 18:00 OR ends before 12:00 (next day)
    return startHour >= 18 || endHour < 12;
  };

  // Compute sleep signals
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

    // Group by date
    const dayMap = groupSleepByDate(sessions);
    
    // Check if data is sparse (<3 days with any sessions)
    const daysWithData = dayMap.size;
    const sparseData = daysWithData < 3;

    // Compute avg7dHours: last 7 calendar days (including today)
    const now = new Date();
    let totalHours = 0;
    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayKey = formatLocalDateYYYYMMDD(date);
      totalHours += dayMap.get(dayKey) ?? 0; // Treat missing days as 0 hours
    }
    const avg7dHours = sparseData ? undefined : totalHours / 7;

    // Compute lastNightHours: prefer night sessions, fallback to most recent
    let lastNightHours: number | undefined;
    
    // Sort by end_time desc
    const sorted = [...sessions].sort((a, b) => 
      new Date(b.end_time).getTime() - new Date(a.end_time).getTime()
    );
    
    // Prefer night sessions
    const nightSessions = sorted.filter(isNightSession);
    if (nightSessions.length > 0) {
      lastNightHours = getDurationHours(nightSessions[0]);
    } else if (sorted.length > 0) {
      // Fallback to most recent session
      lastNightHours = getDurationHours(sorted[0]);
    }

    return {
      lastNightHours,
      avg7dHours,
      sparseData,
    };
  }, [sleepQ.data]);

  // Compute adherence signals (7d and missed doses 3d)
  const adherenceSignals = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const logs7d = medLogs.filter(l => {
      const d = logWhenDate(l);
      return d >= sevenDaysAgo;
    });

    const logs3d = medLogs.filter(l => {
      const d = logWhenDate(l);
      return d >= threeDaysAgo;
    });

    const taken7d = logs7d.filter(l => l.status === 'taken').length;
    const total7d = logs7d.length || 1;
    const adherencePct7d = Math.round((taken7d / total7d) * 100);

    // Defensive missed dose logic: treat unknown status as neutral
    const knownStatusLogs3d = logs3d.filter(l => 
      l.status === 'taken' || l.status === 'missed' || l.status === 'skipped'
    );
    const unknownStatusCount = logs3d.length - knownStatusLogs3d.length;
    const unknownStatusPct = logs3d.length > 0 ? (unknownStatusCount / logs3d.length) * 100 : 0;
    
    let missedDoses3d: number | undefined;
    let hasUnknownStatus = false;
    
    if (unknownStatusPct > 30) {
      // Too many unknown statuses → set to undefined
      missedDoses3d = undefined;
      hasUnknownStatus = true;
    } else {
      // Count only known missed/skipped statuses
      missedDoses3d = knownStatusLogs3d.filter(l => l.status === 'missed' || l.status === 'skipped').length;
      hasUnknownStatus = unknownStatusCount > 0;
    }

    return {
      adherencePct7d,
      missedDoses3d,
      hasUnknownStatus,
    };
  }, [medLogs]);

  // Build context input and compute notes
  const catalogMatch = useMemo(() => med ? findMedCatalogItemByName(med.name) : null, [med]);
  const contextNotes = useMemo(() => {
    if (!med) return [];

    const stressTags = new Set(['stressed', 'overwhelmed', 'anxious', 'stress']);
    const hasStressTag = moodSignals.tags.some((t: string) => stressTags.has(t.toLowerCase()));

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
      meds: {
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

  const times = med.schedule?.times?.join(', ') ?? '—';
  const days  = med.schedule?.days?.join(',') ?? '—';

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, backgroundColor: theme.colors.background }}>
      {/* Header */}
      <Text style={{ fontSize: 22, fontWeight: '800', color: theme.colors.onSurface }}>{med.name}</Text>
      {!!med.dose && <Text style={{ marginTop: 2, opacity: 0.8, color: theme.colors.onSurfaceVariant }}>{med.dose}</Text>}

      {/* Schedule */}
      <View style={{ marginTop: 12, padding: 12, borderWidth: 1, borderColor: theme.colors.outlineVariant, borderRadius: 12, backgroundColor: theme.colors.surface }}>
        <Text style={{ fontWeight: '700', color: theme.colors.onSurface }}>Schedule</Text>
        <Text style={{ marginTop: 4, opacity: 0.85, color: theme.colors.onSurfaceVariant }}>Times: {times}</Text>
        <Text style={{ opacity: 0.85, color: theme.colors.onSurfaceVariant }}>Days: {days}  <Text style={{ opacity: 0.6, color: theme.colors.onSurfaceVariant }}>(1=Mon…7=Sun)</Text></Text>
      </View>

      {/* Quick actions for reminders */}
      <View style={{ marginTop: 12, padding: 12, borderWidth: 1, borderColor: theme.colors.outlineVariant, borderRadius: 12, backgroundColor: theme.colors.surface }}>
        <Text style={{ fontWeight: '700', color: theme.colors.onSurface }}>Reminders</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
          <TouchableOpacity
            onPress={async () => {
              try { await scheduleForMed(med); Alert.alert('Scheduled', 'Next 24h reminders set.'); }
              catch (e: any) { Alert.alert('Error', e?.message ?? 'Failed to schedule'); }
            }}
            style={{ backgroundColor: theme.colors.primary, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, marginRight: 10, marginBottom: 8 }}
          >
            <Text style={{ color: theme.colors.onPrimary, fontWeight: '600' }}>Schedule next 24h</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              try { await cancelRemindersForMed(med.id!); Alert.alert('Canceled', 'All reminders for this med canceled.'); }
              catch (e: any) { Alert.alert('Error', e?.message ?? 'Failed'); }
            }}
            style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.outlineVariant, marginBottom: 8 }}
          >
            <Text style={{ fontWeight: '600', color: theme.colors.onSurface }}>Cancel reminders</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Adherence */}
      <View style={{ marginTop: 12, padding: 12, borderWidth: 1, borderColor: theme.colors.outlineVariant, borderRadius: 12, backgroundColor: theme.colors.surface }}>
        <Text style={{ fontWeight: '700', color: theme.colors.onSurface }}>Adherence (30 days)</Text>
        <Text style={{ marginTop: 4, opacity: 0.85, color: theme.colors.onSurfaceVariant }}>Taken: {taken30}/{total30}  ({pct30}%)</Text>
        <MiniBar pct={pct30} theme={theme} />
      </View>

      {/* Recent logs */}
      <View style={{ marginTop: 12, padding: 12, borderWidth: 1, borderColor: theme.colors.outlineVariant, borderRadius: 12, backgroundColor: theme.colors.surface }}>
        <Text style={{ fontWeight: '700', color: theme.colors.onSurface }}>Recent</Text>
        {byDay.length === 0 && <Text style={{ marginTop: 6, opacity: 0.7, color: theme.colors.onSurfaceVariant }}>No logs in the last 30 days.</Text>}
        {byDay.map(([day, rows]) => (
          <View key={day} style={{ marginTop: 8 }}>
            <Text style={{ fontWeight: '700', marginBottom: 4, color: theme.colors.onSurface }}>{day}</Text>
            {rows.map((l) => {
              const when = logWhenDate(l);
              return (
                <Text key={l.id} style={{ opacity: 0.85, marginBottom: 4, color: theme.colors.onSurfaceVariant }}>
                  {when.toLocaleTimeString()} • {l.status}
                </Text>
              );
            })}
          </View>
        ))}
      </View>

      {/* How it works (education) */}
      {catalogMatch && (
        <View style={{ marginTop: 12, padding: 12, borderWidth: 1, borderColor: theme.colors.outlineVariant, borderRadius: 12, backgroundColor: theme.colors.surface }}>
          <Text style={{ fontWeight: '700', color: theme.colors.onSurface }}>How it works</Text>
          <Text style={{ marginTop: 4, fontSize: 12, opacity: 0.7, color: theme.colors.onSurfaceVariant }}>
            {getCategoryLabel(catalogMatch.category)}
            {' • '}
            Confidence: {confidenceLabel(catalogMatch.confidence)}
          </Text>
          <Text style={{ marginTop: 8, opacity: 0.9, color: theme.colors.onSurface }}>{catalogMatch.mechanism}</Text>
          
          {catalogMatch.whatYouMightNotice.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontWeight: '600', marginBottom: 4, color: theme.colors.onSurface }}>What you might notice:</Text>
              {catalogMatch.whatYouMightNotice.map((item, idx) => (
                <Text key={idx} style={{ marginTop: 2, opacity: 0.85, color: theme.colors.onSurfaceVariant }}>
                  • {item}
                </Text>
              ))}
            </View>
          )}

          {catalogMatch.mentalHealthLinks.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontWeight: '600', marginBottom: 4, color: theme.colors.onSurface }}>Mental health links:</Text>
              {catalogMatch.mentalHealthLinks.map((item, idx) => (
                <Text key={idx} style={{ marginTop: 2, opacity: 0.85, color: theme.colors.onSurfaceVariant }}>
                  • {item}
                </Text>
              ))}
            </View>
          )}

          <Text style={{ marginTop: 12, fontSize: 11, opacity: 0.7, fontStyle: 'italic', color: theme.colors.onSurfaceVariant }}>
            {catalogMatch.safetyNote}
          </Text>
        </View>
      )}

      {!catalogMatch && (
        <View style={{ marginTop: 12, padding: 12, borderWidth: 1, borderColor: theme.colors.outlineVariant, borderRadius: 12, backgroundColor: theme.colors.surface }}>
          <Text style={{ fontWeight: '700', color: theme.colors.onSurface }}>How it works</Text>
          <Text style={{ marginTop: 4, opacity: 0.85, color: theme.colors.onSurfaceVariant }}>
            We don't have an explainer for this medication yet.
          </Text>
        </View>
      )}

      {/* How this may relate to you (today) */}
      <View style={{ marginTop: 12, padding: 12, borderWidth: 1, borderColor: theme.colors.outlineVariant, borderRadius: 12, backgroundColor: theme.colors.surface }}>
        <Text style={{ fontWeight: '700', color: theme.colors.onSurface }}>How this may relate to you (today)</Text>
        <Text style={{ marginTop: 2, fontSize: 11, opacity: 0.6, fontStyle: 'italic', color: theme.colors.onSurfaceVariant }}>
          These are pattern-based notes — not medical advice.
        </Text>
        
        {contextNotes.length === 0 ? (
          <Text style={{ marginTop: 6, opacity: 0.85, color: theme.colors.onSurfaceVariant }}>
            No personalized notes right now — keep logging mood and sleep for deeper insights.
          </Text>
        ) : (
          <View style={{ marginTop: 8 }}>
            {contextNotes.map((note) => {
              const reasonsHumanized = note.reasons.map(r => {
                if (r === 'stress_flag') return 'stress';
                if (r === 'stress_tag_present') return 'stress tags';
                if (r === 'mood_latest_low') return 'low mood';
                if (r === 'mood_trend_down') return 'mood trend';
                if (r === 'sleep_lastNight_low') return 'last night sleep';
                if (r === 'sleep_avg7d_low') return 'recent sleep';
                if (r === 'adherence_low') return 'adherence';
                if (r === 'missed_doses_recent') return 'missed doses';
                return r;
              }).join(', ');

              return (
                <View key={note.id} style={{ marginTop: 8, padding: 10, backgroundColor: theme.colors.surfaceVariant, borderRadius: 8 }}>
                  <Text style={{ fontWeight: '600', color: theme.colors.onSurface }}>{note.title}</Text>
                  <Text style={{ marginTop: 4, opacity: 0.9, color: theme.colors.onSurface }}>{note.message}</Text>
                  <View style={{ flexDirection: 'row', marginTop: 6, alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, opacity: 0.7, color: theme.colors.onSurfaceVariant }}>
                      Confidence: {confidenceLabel(note.confidence)}
                    </Text>
                    {reasonsHumanized && (
                      <Text style={{ fontSize: 11, opacity: 0.6, color: theme.colors.onSurfaceVariant, marginLeft: 8 }}>
                        • Based on: {reasonsHumanized}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Manage / Edit */}
      <TouchableOpacity
        onPress={() => (nav as any).goBack()} // keep editing on main Meds screen for now
        style={{ alignSelf: 'flex-start', marginTop: 14 }}
      >
        <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>Open in Meds to edit</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
