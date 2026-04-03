import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Text, useTheme } from 'react-native-paper';
import { InformationalCard } from '@/components/ui';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import type { ScheduleItem } from '@/lib/dashboard/types';
import type { RoutineTemplate } from '@/lib/routines';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { formatRange, formatTime, ROUTINE_NO_SLOT_REASON } from '@/lib/dashboard/utils';

export type RoutineSuggestion = {
  template: RoutineTemplate;
  start: Date;
  end: Date;
  reason: string;
  state: string;
};

export type TodayPlanTomorrowPreview = {
  label: string;
  onPress: () => void;
};

export type DashboardTodayProps = {
  scheduleItems: ScheduleItem[];
  isLoading: boolean;
  onTakeDose: (medId: string, scheduledISO: string) => void;
  takeDosePending: boolean;
  takeDoseMedId?: string;
  takeDoseScheduledISO?: string;
  onOpenSchedule: () => void;
  onSyncHealth: () => void;
  isSyncing: boolean;
  tomorrowPreview?: TodayPlanTomorrowPreview | null;
  routineSuggestions: RoutineSuggestion[];
  reviewExpanded: boolean;
  onAcceptRoutine: (tpl: RoutineTemplate, start: Date, end: Date) => void;
  onAdjustRoutine: (tpl: RoutineTemplate, start: Date, end: Date) => void;
  onSkipRoutine: (tpl: RoutineTemplate) => void;
  isAcceptAllSafe: boolean;
  onAcceptAll: () => void;
};

const GRACE_MS = 60 * 1000;
/** Home curation: show a short upcoming window; full list still reachable. */
const INITIAL_UPCOMING_VISIBLE = 3;
const SPINE_LEFT = 68;
const SPINE_WIDTH = 2.5;
const SPINE_CENTER_X = SPINE_LEFT + SPINE_WIDTH / 2;

/**
 * DEBUG VISIBILITY — Today card motion (normal mode only).
 * Set to `false` (or remove) after QA; do not ship with `true`.
 */
const DEBUG_TODAY_MOTION_HIGH_VISIBILITY = false;

function useSpineNowPulse(reduceMotion: boolean, active: boolean) {
  const op = useRef(new Animated.Value(0.55)).current;
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!active) {
      op.setValue(0);
      scale.setValue(1);
      return undefined;
    }
    if (reduceMotion) {
      op.setValue(0.62);
      scale.setValue(1);
      return undefined;
    }
    op.setValue(0.52);
    const loopOp = Animated.loop(
      Animated.sequence([
        Animated.timing(op, {
          toValue: 0.95,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(op, {
          toValue: 0.48,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const loopSc = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.14,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loopOp.start();
    loopSc.start();
    return () => {
      loopOp.stop();
      loopSc.stop();
    };
  }, [active, reduceMotion, op, scale]);
  return { pulseOpacity: op, pulseScale: scale };
}

function useSpineActiveFlow(reduceMotion: boolean, active: boolean) {
  const flow = useRef(new Animated.Value(0.32)).current;
  useEffect(() => {
    if (!active) {
      flow.setValue(0);
      return undefined;
    }
    if (reduceMotion) {
      flow.setValue(0.38);
      return undefined;
    }
    flow.setValue(0.28);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(flow, {
          toValue: 0.58,
          duration: 2600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(flow, {
          toValue: 0.22,
          duration: 2600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, reduceMotion, flow]);
  return flow;
}

type AgendaClass = 'fixed' | 'placed';

function getAgendaClass(item: ScheduleItem): AgendaClass {
  if (item.kind === 'med' || item.kind === 'sleep') return 'fixed';
  return 'placed';
}

function compactRationale(reason?: string): string {
  if (!reason) return 'Smart fit in your day.';
  const clean = reason.replace(/\s+/g, ' ').trim();
  if (!clean) return 'Smart fit in your day.';
  const sentence = clean.split(/[.!?]/)[0]?.trim() ?? clean;
  if (sentence.length <= 64) return sentence;
  return `${sentence.slice(0, 61).trim()}...`;
}

function useSpineBreath(reduceMotion: boolean) {
  const hi = DEBUG_TODAY_MOTION_HIGH_VISIBILITY;
  const opacity = useRef(new Animated.Value(hi ? 0.36 : 0.34)).current;
  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(0.4);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: hi ? 0.68 : 0.56,
          duration: hi ? 2200 : 3600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: hi ? 0.2 : 0.28,
          duration: hi ? 2200 : 3600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, opacity, hi]);
  return opacity;
}

/** Soft “lift” within the row — not a box overlay (normal mode: slow breath). */
function useFocalAmbientWash(isFocal: boolean, rowQuiet: boolean, reduceMotion: boolean) {
  const hi = DEBUG_TODAY_MOTION_HIGH_VISIBILITY;
  const phase = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isFocal || rowQuiet) {
      phase.setValue(0);
      return undefined;
    }
    if (reduceMotion) {
      phase.setValue(0.5);
      return undefined;
    }
    phase.setValue(0);
    const dur = hi ? 1800 : 3800;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(phase, {
          toValue: 1,
          duration: dur,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(phase, {
          toValue: 0,
          duration: dur,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isFocal, rowQuiet, reduceMotion, phase, hi]);
  return useMemo(
    () =>
      phase.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: hi ? [0.055, 0.095, 0.065] : [0.016, 0.03, 0.022],
      }),
    [phase, hi],
  );
}

function useFocalHalo(isFocal: boolean, reduceMotion: boolean) {
  const hi = DEBUG_TODAY_MOTION_HIGH_VISIBILITY;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isFocal) {
      opacity.setValue(0);
      return undefined;
    }
    if (reduceMotion) {
      opacity.setValue(0.4);
      return undefined;
    }
    opacity.setValue(hi ? 0.38 : 0.34);
    const dur = hi ? 1800 : 2600;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: hi ? 0.06 : 0.1,
          duration: dur,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: hi ? 0.52 : 0.48,
          duration: dur,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isFocal, reduceMotion, opacity, hi]);
  return opacity;
}

function useFocalMarkerScale(isFocal: boolean, rowQuiet: boolean, reduceMotion: boolean) {
  const hi = DEBUG_TODAY_MOTION_HIGH_VISIBILITY;
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!isFocal || rowQuiet) {
      scale.setValue(1);
      return undefined;
    }
    if (reduceMotion) {
      scale.setValue(1);
      return undefined;
    }
    const peak = hi ? 1.12 : 1.085;
    const dur = hi ? 2000 : 2600;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: peak,
          duration: dur,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: dur,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isFocal, rowQuiet, reduceMotion, scale, hi]);
  return scale;
}

