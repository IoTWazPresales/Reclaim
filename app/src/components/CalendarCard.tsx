// C:\Reclaim\app\src\components\CalendarCard.tsx
/**
 * Calendar Card Component (Unified Schedule)
 * - Shows ONE continuous timeline: Calendar events + Med doses + Sleep routine
 * - Designed to match Dashboard "Today" logic (same data sources + same sorting)
 * - Safe in overlay/Portal (uses same react-query instance as the app)
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, Text, useTheme, Chip, ActivityIndicator, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format, formatDistanceToNow, isPast, isWithinInterval } from 'date-fns';

import { useAppTheme } from '@/theme';
import { getTodayEvents, type CalendarEvent } from '@/lib/calendar';
import { loadSleepSettings, type SleepSettings } from '@/lib/sleepSettings';
import {
  listMeds,
  listMedDoseLogsRemoteLastNDays,
  upcomingDoseTimes,
  logMedDose,
  type Med,
} from '@/lib/api';

const REMINDER_MINUTES = 15;

type UnifiedItem =
  | {
      key: string;
      time: Date;
      kind: 'calendar';
      title: string;
      subtitle?: string;
      icon: keyof typeof MaterialCommunityIcons.glyphMap;
      accent: 'warning' | 'current' | 'upcoming';
    }
  | {
      key: string;
      time: Date;
      kind: 'sleep';
      title: string;
      subtitle?: string;
      icon: keyof typeof MaterialCommunityIcons.glyphMap;
      accent: 'warning' | 'current' | 'upcoming';
    }
  | {
      key: string;
      time: Date;
      kind: 'med';
      title: string;
      subtitle?: string;
      icon: keyof typeof MaterialCommunityIcons.glyphMap;
      accent: 'warning' | 'current' | 'upcoming';
      medId: string;
      scheduledISO: string;
    }
  | {
      key: string;
      time: Date;
      kind: 'info';
      title: string;
      subtitle?: string;
      icon: keyof typeof MaterialCommunityIcons.glyphMap;
      accent: 'warning' | 'current' | 'upcoming';
    };

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function parseHHMMToMinutes(hhmm: string): number | null {
  const s = (hhmm ?? '').trim();
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

function dateWithTimeLikeToday(timeMins: number, base?: Date) {
  const now = base ?? new Date();
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(timeMins);
  return d;
}

function getEventStatusFromTimes(start: Date, end?: Date): 'upcoming' | 'current' | 'past' | 'warning' {
  const now = new Date();

  // If an explicit end exists, use it for "past/current"
  if (end) {
    if (isPast(end)) return 'past';
    if (isWithinInterval(now, { start, end })) return 'current';
  } else {
    // No end: treat as "past" only if start is far in the past
    if (start.getTime() < now.getTime() - 60 * 60 * 1000) return 'past';
  }

  const reminderTime = new Date(start.getTime() - REMINDER_MINUTES * 60 * 1000);
  if (now >= reminderTime && now < start) return 'warning';
  return 'upcoming';
}

function getCalendarIconFromTitle(title: string): keyof typeof MaterialCommunityIcons.glyphMap {
  const t = (title ?? '').toLowerCase();
  if (t.includes('doctor') || t.includes('appointment') || t.includes('medical')) return 'medical-bag';
  if (t.includes('work') || t.includes('meeting')) return 'briefcase';
  if (t.includes('gym') || t.includes('exercise') || t.includes('workout')) return 'dumbbell';
  if (t.includes('lunch') || t.includes('dinner') || t.includes('meal')) return 'food';
  if (t.includes('therapy') || t.includes('counseling')) return 'heart-pulse';
  return 'calendar-clock';
}

type CalendarCardProps = {
  testID?: string;
};

export function CalendarCard({ testID }: CalendarCardProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const styles = React.useMemo(() => makeStyles(appTheme), [appTheme]);
  const qc = useQueryClient();

  const [now, setNow] = useState(new Date());

  // Refresh statuses every minute (warning/current changes)
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const medsQ = useQuery<Med[]>({
    queryKey: ['meds:list'],
    queryFn: listMeds,
    retry: false,
    throwOnError: false,
    staleTime: 30_000,
  });

  const medLogsQ = useQuery({
    queryKey: ['meds:logs:7d'],
    queryFn: () => listMedDoseLogsRemoteLastNDays(7),
    retry: false,
    throwOnError: false,
    staleTime: 30_000,
  });

  const sleepSettingsQ = useQuery<SleepSettings>({
    queryKey: ['sleep:settings'],
    queryFn: loadSleepSettings,
    retry: false,
    throwOnError: false,
    staleTime: 60_000,
  });

  const calendarQ = useQuery<CalendarEvent[]>({
    queryKey: ['calendar', 'today'],
    queryFn: getTodayEvents,
    refetchInterval: 5 * 60 * 1000,
    retry: false,
    throwOnError: false,
  });

  const takeDoseMutation = useMutation({
    mutationFn: (input: { medId: string; scheduledISO: string }) =>
      logMedDose({
        med_id: input.medId,
        status: 'taken',
        taken_at: new Date().toISOString(),
        scheduled_for: input.scheduledISO,
      }),
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ['meds:list'] });
      qc.invalidateQueries({ queryKey: ['meds:logs:7d'] });
    },
  });

  const handleTakeDose = useCallback(
    (medId: string, scheduledISO: string) => {
      takeDoseMutation.mutate({ medId, scheduledISO });
    },
    [takeDoseMutation],
  );

  // Build "upcoming doses today" (same approach as Dashboard)
  const upcomingDosesToday = useMemo(() => {
    if (!Array.isArray(medsQ.data)) return [];

    const logs = (medLogsQ.data ?? []) as Array<{
      med_id: string;
      scheduled_for?: string | null;
      status: 'taken' | 'skipped' | 'missed';
      taken_at?: string | null;
      created_at?: string | null;
    }>;

    const items: Array<{ med: Med; scheduled: Date; key: string }> = [];

    medsQ.data.forEach((med) => {
      if (!med.id || !med.schedule) return;

      upcomingDoseTimes(med.schedule, 24).forEach((scheduled) => {
        const scheduledDate = new Date(scheduled);

        // Only today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (scheduledDate < today || scheduledDate >= tomorrow) return;

        const alreadyLogged = logs.some((l) => {
          if (l.med_id !== med.id || l.status !== 'taken') return false;

          if (l.scheduled_for) {
            const diff = Math.abs(new Date(l.scheduled_for).getTime() - scheduled.getTime());
            return diff < 60_000;
          }

          const loggedAt = new Date((l.taken_at ?? l.created_at ?? new Date().toISOString()) as string);
          return isSameDay(loggedAt, scheduled);
        });

        if (alreadyLogged) return;

        items.push({
          key: `${med.id}-${scheduled.toISOString()}`,
          med,
          scheduled,
        });
      });
    });

    return items.sort((a, b) => a.scheduled.getTime() - b.scheduled.getTime());
  }, [medsQ.data, medLogsQ.data]);

  // Calendar events: keep only active (not past), sort
  const activeCalendarEvents = useMemo(() => {
    const events = Array.isArray(calendarQ.data) ? calendarQ.data : [];
    return events
      .filter((e) => {
        const start = new Date(e.startDate);
        const end = e.endDate ? new Date(e.endDate) : undefined;
        return getEventStatusFromTimes(start, end) !== 'past';
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [calendarQ.data, now]);

  // Sleep plan items (same idea as Dashboard)
  const sleepPlanItems = useMemo(() => {
    const items: Array<{ key: string; time: Date; title: string; subtitle: string; icon: any }> = [];
    const settings = sleepSettingsQ.data;
    const baseNow = new Date();

    const targetMins = settings?.targetSleepMinutes ?? 480;
    const wakeHHMM = settings?.typicalWakeHHMM ?? settings?.desiredWakeHHMM ?? '07:00';
    const wakeMins = parseHHMMToMinutes(wakeHHMM);

    if (wakeMins === null) {
      items.push({
        key: 'sleep-plan-missing',
        time: new Date(baseNow.getTime() + 60 * 60 * 1000),
        title: 'Set your wake time',
        subtitle: 'Add a typical wake time in Sleep to generate a bedtime plan.',
        icon: 'clock-outline',
      });
      return items;
    }

    const bedtimeMins = wakeMins - targetMins;
    const windDownBuffer = 60;
    const windDownMins = bedtimeMins - windDownBuffer;

    const windDownDate = dateWithTimeLikeToday(windDownMins, baseNow);
    const bedtimeDate = dateWithTimeLikeToday(bedtimeMins, baseNow);

    // if already passed, roll forward to next day (with a small grace)
    if (windDownDate.getTime() < baseNow.getTime() - 5 * 60 * 1000) windDownDate.setDate(windDownDate.getDate() + 1);
    if (bedtimeDate.getTime() < baseNow.getTime() - 5 * 60 * 1000) bedtimeDate.setDate(bedtimeDate.getDate() + 1);

    items.push({
      key: `sleep-winddown-${windDownDate.toISOString()}`,
      time: windDownDate,
      title: 'Start winding down',
      subtitle: `${formatTime(windDownDate)} • Target ${Math.round(targetMins / 60)}h sleep`,
      icon: 'weather-night',
    });

    items.push({
      key: `sleep-bedtime-${bedtimeDate.toISOString()}`,
      time: bedtimeDate,
      title: 'Target bedtime',
      subtitle: `${formatTime(bedtimeDate)} • Wake ${wakeHHMM}`,
      icon: 'sleep',
    });

    return items;
  }, [sleepSettingsQ.data, now]);

  // Build ONE unified list (continuous)
  const unified: UnifiedItem[] = useMemo(() => {
    const items: UnifiedItem[] = [];
    const baseNow = new Date();

    // Calendar
    for (const ev of activeCalendarEvents) {
      const start = new Date(ev.startDate);
      const end = ev.endDate ? new Date(ev.endDate) : undefined;

      const status = getEventStatusFromTimes(start, end);
      const accent: UnifiedItem['accent'] =
        status === 'warning' ? 'warning' : status === 'current' ? 'current' : 'upcoming';

      const timeLabel = ev.allDay ? 'All day' : formatTime(start);
      const subtitleParts = [timeLabel];
      if (ev.location) subtitleParts.push(`📍 ${ev.location}`);

      items.push({
        key: `cal-${ev.id}`,
        time: start,
        kind: 'calendar',
        icon: getCalendarIconFromTitle(ev.title),
        title: ev.title,
        subtitle: subtitleParts.join(' • '),
        accent,
      });
    }

    // Meds (today)
    for (const d of upcomingDosesToday) {
      const status = getEventStatusFromTimes(d.scheduled, undefined);
      const accent: UnifiedItem['accent'] =
        status === 'warning' ? 'warning' : status === 'current' ? 'current' : 'upcoming';

      items.push({
        key: `med-${d.key}`,
        time: d.scheduled,
        kind: 'med',
        icon: 'pill',
        title: d.med.name,
        subtitle: `${formatTime(d.scheduled)}${d.med.dose ? ` • ${d.med.dose}` : ''}`,
        medId: d.med.id!,
        scheduledISO: d.scheduled.toISOString(),
        accent,
      });
    }

    // Sleep plan
    for (const s of sleepPlanItems) {
      const status = getEventStatusFromTimes(s.time, undefined);
      const accent: UnifiedItem['accent'] =
        status === 'warning' ? 'warning' : status === 'current' ? 'current' : 'upcoming';

      items.push({
        key: s.key,
        time: s.time,
        kind: s.key === 'sleep-plan-missing' ? 'info' : 'sleep',
        icon: s.icon,
        title: s.title,
        subtitle: s.subtitle,
        accent,
      });
    }

    // Remove obvious past items (keep very recent past within 60s)
    const filtered = items.filter((it) => it.time && Number.isFinite(it.time.getTime()) && it.time.getTime() > baseNow.getTime() - 60_000);

    return filtered.sort((a, b) => a.time.getTime() - b.time.getTime());
  }, [activeCalendarEvents, upcomingDosesToday, sleepPlanItems, now]);

  const loading = medsQ.isLoading || medLogsQ.isLoading || sleepSettingsQ.isLoading || calendarQ.isLoading;

  const headerCount = unified.length;

  const renderRow = (item: UnifiedItem) => {
    const isPastish = item.time.getTime() < Date.now() - 60_000;
    const timeLabel = formatTime(item.time);

    // unified single-line style like your Dashboard
    const leftTitle =
      item.kind === 'med' ? timeLabel : `${timeLabel} • ${item.title}`;

    const line2 =
      item.kind === 'med' ? item.title : (item.subtitle ?? '');

    const accentStyle = (() => {
      if (item.accent === 'warning') {
        return {
          bg: theme.colors.errorContainer,
          left: theme.colors.error,
          icon: theme.colors.error,
          text: theme.colors.onErrorContainer,
          sub: theme.colors.onErrorContainer,
        };
      }
      if (item.accent === 'current') {
        return {
          bg: theme.colors.primaryContainer,
          left: theme.colors.primary,
          icon: theme.colors.primary,
          text: theme.colors.onPrimaryContainer,
          sub: theme.colors.onPrimaryContainer,
        };
      }
      return {
        bg: theme.colors.surfaceVariant,
        left: theme.colors.secondary,
        icon: theme.colors.onSurface,
        text: theme.colors.onSurface,
        sub: theme.colors.onSurfaceVariant,
      };
    })();

    return (
      <View
        key={item.key}
        style={[
          styles.row,
          {
            backgroundColor: accentStyle.bg,
            borderLeftColor: accentStyle.left,
            opacity: isPastish ? 0.6 : 1,
          },
        ]}
      >
        <View
          style={[
            styles.rowIconWrap,
            {
              backgroundColor: theme.colors.background,
            },
          ]}
        >
          <MaterialCommunityIcons name={item.icon as any} size={20} color={accentStyle.icon} />
        </View>

        <View style={{ flex: 1 }}>
          <Text variant="titleSmall" style={{ color: accentStyle.text, fontWeight: '700' }}>
            {leftTitle}
          </Text>

          <Text variant="bodySmall" style={{ marginTop: 2, color: accentStyle.sub }}>
            {line2}
          </Text>

          {item.kind === 'med' && item.subtitle ? (
            <Text variant="bodySmall" style={{ marginTop: 2, color: accentStyle.sub, opacity: 0.85 }}>
              {item.subtitle}
            </Text>
          ) : null}

          {/* Extra “starts in…” hint for warnings (nice in modal) */}
          {item.accent === 'warning' ? (
            <Text variant="bodySmall" style={{ marginTop: 4, color: accentStyle.sub, opacity: 0.9 }}>
              Starts {formatDistanceToNow(item.time, { addSuffix: true })}
            </Text>
          ) : null}
        </View>

        {item.kind === 'med' ? (
          <Button
            mode="contained"
            compact
            onPress={() => handleTakeDose(item.medId, item.scheduledISO)}
            loading={
              takeDoseMutation.isPending &&
              takeDoseMutation.variables?.medId === item.medId &&
              takeDoseMutation.variables?.scheduledISO === item.scheduledISO
            }
            disabled={
              takeDoseMutation.isPending &&
              takeDoseMutation.variables?.medId === item.medId &&
              takeDoseMutation.variables?.scheduledISO === item.scheduledISO
            }
          >
            Taken
          </Button>
        ) : null}
      </View>
    );
  };

  return (
    <Card mode="elevated" style={[styles.card, { backgroundColor: theme.colors.surface }]} testID={testID}>
      <Card.Content>
        <View style={styles.header} accessibilityRole="header">
          <MaterialCommunityIcons
            name="calendar-today"
            size={24}
            color={theme.colors.primary}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Text variant="titleMedium" style={{ marginLeft: 8 }} accessibilityRole="text">
            Schedule
          </Text>

          <Chip
            mode="flat"
            compact
            style={{ marginLeft: 'auto', backgroundColor: theme.colors.primaryContainer }}
            textStyle={{ fontSize: 12 }}
            accessibilityLabel={`${headerCount} items in schedule`}
          >
            {headerCount}
          </Chip>
        </View>

        {loading ? <ActivityIndicator animating style={{ marginTop: 12 }} /> : null}

        {!loading && unified.length === 0 ? (
          <View style={styles.emptyState}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
              Nothing coming up
            </Text>
            <Text variant="bodySmall" style={{ marginTop: 4, opacity: 0.7, color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
              Add meds, set a wake time, or add calendar events.
            </Text>
          </View>
        ) : null}

        {!loading && unified.length > 0 ? (
          <ScrollView
            style={{ maxHeight: 520 }}
            contentContainerStyle={{ paddingBottom: 6 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.list}>{unified.map(renderRow)}</View>
          </ScrollView>
        ) : null}
      </Card.Content>
    </Card>
  );
}

function makeStyles(theme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    card: {
      borderRadius: theme.borderRadius.xxl,
      marginBottom: 0,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    emptyState: {
      paddingVertical: theme.spacing.xxl,
      alignItems: 'center',
    },
    list: {
      gap: theme.spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 14,
      borderLeftWidth: 4,
    },
    rowIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
  });
}