function AgendaRow({
  item,
  onTakeDose,
  takeDosePending,
  takeDoseMedId,
  takeDoseScheduledISO,
  isFirst,
  isLast,
  isFocal,
  isLaterUpcoming,
  demotedPast,
  reduceMotion,
}: {
  item: ScheduleItem;
  onTakeDose: (medId: string, scheduledISO: string) => void;
  takeDosePending: boolean;
  takeDoseMedId?: string;
  takeDoseScheduledISO?: string;
  isFirst: boolean;
  isLast: boolean;
  isFocal: boolean;
  isLaterUpcoming?: boolean;
  /** Earlier today: collapsed by default; when expanded, extra-soft presence */
  demotedPast?: boolean;
  reduceMotion: boolean;
}) {
  const theme = useTheme();
  const isPast = item.time.getTime() < Date.now() - GRACE_MS;
  const rowQuiet = demotedPast || isPast;
  const isCurrentWindow = isFocal && !rowQuiet;
  const timeLabel = formatTime(item.time);
  const agendaClass = getAgendaClass(item);
  const isFixed = agendaClass === 'fixed';
  const stripePlaced = theme.dark ? '#A5B4FC' : theme.colors.primary;
  const stripe = (() => {
    switch (item.kind) {
      case 'med':
        return theme.dark ? 'rgba(165, 243, 252, 0.75)' : theme.colors.primary;
      case 'sleep':
        return theme.dark ? 'rgba(199, 210, 254, 0.75)' : theme.colors.secondary;
      default:
        return stripePlaced;
    }
  })();

  const haloOpacity = useFocalHalo(isFocal && !rowQuiet, reduceMotion);
  const washOpacity = useFocalAmbientWash(isFocal, rowQuiet, reduceMotion);
  const markerScale = useFocalMarkerScale(isFocal, rowQuiet, reduceMotion);
  const washFill = theme.dark ? 'rgba(129, 140, 248, 1)' : 'rgba(79, 70, 229, 1)';
  const fixedRing = theme.dark ? 'rgba(148, 163, 184, 0.45)' : 'rgba(100, 116, 139, 0.55)';
  const fixedDot = theme.dark ? 'rgba(203, 213, 225, 0.85)' : 'rgba(71, 85, 105, 0.9)';
  const connector = theme.dark ? 'rgba(148, 163, 184, 0.2)' : 'rgba(100, 116, 139, 0.18)';

  const a11yLabel =
    item.kind === 'med'
      ? `${timeLabel}, ${item.title}. Mark as taken.`
      : `${timeLabel}, ${item.title}`;

  const rowOverlayOpacity = isCurrentWindow ? washOpacity : 0;
  return (
    <Pressable
      onPress={item.onPress}
      disabled={!item.onPress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      style={[
        styles.agendaRow,
        {
          opacity: demotedPast ? 0.34 : isPast ? 0.38 : 1,
        },
        isCurrentWindow ? { overflow: 'hidden', borderRadius: 10 } : null,
        !isLast
          ? {
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: theme.dark ? 'rgba(255,255,255,0.028)' : 'rgba(15,23,42,0.04)',
            }
          : null,
      ]}
    >
      {isCurrentWindow
        ? reduceMotion
          ? <View pointerEvents="none" style={[styles.focalWash, { backgroundColor: washFill, opacity: 0.028 }]} />
          : <Animated.View pointerEvents="none" style={[styles.focalWash,
              { backgroundColor: washFill, opacity: rowOverlayOpacity }]} />
        : null}
      {isCurrentWindow ? (
        <View
          pointerEvents="none"
          style={[
            styles.focalRail,
            {
              backgroundColor: theme.dark ? 'rgba(191, 219, 254, 0.38)' : 'rgba(99, 102, 241, 0.36)',
            },
          ]}
        />
      ) : null}
      <View style={styles.timeCol}>
        <Text
          variant="labelSmall"
          style={{
            color: isCurrentWindow
              ? theme.dark
                ? 'rgba(224, 231, 255, 0.92)'
                : theme.colors.primary
              : isLaterUpcoming
              ? theme.colors.onSurface
              : theme.colors.onSurfaceVariant,
            fontWeight: isCurrentWindow ? '700' : rowQuiet ? '400' : isLaterUpcoming ? '600' : '500',
            letterSpacing: 0.15,
            fontSize: demotedPast ? 11 : 12,
            opacity: rowQuiet ? 0.62 : isLaterUpcoming ? 0.86 : 0.78,
          }}
        >
          {timeLabel}
        </Text>
      </View>
      <View style={styles.agendaMarkerCol}>
        {!isFirst ? <View style={[styles.markerConnector, { backgroundColor: connector, top: -12 }]} /> : null}
        {!isLast ? <View style={[styles.markerConnector, { backgroundColor: connector, bottom: -12 }]} /> : null}
        {isCurrentWindow ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.focalHalo,
              {
                opacity: haloOpacity,
                backgroundColor: theme.dark ? 'rgba(129, 140, 248, 0.24)' : 'rgba(79, 70, 229, 0.14)',
              },
            ]}
          />
        ) : null}
        <Animated.View
          style={[
            { transform: [{ scale: isCurrentWindow ? markerScale : 1 }] },
            styles.agendaRing,
            {
              borderColor: rowQuiet
                ? theme.dark
                  ? 'rgba(148,163,184,0.3)'
                  : 'rgba(100,116,139,0.28)'
                : isCurrentWindow
                ? stripe
                : isFixed
                ? fixedRing
                : theme.dark
                ? 'rgba(165,180,252,0.62)'
                : stripe,
              borderWidth: isCurrentWindow ? 2.2 : isFixed ? 1.4 : 1.8,
            },
          ]}
        >
          <View
            style={[
              styles.agendaDot,
              {
                backgroundColor: rowQuiet
                  ? theme.dark
                    ? 'rgba(148,163,184,0.62)'
                    : 'rgba(100,116,139,0.58)'
                  : isFixed
                  ? fixedDot
                  : stripe,
                width: isCurrentWindow ? 7 : isFixed ? 4 : 5,
                height: isCurrentWindow ? 7 : isFixed ? 4 : 5,
                borderRadius: isCurrentWindow ? 3.5 : isFixed ? 2 : 2.5,
              },
            ]}
          />
        </Animated.View>
      </View>
      <View style={{ flex: 1, minWidth: 0, paddingRight: 8, paddingVertical: demotedPast ? 1 : 2 }}>
        <Text
          variant="labelLarge"
          style={{
            color: theme.colors.onSurface,
            fontWeight: isCurrentWindow ? '700' : rowQuiet ? '500' : isLaterUpcoming ? '600' : '600',
            fontSize: demotedPast ? 12 : isCurrentWindow ? 13.5 : 13,
            letterSpacing: isCurrentWindow ? -0.2 : -0.08,
            opacity: rowQuiet ? 0.62 : isLaterUpcoming ? 0.95 : 0.88,
          }}
          numberOfLines={demotedPast ? 1 : 2}
        >
          {item.title}
        </Text>
        {item.subtitle && !demotedPast ? (
          <Text variant="bodySmall" style={{ marginTop: 2, color: theme.colors.onSurfaceVariant, opacity: 0.82 }} numberOfLines={2}>
            {item.subtitle}
          </Text>
        ) : null}
      </View>
      {item.kind === 'med' ? (
        <Button
          mode="outlined"
          compact
          onPress={() => onTakeDose(item.medId, item.scheduledISO)}
          loading={takeDosePending && takeDoseMedId === item.medId && takeDoseScheduledISO === item.scheduledISO}
          disabled={takeDosePending && takeDoseMedId === item.medId && takeDoseScheduledISO === item.scheduledISO}
          style={{
            borderRadius: 8,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.dark ? 'rgba(165, 180, 252, 0.34)' : 'rgba(79, 70, 229, 0.3)',
            backgroundColor: theme.dark ? 'rgba(165, 180, 252, 0.07)' : 'rgba(79, 70, 229, 0.055)',
          }}
          contentStyle={{ paddingHorizontal: 12, paddingVertical: 2, minHeight: 32 }}
          labelStyle={{ fontSize: 12, fontWeight: '600', letterSpacing: 0.12, opacity: 0.92 }}
        >
          Taken
        </Button>
      ) : null}
    </Pressable>
  );
}

function IntentActionRow({
  sugg,
  hasSlot,
  onAccept,
  onAdjust,
  onSkip,
}: {
  sugg: RoutineSuggestion;
  hasSlot: boolean;
  onAccept: DashboardTodayProps['onAcceptRoutine'];
  onAdjust: DashboardTodayProps['onAdjustRoutine'];
  onSkip: DashboardTodayProps['onSkipRoutine'];
}) {
  const theme = useTheme();
  const acceptBorder = theme.dark ? 'rgba(165, 180, 252, 0.34)' : 'rgba(79, 70, 229, 0.3)';
  const acceptFill = theme.dark ? 'rgba(165, 180, 252, 0.09)' : 'rgba(79, 70, 229, 0.07)';
  return (
    <View style={styles.intentActions}>
      <Button
        mode="outlined"
        compact
        onPress={() => {
          if (hasSlot) onAccept(sugg.template, sugg.start, sugg.end);
          else onAdjust(sugg.template, sugg.start, sugg.end);
        }}
        style={{
          borderRadius: 8,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: acceptBorder,
          backgroundColor: acceptFill,
        }}
        contentStyle={{ paddingHorizontal: 14, paddingVertical: 2, minHeight: 34 }}
        labelStyle={{
          fontSize: 13,
          fontWeight: '600',
          letterSpacing: 0.1,
          opacity: 0.94,
        }}
      >
        Accept
      </Button>
      <Button
        mode="text"
        compact
        onPress={() => onAdjust(sugg.template, sugg.start, sugg.end)}
        style={{ marginLeft: -6 }}
        contentStyle={{ minWidth: 0, paddingHorizontal: 6, paddingVertical: 2 }}
        labelStyle={{ fontSize: 12, fontWeight: '500', opacity: 0.78, letterSpacing: 0.08 }}
      >
        Adjust
      </Button>
      <Button
        mode="text"
        compact
        onPress={() => onSkip(sugg.template)}
        contentStyle={{ minWidth: 0, paddingHorizontal: 6, paddingVertical: 2 }}
        labelStyle={{ fontSize: 12, fontWeight: '400', opacity: 0.58, letterSpacing: 0.06 }}
      >
        Not today
      </Button>
    </View>
  );
}

export function DashboardToday({
  scheduleItems,
  isLoading,
  onTakeDose,
  takeDosePending,
  takeDoseMedId,
  takeDoseScheduledISO,
  onOpenSchedule,
  onSyncHealth,
  isSyncing,
  tomorrowPreview,
  routineSuggestions,
  reviewExpanded,
  onAcceptRoutine,
  onAdjustRoutine,
  onSkipRoutine,
  isAcceptAllSafe: _isAcceptAllSafe,
  onAcceptAll: _onAcceptAll,
}: DashboardTodayProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [showAllAgenda, setShowAllAgenda] = useState(false);
  const [moreIntentions, setMoreIntentions] = useState(false);
  const [earlierExpanded, setEarlierExpanded] = useState(false);

  const { pastRows, upcomingRows } = useMemo(() => {
    const t = Date.now() - GRACE_MS;
    const past: ScheduleItem[] = [];
    const upcoming: ScheduleItem[] = [];
    for (const it of scheduleItems) {
      if (it.time.getTime() < t) past.push(it);
      else upcoming.push(it);
    }
    return { pastRows: past, upcomingRows: upcoming };
  }, [scheduleItems]);

  const upcomingVisible = showAllAgenda ? upcomingRows : upcomingRows.slice(0, INITIAL_UPCOMING_VISIBLE);
  const hiddenUpcomingCount = Math.max(0, upcomingRows.length - upcomingVisible.length);
  const hasAgenda = scheduleItems.length > 0;
  const hasIntentions = routineSuggestions.length > 0;

  const focusRowIndex = useMemo(() => {
    const t = Date.now();
    const idx = upcomingVisible.findIndex((it) => it.time.getTime() >= t - GRACE_MS);
    return idx;
  }, [upcomingVisible]);

  const showAllSugg = reviewExpanded || moreIntentions;
  const tomorrowSuggestions = routineSuggestions.filter((s) => /tomorrow/i.test(s.template.title ?? ''));
  const primarySuggestions = routineSuggestions.filter((s) => !/tomorrow/i.test(s.template.title ?? ''));
  const feat = primarySuggestions[0] ?? routineSuggestions[0];
  const restSugg = primarySuggestions.slice(feat ? 1 : 0);
  const hiddenIntentionCount = Math.max(0, restSugg.length);
  const hasFeatSlot =
    !!feat && !!feat.start && !!feat.end && feat.reason !== ROUTINE_NO_SLOT_REASON;

  const spineOpacity = useSpineBreath(reduceMotion);

  const footerBorder = theme.dark ? 'rgba(255,255,255,0.055)' : 'rgba(15,23,42,0.065)';
  const extraHairline = theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.06)';

  const utilityOutline = theme.dark ? 'rgba(148, 163, 184, 0.22)' : 'rgba(15, 23, 42, 0.09)';
  const utilityFill = theme.dark ? 'rgba(255, 255, 255, 0.028)' : 'rgba(255, 255, 255, 0.68)';

  /** Time-of-day: imperceptible geometry — only a whisper on the matte card shell. */
  const cardSurfaceStyle = useMemo(() => {
    const h = new Date().getHours();
    if (theme.dark) {
      const base = {
        shadowColor: '#020617',
        shadowOpacity: 0.55,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 12 },
        elevation: 6 as const,
      };
      if (h >= 21 || h < 5) {
        return {
          ...base,
          backgroundColor: '#0D1220',
          borderColor: 'rgba(129, 140, 248, 0.17)',
        };
      }
      if (h >= 17) {
        return {
          ...base,
          backgroundColor: '#0E1322',
          borderColor: 'rgba(122, 136, 212, 0.185)',
        };
      }
      if (h >= 12) {
        return {
          ...base,
          backgroundColor: '#0E1323',
          borderColor: 'rgba(122, 136, 212, 0.175)',
        };
      }
      return {
        ...base,
        backgroundColor: '#0E1322',
        borderColor: 'rgba(122, 136, 212, 0.18)',
      };
    }
    if (h >= 21 || h < 5) {
      return { borderColor: 'rgba(79, 70, 229, 0.09)' };
    }
    return { borderColor: 'rgba(15, 23, 42, 0.08)' };
  }, [theme.dark]);

  const focalSpineIdx = useMemo(() => {
    if (!hasAgenda || focusRowIndex < 0) return -1;
    return (earlierExpanded ? pastRows.length : 0) + focusRowIndex;
  }, [hasAgenda, focusRowIndex, earlierExpanded, pastRows.length]);

  const [spineNowCenterY, setSpineNowCenterY] = useState<number | null>(null);
  const [scheduleBlockH, setScheduleBlockH] = useState(0);

  useEffect(() => {
    setSpineNowCenterY(null);
  }, [focalSpineIdx, earlierExpanded, showAllAgenda, scheduleItems.length, upcomingVisible.length]);

  useEffect(() => {
    if (!hasAgenda) setScheduleBlockH(0);
  }, [hasAgenda]);

  const spineLive = spineNowCenterY != null && focusRowIndex >= 0;
  const { pulseOpacity, pulseScale } = useSpineNowPulse(reduceMotion, spineLive);
  const spineFlowOpacity = useSpineActiveFlow(reduceMotion, spineLive);

  return (
    <InformationalCard feedbackScope={{ componentKey: 'dashboard-today', componentTitle: 'Today', tags: ['dashboard'] }} style={cardSurfaceStyle}>
      <View style={{ position: 'relative' }}>
        <FeatureCardHeader
          icon="calendar-today"
          title="Today"
          subtitle="Your day, gently orchestrated."
        />

        <View style={{ marginTop: 2 }}>
          {isLoading ? <ActivityIndicator style={{ paddingVertical: 8 }} /> : null}

          {!isLoading ? (
            <>
              {hasAgenda ? (
                <View
                  style={styles.scheduleCanvas}
                  onLayout={(e) => setScheduleBlockH(e.nativeEvent.layout.height)}
                >
                  {pastRows.length > 0 && !earlierExpanded ? (
                    <Pressable
                      onPress={() => setEarlierExpanded(true)}
                      accessibilityRole="button"
                      accessibilityLabel={`Show ${pastRows.length} earlier items`}
                      style={styles.earlierTeaser}
                    >
                      <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, opacity: 0.72 }}>
                        +{pastRows.length} earlier
                      </Text>
                    </Pressable>
                  ) : null}
                  {pastRows.length > 0 && earlierExpanded ? (
                    <Pressable
                      onPress={() => setEarlierExpanded(false)}
                      accessibilityRole="button"
                      accessibilityLabel="Hide earlier items"
                      style={styles.earlierTeaser}
                    >
                      <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, opacity: 0.72 }}>
                        Hide earlier
                      </Text>
                    </Pressable>
                  ) : null}
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.spineLine,
                      {
                        left: SPINE_LEFT,
                        width: SPINE_WIDTH,
                        opacity: spineOpacity,
                        backgroundColor: theme.dark ? 'rgba(186, 200, 255, 0.5)' : 'rgba(99, 102, 241, 0.38)',
                      },
                    ]}
                  />
                  {spineLive ? (
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.spineActiveFlow,
                        {
                          left: SPINE_CENTER_X - 2,
                          top: spineNowCenterY! - 30,
                          opacity: spineFlowOpacity,
                          backgroundColor: theme.dark ? 'rgba(165, 180, 252, 0.55)' : 'rgba(99, 102, 241, 0.42)',
                        },
                      ]}
                    />
                  ) : null}
                  {spineLive ? (
                    <>
                      <Animated.View
                        pointerEvents="none"
                        style={[
                          styles.spineNowRing,
                          {
                            left: SPINE_CENTER_X - 13,
                            top: spineNowCenterY! - 13,
                            borderColor: theme.dark ? 'rgba(191, 219, 254, 0.75)' : 'rgba(79, 70, 229, 0.55)',
                            opacity: pulseOpacity,
                            transform: [{ scale: pulseScale }],
                          },
                        ]}
                      />
                      <View
                        pointerEvents="none"
                        style={[
                          styles.spineNowCore,
                          {
                            left: SPINE_CENTER_X - 4,
                            top: spineNowCenterY! - 4,
                            backgroundColor: theme.dark ? 'rgba(224, 231, 255, 0.95)' : 'rgba(79, 70, 229, 0.88)',
                          },
                        ]}
                      />
                    </>
                  ) : null}
                  {(() => {
                    const spineRows: ScheduleItem[] = [...(earlierExpanded ? pastRows : []), ...upcomingVisible];
                    return spineRows.map((it, idx) => {
                      const isPastSlot = earlierExpanded && idx < pastRows.length;
                      const upcomingIdx = earlierExpanded ? idx - pastRows.length : idx;
                      const isCurrent = !isPastSlot && focusRowIndex >= 0 && upcomingIdx === focusRowIndex;
                      return (
                        <View
                          key={it.key}
                          collapsable={false}
                          onLayout={(e) => {
                            if (idx !== focalSpineIdx || focalSpineIdx < 0) return;
                            const { y, height } = e.nativeEvent.layout;
                            setSpineNowCenterY(y + height / 2);
                          }}
                        >
                          <AgendaRow
                            item={it}
                            onTakeDose={onTakeDose}
                            takeDosePending={takeDosePending}
                            takeDoseMedId={takeDoseMedId}
                            takeDoseScheduledISO={takeDoseScheduledISO}
                            isFirst={idx === 0}
                            isLast={idx === spineRows.length - 1}
                            isFocal={isCurrent}
                            isLaterUpcoming={!isPastSlot && !isCurrent}
                            demotedPast={isPastSlot}
                            reduceMotion={reduceMotion}
                          />
                        </View>
                      );
                    });
                  })()}
                </View>
              ) : (
                <View style={{ paddingVertical: 6 }}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                    Your anchored day is clear
                  </Text>
                  <Text variant="bodySmall" style={{ marginTop: 6, color: theme.colors.onSurfaceVariant, lineHeight: 20, opacity: 0.9 }}>
                    Keep room for what still fits tonight.
                  </Text>
                  {tomorrowPreview ? (
                    <Button
                      mode="text"
                      compact
                      onPress={tomorrowPreview.onPress}
                      style={{ marginTop: 6, alignSelf: 'flex-start' }}
                      labelStyle={{ fontWeight: '600' }}
                    >
                      {tomorrowPreview.label}
                    </Button>
                  ) : null}
                </View>
              )}
            </>
          ) : null}

          {!isLoading && hasIntentions ? (
            <View style={[styles.suggestionsBridge, { marginTop: hasAgenda ? 12 : 14 }]}>
              {hasAgenda && scheduleBlockH > 0 ? (
                <>
                  <View
                    pointerEvents="none"
                    style={[
                      styles.suggestionSpineStem,
                      {
                        left: SPINE_CENTER_X - 1,
                        top: -16,
                        backgroundColor: theme.dark ? 'rgba(165, 180, 252, 0.38)' : 'rgba(99, 102, 241, 0.3)',
                      },
                    ]}
                  />
                  <View
                    pointerEvents="none"
                    style={[
                      styles.suggestionSpineArm,
                      {
                        left: SPINE_CENTER_X,
                        top: -3,
                        backgroundColor: theme.dark ? 'rgba(165, 180, 252, 0.34)' : 'rgba(99, 102, 241, 0.28)',
                      },
                    ]}
                  />
                </>
              ) : null}
              <View style={styles.suggestionsBand}>
              {feat ? (
                <View style={{ paddingTop: 2, marginLeft: hasAgenda ? 10 : 0 }}>
                  <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '600', fontSize: 14.5, letterSpacing: -0.15 }}>
                    {feat.template.title}
                  </Text>
                  <Text variant="bodySmall" style={{ marginTop: 3, color: theme.colors.onSurfaceVariant, opacity: 0.84 }}>
                    {hasFeatSlot ? formatRange(feat.start, feat.end) : 'Pick a time to place this.'}
                  </Text>
                  <Text variant="bodySmall" style={{ marginTop: 5, color: theme.colors.onSurfaceVariant, opacity: 0.74 }} numberOfLines={3}>
                    {compactRationale(feat.reason)}
                  </Text>
                  <View style={{ marginTop: 8 }}>
                    <IntentActionRow
                      sugg={feat}
                      hasSlot={hasFeatSlot}
                      onAccept={onAcceptRoutine}
                      onAdjust={onAdjustRoutine}
                      onSkip={onSkipRoutine}
                    />
                  </View>
                </View>
              ) : null}

              {showAllSugg && restSugg.length > 0 ? (
                <View style={[styles.extraSuggestion, { borderTopColor: extraHairline, marginLeft: hasAgenda ? 10 : 0 }]}>
                  {restSugg.map((sugg) => {
                    const hasSlot = !!sugg.start && !!sugg.end && sugg.reason !== ROUTINE_NO_SLOT_REASON;
                    return (
                      <Pressable
                        key={sugg.template.id}
                        onPress={() => onAdjustRoutine(sugg.template, sugg.start, sugg.end)}
                        accessibilityRole="button"
                        accessibilityLabel={`Adjust ${sugg.template.title}`}
                        style={{ paddingVertical: 6 }}
                      >
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, opacity: 0.78, fontWeight: '500' }}>
                          {sugg.template.title}
                        </Text>
                        <Text variant="bodySmall" style={{ marginTop: 1, color: theme.colors.onSurfaceVariant, opacity: 0.62 }}>
                          {hasSlot ? formatRange(sugg.start, sugg.end) : 'Pick a time'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              {!reviewExpanded && hiddenIntentionCount > 0 && !moreIntentions ? (
                <View style={{ marginTop: 6, alignItems: 'flex-start', marginLeft: hasAgenda ? 10 : 0 }}>
                  <Button mode="text" compact onPress={() => setMoreIntentions(true)} labelStyle={{ fontSize: 12, opacity: 0.88 }}>
                    Show {hiddenIntentionCount} more
                  </Button>
                </View>
              ) : null}
              {!reviewExpanded && moreIntentions && hiddenIntentionCount > 0 ? (
                <View style={{ marginTop: 0, alignItems: 'flex-start', marginLeft: hasAgenda ? 10 : 0 }}>
                  <Button mode="text" compact onPress={() => setMoreIntentions(false)} labelStyle={{ fontSize: 12, opacity: 0.88 }}>
                    Show less
                  </Button>
                </View>
              ) : null}
              {tomorrowSuggestions[0] ? (
                <View style={{ marginTop: 2, alignItems: 'flex-start', marginLeft: hasAgenda ? 10 : 0 }}>
                  <Button
                    mode="text"
                    compact
                    onPress={() =>
                      onAdjustRoutine(
                        tomorrowSuggestions[0].template,
                        tomorrowSuggestions[0].start,
                        tomorrowSuggestions[0].end,
                      )
                    }
                    labelStyle={{ fontSize: 11, opacity: 0.58, fontWeight: '500' }}
                  >
                    Plan tomorrow
                  </Button>
                </View>
              ) : null}
              </View>
            </View>
          ) : null}
        </View>

        <View style={[styles.footer, { borderTopColor: footerBorder }]}>
          {(hiddenUpcomingCount > 0 && !showAllAgenda) || (showAllAgenda && upcomingRows.length > INITIAL_UPCOMING_VISIBLE) ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginBottom: 8, gap: 4 }}>
              {hiddenUpcomingCount > 0 && !showAllAgenda ? (
                <Button mode="text" compact onPress={() => setShowAllAgenda(true)} labelStyle={{ fontSize: 12, opacity: 0.88 }}>
                  Show more ({hiddenUpcomingCount})
                </Button>
              ) : null}
              {showAllAgenda && upcomingRows.length > INITIAL_UPCOMING_VISIBLE ? (
                <Button mode="text" compact onPress={() => setShowAllAgenda(false)} labelStyle={{ fontSize: 12, opacity: 0.88 }}>
                  Show less
                </Button>
              ) : null}
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <Button
              mode="outlined"
              onPress={onOpenSchedule}
              compact
              icon="calendar-month-outline"
              style={{
                borderRadius: 8,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: utilityOutline,
                backgroundColor: utilityFill,
              }}
              contentStyle={{ paddingHorizontal: 8, paddingVertical: 0, minHeight: 32 }}
              labelStyle={{ fontSize: 11, letterSpacing: 0.12, opacity: 0.84, fontWeight: '500' }}
            >
              Open schedule
            </Button>
            <Button
              mode="outlined"
              onPress={onSyncHealth}
              compact
              loading={isSyncing}
              disabled={isSyncing}
              style={{
                borderRadius: 8,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: utilityOutline,
                backgroundColor: utilityFill,
              }}
              contentStyle={{ paddingHorizontal: 8, paddingVertical: 0, minHeight: 32 }}
              labelStyle={{ fontSize: 11, letterSpacing: 0.12, opacity: 0.84, fontWeight: '500' }}
            >
              Sync health
            </Button>
          </View>
        </View>
      </View>
    </InformationalCard>
  );
}

const styles = StyleSheet.create({
  scheduleCanvas: {
    position: 'relative',
    paddingVertical: 4,
    marginTop: 2,
  },
  spineLine: {
    position: 'absolute',
    top: 10,
    bottom: 10,
    borderRadius: 2,
  },
  spineActiveFlow: {
    position: 'absolute',
    width: 4,
    height: 60,
    borderRadius: 3,
  },
  spineNowRing: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2.5,
    backgroundColor: 'transparent',
  },
  spineNowCore: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  agendaRow: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 2,
    paddingLeft: 0,
  },
  focalWash: {
    position: 'absolute',
    left: 4,
    right: 4,
    top: 4,
    bottom: 4,
    borderRadius: 8,
  },
  focalRail: {
    position: 'absolute',
    left: 0,
    top: 7,
    bottom: 7,
    width: 1,
  },
  earlierTeaser: {
    paddingVertical: 5,
    marginBottom: 2,
    alignSelf: 'flex-start',
  },
  timeCol: {
    width: 60,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingLeft: 0,
  },
  agendaMarkerCol: {
    width: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    position: 'relative',
  },
  focalHalo: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  markerConnector: {
    position: 'absolute',
    left: 8,
    width: StyleSheet.hairlineWidth,
    height: 12,
  },
  agendaRing: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  agendaDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  suggestionsBridge: {
    position: 'relative',
  },
  suggestionSpineStem: {
    position: 'absolute',
    width: 2,
    height: 18,
    borderRadius: 1,
    opacity: 0.85,
  },
  suggestionSpineArm: {
    position: 'absolute',
    width: 22,
    height: 2,
    borderRadius: 1,
    opacity: 0.85,
  },
  suggestionsBand: {
    paddingTop: 4,
    paddingBottom: 8,
    paddingHorizontal: 0,
  },
  extraSuggestion: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  intentActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  },
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
