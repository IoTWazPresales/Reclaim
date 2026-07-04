// C:\Reclaim\app\src\components\InsightCard.tsx

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Share, StyleSheet, View, Modal, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Chip, Text, useTheme, IconButton } from 'react-native-paper';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { ReclaimButton } from '@/components/ui/ReclaimButton';
import type { InsightMatch } from '@/lib/insights/InsightEngine';
import { getTagForInsight, CHEMISTRY_GLOSSARY, type ChemistryTag } from '@/lib/chemistryGlossary';
import { getUserSettings } from '@/lib/userSettings';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppTheme, RECLAIM_CHROME } from '@/theme';
import {
  reclaimGuidedIconWell,
  reclaimInsightModuleSurface,
  reclaimRecessedWell,
  RECLAIM_CARD_BLOCK_GAP,
  RECLAIM_CARD_MODULE_CONTENT_PADDING,
} from '@/theme/reclaimVisualLanguage';
import { reclaimTextRoles } from '@/theme/reclaimTypography';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import {
  logInsightFeedback,
  updateInsightFeedback,
  type InsightFeedbackReason,
  INSIGHT_FEEDBACK_REASON_LABELS,
  type InsightFeedbackRow,
} from '@/lib/api';
import { logTelemetry } from '@/lib/telemetry';
import { confidenceNextStepForInsight } from '@/lib/display/confidenceGuidance';
import { logger } from '@/lib/logger';
import { insightEmphasisSupport, insightSupportAccent, insightSupportWash } from '@/theme/dashboardInsightEmphasis';

type MaterialCommunityIconsComponent = typeof MaterialCommunityIcons;
type InsightIconName = React.ComponentProps<MaterialCommunityIconsComponent>['name'];

type InsightCardProps = {
  insight: InsightMatch;
  onActionPress?: (insight: InsightMatch) => void;
  onRefreshPress?: () => void;
  /** Renders a close affordance — one dismissible insight card per screen. */
  onDismiss?: () => void;
  isProcessing?: boolean;
  disabled?: boolean;
  testID?: string;
  screenSource?: 'dashboard' | 'mood' | 'sleep' | 'meds' | 'finish'; // For telemetry
  /** Parent supplies vertical section spacing; drop surface marginBottom to avoid double gap. */
  embedInTightVerticalStack?: boolean;
  /** Support emphasis — left accent bar + soft wash (crisis insights). */
  emphasis?: 'support' | 'default';
};

function primaryActionLabel(insight: InsightMatch): string {
  if (insight.id === 'mood-sustained-low') {
    return '988 Lifeline — call or text, 24/7';
  }
  const action = insight.action?.trim();
  if (action && action.length <= 72) return action;
  return 'See suggestion';
}

function normalizeSourceTag(tag?: string | null): string | null {
  if (!tag) return null;
  const t = String(tag).trim();
  if (!t) return null;
  return t
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function getChemistryTagsRobust(insight: InsightMatch): ChemistryTag[] {
  const candidates: Array<string | null> = [
    insight.sourceTag ?? null,
    normalizeSourceTag(insight.sourceTag),
    insight.id ?? null,
    normalizeSourceTag(insight.id),
  ];

  const out: ChemistryTag[] = [];
  for (const c of uniq(candidates).filter(Boolean) as string[]) {
    const tags = getTagForInsight(c);
    if (tags?.length) out.push(...tags);
  }

  return uniq(out);
}

function formatInsightCategory(sourceTag?: string | null): string {
  if (!sourceTag?.trim()) return 'Daily signal';
  return sourceTag
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/** Compact confidence / evidence chips — deliberate, not apologetic. */
function buildConfidenceChips(insight: InsightMatch): string[] {
  const n = insight.matchedConditions?.length ?? 0;
  if (n <= 0) return ['Contextual read', 'Broad basis'];
  return [
    n === 1 ? '1 signal' : `${n} signals`,
    n <= 1 ? 'Provisional read' : n === 2 ? 'Early read' : 'Grounded read',
    n <= 1 ? 'Low confidence' : n === 2 ? 'Moderate confidence' : 'Higher confidence',
  ];
}

const FIELD_LABELS: Partial<Record<string, string>> = {
  'mood.last': 'Mood score',
  'mood.deltaVsBaseline': 'Mood vs baseline',
  'mood.trend3dPct': 'Mood trend',
  'mood.belowBaseline': 'Below your normal mood',
  'sleep.lastNight.hours': 'Last night sleep',
  'sleep.lastNight.quality': 'Sleep quality',
  'sleep.lastNight.efficiency': 'Sleep efficiency',
  'sleep.lastNight.deepMinutes': 'Deep sleep',
  'sleep.lastNight.remMinutes': 'REM sleep',
  'sleep.lastNight.avgHeartRate': 'Overnight heart rate (avg)',
  'sleep.lastNight.minHeartRate': 'Overnight heart rate (low)',
  'sleep.lastNight.maxHeartRate': 'Overnight heart rate (high)',
  'sleep.avg7d.hours': 'Avg sleep (7 days)',
  'sleep.debtHours': 'Sleep debt',
  'sleep.belowBaseline': 'Below your usual sleep',
  'sleep.midpoint.deltaMin': 'Sleep timing shift',
  'sleep.midpoint.signedDeltaMin': 'Sleep phase direction',
  'steps.lastDay': 'Steps yesterday',
  'meds.adherencePct7d': 'Medication adherence',
  'behavior.daysSinceSocial': 'Days since social contact',
  'flags.stress': 'Stress tag',
  'training.daysSinceLastSession': 'Days since training',
  'training.weeklySessionCount': 'Sessions this week',
  'training.completedToday': 'Trained today',
  'training.lastSessionActiveKcal': 'Last session active energy (kcal)',
  'training.weeklyActiveKcalSum': 'Training energy this week (kcal)',
  'training.lastSessionEnergyKnown': 'Last session energy logged',
  'calendar.hasDemandingBlockSoon': 'Demanding calendar block soon',
  'calendar.minutesToNextDemandingStart': 'Minutes to next demanding event',
  'calendar.demandingEventsTodayCount': 'Demanding events today',
  'baseline.moodAvg': 'Your mood baseline',
  'baseline.sleepAvgHours': 'Your sleep baseline',
  'steps.aboveBaseline': 'Steps above your usual',
};

function humaniseCondition(cond: { field: string; op: string; value: any }): string {
  const label = FIELD_LABELS[cond.field] ?? cond.field.replace(/\./g, ' › ');
  const v = cond.value;

  // Boolean fields
  if (typeof v === 'boolean') {
    return v ? label : `No ${label.toLowerCase()}`;
  }

  // Special case: percentages
  if (cond.field.includes('Pct') || cond.field.includes('adherence')) {
    const num = Number(v);
    const sign = cond.op === 'lt' || cond.op === 'lte' ? 'below' : 'above';
    return `${label} ${sign} ${num}%`;
  }

  // Hours
  if (cond.field.includes('hours') || cond.field.includes('Hours')) {
    const num = Number(v);
    const sign = cond.op === 'lt' || cond.op === 'lte' ? 'under' : 'over';
    return `${label} ${sign} ${num}h`;
  }

  // Days
  if (cond.field.includes('days') || cond.field.includes('Days') || cond.field.includes('Since')) {
    const num = Number(v);
    const sign = cond.op === 'gt' || cond.op === 'gte' ? 'over' : 'under';
    return `${label} ${sign} ${num} days`;
  }

  // Overnight HR (BPM) — non-clinical copy in rules; nerd mode shows this label
  if (
    cond.field.includes('HeartRate') ||
    cond.field === 'sleep.lastNight.avgHeartRate' ||
    cond.field === 'sleep.lastNight.minHeartRate' ||
    cond.field === 'sleep.lastNight.maxHeartRate'
  ) {
    const num = Number(v);
    const sign =
      cond.op === 'lt' || cond.op === 'lte'
        ? 'below'
        : cond.op === 'gt' || cond.op === 'gte'
          ? 'above'
          : cond.op === 'eq'
            ? 'at'
            : 'vs';
    return `${label} ${sign} ${Math.round(num)} bpm`;
  }

  // Steps
  if (cond.field.includes('steps') || cond.field.includes('Steps')) {
    const sign = cond.op === 'lt' || cond.op === 'lte' ? 'under' : 'over';
    return `${label} ${sign} ${Number(v).toLocaleString()}`;
  }

  // Minutes
  if (
    cond.field.includes('Minutes') ||
    cond.field.includes('deltaMin') ||
    cond.field === 'calendar.minutesToNextDemandingStart'
  ) {
    const sign = cond.op === 'lt' || cond.op === 'lte' ? 'under' : 'over';
    return `${label} ${sign} ${v} min`;
  }

  // Calendar / count-style fields (avoid misrouting to generic "days")
  if (cond.field === 'calendar.demandingEventsTodayCount') {
    const sign = cond.op === 'lt' || cond.op === 'lte' ? 'under' : 'over';
    return `${label} ${sign} ${v}`;
  }

  // Mood (1-5 scale)
  if (cond.field.startsWith('mood.last') || cond.field.startsWith('mood.belowBaseline')) {
    const sign = cond.op === 'lt' || cond.op === 'lte' ? 'at or below' : 'at or above';
    return `${label} ${sign} ${v}/5`;
  }

  // Generic fallback
  const opLabel =
    cond.op === 'lt' || cond.op === 'lte' ? '<' :
    cond.op === 'gt' || cond.op === 'gte' ? '>' :
    '=';
  return `${label} ${opLabel} ${v}`;
}

const NEGATIVE_REASONS: Array<{ id: InsightFeedbackReason; label: string }> = [
  { id: 'not_accurate', label: INSIGHT_FEEDBACK_REASON_LABELS.not_accurate },
  { id: 'not_relevant_now', label: INSIGHT_FEEDBACK_REASON_LABELS.not_relevant_now },
  { id: 'too_generic', label: INSIGHT_FEEDBACK_REASON_LABELS.too_generic },
  { id: 'already_doing_this', label: INSIGHT_FEEDBACK_REASON_LABELS.already_doing_this },
  { id: 'dont_like_suggestion', label: INSIGHT_FEEDBACK_REASON_LABELS.dont_like_suggestion },
  { id: 'confusing', label: INSIGHT_FEEDBACK_REASON_LABELS.confusing },
  { id: 'other', label: INSIGHT_FEEDBACK_REASON_LABELS.other },
];

function resolveNerdModeEnabled(settings: any): boolean {
  if (!settings) return false;

  if (typeof settings.nerdModeEnabled === 'boolean') return settings.nerdModeEnabled;
  if (typeof settings.nerdMode === 'boolean') return settings.nerdMode;
  if (typeof settings.nerd_mode === 'boolean') return settings.nerd_mode;

  if (settings.flags) {
    if (typeof settings.flags.nerdModeEnabled === 'boolean') return settings.flags.nerdModeEnabled;
    if (typeof settings.flags.nerdMode === 'boolean') return settings.flags.nerdMode;
  }

  return false;
}

/** Lifecycle-hero DNA only: soft wash + dashed arc contour; single ultra-slow opacity breath. */
const INSIGHT_AMBIENT_BREATH_MS = 26000;
const INSIGHT_AMBIENT_OPACITY_MIN = 0.2;
const INSIGHT_AMBIENT_OPACITY_MAX = 0.38;

function InsightAmbientLayer({
  width,
  height,
  dark,
  reduceMotion,
}: {
  width: number;
  height: number;
  dark: boolean;
  reduceMotion: boolean;
}) {
  const washId = useMemo(() => `insight_ambient_wash_${Math.random().toString(36).slice(2, 9)}`, []);
  const opacity = useRef(new Animated.Value(0.29)).current;

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(0.3);
      return undefined;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: INSIGHT_AMBIENT_OPACITY_MAX,
          duration: INSIGHT_AMBIENT_BREATH_MS / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: INSIGHT_AMBIENT_OPACITY_MIN,
          duration: INSIGHT_AMBIENT_BREATH_MS / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity, reduceMotion]);

  const ringStroke = dark ? 'rgba(203, 213, 225, 0.055)' : 'rgba(100, 116, 139, 0.065)';
  const washStrong = dark ? 'rgba(129, 170, 240, 0.055)' : 'rgba(37, 99, 235, 0.045)';
  const washSoft = dark ? 'rgba(148, 163, 184, 0.032)' : 'rgba(15, 23, 42, 0.028)';

  const r = Math.max(width, 120) * 0.48;
  const cx = width * 0.92;
  const cy = -width * 0.06;

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { opacity }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id={washId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={washStrong} stopOpacity="0.32" />
            <Stop offset="0.42" stopColor={washStrong} stopOpacity="0" />
            <Stop offset="1" stopColor={washSoft} stopOpacity="0.26" />
          </LinearGradient>
        </Defs>
        <Path d={`M 0 0 H ${width} V ${height} H 0 Z`} fill={`url(#${washId})`} />
        <Circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={ringStroke}
          strokeWidth={0.75}
          strokeDasharray="22 26"
        />
      </Svg>
    </Animated.View>
  );
}

export function InsightCard({
  insight,
  onActionPress,
  onRefreshPress,
  onDismiss,
  isProcessing,
  disabled,
  testID,
  screenSource,
  embedInTightVerticalStack,
  emphasis = 'default',
}: InsightCardProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const reduceMotion = useReducedMotion();
  const insightSurface = reclaimInsightModuleSurface(appTheme);
  const recessedWell = reclaimRecessedWell(appTheme);
  const qc = useQueryClient();

  const [ambientSize, setAmbientSize] = useState<{ w: number; h: number } | null>(null);

  const [expanded, setExpanded] = useState(false);

  // Glossary
  const [glossaryVisible, setGlossaryVisible] = useState(false);
  const [selectedTag, setSelectedTag] = useState<ChemistryTag | null>(null);

  // Feedback state
  const [feedback, setFeedback] = useState<null | { helpful: boolean; reason?: InsightFeedbackReason | string }>(null);
  const [showReasons, setShowReasons] = useState(false);

  // Keep the row id so we can UPDATE reason instead of inserting duplicates
  const [feedbackRowId, setFeedbackRowId] = useState<string | null>(null);

  const userSettingsQ = useQuery({
    queryKey: ['user:settings'],
    queryFn: getUserSettings,
  });

  const nerdModeEnabled = resolveNerdModeEnabled(userSettingsQ.data);

  const chemistryTags = useMemo(() => {
    if (!nerdModeEnabled) return [];
    return getChemistryTagsRobust(insight);
  }, [nerdModeEnabled, insight]);

  const iconName: InsightIconName = (insight.icon as InsightIconName) ?? 'lightbulb-on-outline';

  const whyCopy = useMemo(() => {
    if (insight.why) return insight.why;
    if (!insight.matchedConditions?.length) {
      return 'This suggestion draws from your recent mood, sleep, and routine patterns.';
    }
    return 'This suggestion considers your latest mood, sleep, and routine signals.';
  }, [insight.matchedConditions?.length, insight.why]);

  // ✅ Stable ID for DB + suppression
  const insightId = useMemo(() => {
    return insight.id && String(insight.id).trim() ? String(insight.id) : String(insight.sourceTag ?? insight.message);
  }, [insight.id, insight.message, insight.sourceTag]);

  /**
   * Only run this AFTER the reason is selected (or 👍), to ensure suppression has the latest DB state.
   */
  const syncFeedbackCache = useCallback(async () => {
    try {
      // Broad invalidate for any feedback queries
      await qc.invalidateQueries({
        predicate: (q) => Array.isArray(q.queryKey) && String(q.queryKey[0]).startsWith('insights:feedback'),
      });

      await qc.refetchQueries({
        predicate: (q) => Array.isArray(q.queryKey) && String(q.queryKey[0]).startsWith('insights:feedback'),
        type: 'all',
      });
    } catch {
      // non-fatal
    }
  }, [qc]);

  const feedbackInsertMutation = useMutation({
    mutationFn: async (input: { helpful: boolean; reason?: InsightFeedbackReason | string }) => {
      return logInsightFeedback({
        insight_id: insightId,
        source_tag: insight.sourceTag ?? null,
        helpful: input.helpful,
        reason: input.reason ?? null,
        match_payload: {
          insight_id: insightId,
          source_tag: insight.sourceTag ?? null,
          message: insight.message,
          action: insight.action ?? null,
          why: insight.why ?? null,
          matchedConditions: insight.matchedConditions ?? null,
          explain: (insight as any)?.explain ?? null,
          scopes: (insight as any)?.scopes ?? null,
        },
      });
    },
  });

  const feedbackUpdateMutation = useMutation({
    mutationFn: async (input: { id: string; reason: InsightFeedbackReason }) => {
      return updateInsightFeedback(input.id, {
        reason: input.reason,
        match_payload: {
          insight_id: insightId,
          source_tag: insight.sourceTag ?? null,
          message: insight.message,
          action: insight.action ?? null,
          why: insight.why ?? null,
          matchedConditions: insight.matchedConditions ?? null,
          explain: (insight as any)?.explain ?? null,
          scopes: (insight as any)?.scopes ?? null,
        },
      });
    },
  });

  const handleActionPress = () => {
    if (!disabled) onActionPress?.(insight);
  };

  const handleShare = useCallback(async () => {
    try {
      const lines: string[] = ['💡 Today\'s signal from Reclaim', '', insight.message];
      if (insight.action) lines.push('', `→ ${insight.action}`);
      lines.push('', 'Track yours on Reclaim.');
      await Share.share({ message: lines.join('\n') });
    } catch {
      // User cancelled share sheet — no-op
    }
  }, [insight.action, insight.message]);

  /**
   * 👍 Helpful:
   * - Insert row
   * - Sync cache
   * - Refresh insight immediately
   */
  const submitHelpful = useCallback(async () => {
    setFeedback({ helpful: true });
    setShowReasons(false);

    try {
      const row = (await feedbackInsertMutation.mutateAsync({ helpful: true })) as InsightFeedbackRow;
      setFeedbackRowId(row?.id ?? null);

      // Log telemetry for feedback submission
      if (screenSource) {
        logTelemetry({
          name: 'insight_feedback_submitted',
          properties: {
            insightId: insightId,
            helpful: true,
            sourceTag: insight.sourceTag ?? null,
            screenSource,
            scopes: Array.isArray((insight as any).scopes) ? (insight as any).scopes : null,
          },
        }).catch((e) => { if (__DEV__) logger.debug('[InsightCard]', e); }); // Non-blocking, don't fail feedback submission
      }

      await syncFeedbackCache();
      onRefreshPress?.();
      return row;
    } catch (e) {
      if (__DEV__) console.warn('[InsightCard] logInsightFeedback (helpful) failed:', e);
      setFeedback(null);
      setFeedbackRowId(null);
      throw e;
    }
  }, [feedbackInsertMutation, onRefreshPress, syncFeedbackCache, screenSource, insightId, insight.sourceTag]);

  /**
   * 👎 Not helpful (STEP 1):
   * - Insert row with helpful=false, reason=null
   * - DO NOT refresh, DO NOT invalidate/refetch anything yet
   * - Show reasons
   */
  const submitNotHelpfulInitial = useCallback(async () => {
    setFeedback({ helpful: false });
    setShowReasons(false);

    try {
      const row = (await feedbackInsertMutation.mutateAsync({ helpful: false })) as InsightFeedbackRow;
      setFeedbackRowId(row?.id ?? null);

      setShowReasons(true);
      return row;
    } catch (e) {
      if (__DEV__) console.warn('[InsightCard] logInsightFeedback (not helpful) failed:', e);
      setFeedback(null);
      setFeedbackRowId(null);
      throw e;
    }
  }, [feedbackInsertMutation]);

  /**
   * 👎 Reason (STEP 2):
   * - Update row with reason
   * - Sync cache (await!)
   * - NOW refresh insight
   */
  const submitReason = useCallback(
    async (reason: InsightFeedbackReason) => {
      setFeedback({ helpful: false, reason });
      setShowReasons(false);

      try {
        if (!feedbackRowId) {
          const row = (await feedbackInsertMutation.mutateAsync({ helpful: false, reason })) as InsightFeedbackRow;
          setFeedbackRowId(row?.id ?? null);
        } else {
          await feedbackUpdateMutation.mutateAsync({ id: feedbackRowId, reason });
        }

        // Log telemetry for feedback submission
        if (screenSource) {
          logTelemetry({
            name: 'insight_feedback_submitted',
            properties: {
              insightId: insightId,
              helpful: false,
              reason: reason ?? null,
              sourceTag: insight.sourceTag ?? null,
              screenSource,
              scopes: Array.isArray((insight as any).scopes) ? (insight as any).scopes : null,
            },
          }).catch((e) => { if (__DEV__) logger.debug('[InsightCard]', e); }); // Non-blocking, don't fail feedback submission
        }

        await syncFeedbackCache();
        onRefreshPress?.();
      } catch (e) {
        if (__DEV__) console.warn('[InsightCard] updateInsightFeedback failed:', e);
        setFeedback({ helpful: false });
        setShowReasons(true);
      }
    },
    [feedbackInsertMutation, feedbackRowId, feedbackUpdateMutation, onRefreshPress, syncFeedbackCache, screenSource, insightId, insight.sourceTag],
  );

  const handleThumbDown = useCallback(() => {
    if (disabled || feedbackInsertMutation.isPending || feedbackUpdateMutation.isPending) return;
    submitNotHelpfulInitial().catch((e) => { if (__DEV__) logger.debug('[InsightCard]', e); });
  }, [disabled, feedbackInsertMutation.isPending, feedbackUpdateMutation.isPending, submitNotHelpfulInitial]);

  const nerdDebug = useMemo(() => {
    if (!nerdModeEnabled) return null;

    const scopes = Array.isArray((insight as any).scopes) ? (insight as any).scopes.join(', ') : '';
    const conds = (insight.matchedConditions ?? []).map((c) => `${c.field} ${c.op} ${String(c.value)}`);
    const explain = typeof (insight as any).explain === 'string' ? (insight as any).explain : '';

    return {
      id: insight.id,
      scopes,
      matched: conds,
      explain,
    };
  }, [insight, nerdModeEnabled]);

  const dark = theme.dark;
  const cobalt = dark ? 'rgba(129, 170, 240, 0.85)' : theme.colors.primary;
  const chipBorder = dark ? 'rgba(140, 175, 235, 0.22)' : 'rgba(37, 99, 235, 0.14)';
  const guidedIconWell = reclaimGuidedIconWell(appTheme);
  const confidenceChips = buildConfidenceChips(insight);
  const confidenceNextStep = confidenceNextStepForInsight(insight);
  const cobaltMuted = dark ? 'rgba(129, 170, 240, 0.64)' : 'rgba(37, 99, 235, 0.72)';

  const isSupport = emphasis === 'support' || insight.id === 'mood-sustained-low';

  return (
    <Card
      mode="elevated"
      elevation={0}
      style={[
        insightSurface,
        styles.cardRoot,
        embedInTightVerticalStack ? { marginBottom: 0 } : null,
        isSupport
          ? {
              backgroundColor: insightSupportWash(dark),
              borderColor: insightSupportAccent(dark),
            }
          : null,
      ]}
      testID={testID}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`${screenSource === 'dashboard' ? 'Daily signal' : 'System insight'}: ${insight.message}`}
    >
      {isSupport ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: insightEmphasisSupport.accentBarWidth,
            backgroundColor: insightSupportAccent(dark),
            borderTopLeftRadius: RECLAIM_CHROME.moduleRadius,
            borderBottomLeftRadius: RECLAIM_CHROME.moduleRadius,
          }}
        />
      ) : null}
      <View
        style={styles.cardBodyWrap}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (width > 0 && height > 0) {
            setAmbientSize((prev) =>
              prev && Math.abs(prev.w - width) < 1 && Math.abs(prev.h - height) < 1 ? prev : { w: width, h: height },
            );
          }
        }}
      >
        {ambientSize ? (
          <InsightAmbientLayer
            width={ambientSize.w}
            height={ambientSize.h}
            dark={dark}
            reduceMotion={reduceMotion}
          />
        ) : null}
        <Card.Content style={styles.content}>
        <View style={styles.headerRow}>
          <View style={[guidedIconWell, styles.headerIconWell]}>
            <MaterialCommunityIcons name={iconName} size={18} color={cobaltMuted} />
          </View>
          <View style={styles.headerCopy}>
            <Text
              variant="titleMedium"
              style={[
                reclaimTextRoles.cardTitle,
                {
                  color: theme.colors.onSurface,
                  fontSize: 15,
                  lineHeight: 20,
                  fontWeight: '600',
                  letterSpacing: -0.1,
                  opacity: 0.88,
                },
              ]}
            >
              {screenSource === 'dashboard' ? 'Daily signal' : 'System insight'}
            </Text>
            <Text
              variant="bodySmall"
              style={[reclaimTextRoles.meta, { color: theme.colors.onSurfaceVariant, marginTop: 4 }]}
            >
              {formatInsightCategory(insight.sourceTag)}
            </Text>
          </View>
          {onRefreshPress ? (
            <IconButton
              icon="refresh"
              size={18}
              onPress={onRefreshPress}
              accessibilityLabel="Refresh insight"
              style={{ margin: 0, backgroundColor: 'transparent' }}
              iconColor={theme.colors.onSurfaceVariant}
            />
          ) : null}
          {onDismiss ? (
            <IconButton
              icon="close"
              size={18}
              onPress={onDismiss}
              accessibilityLabel="Dismiss insight"
              style={{ margin: 0, backgroundColor: 'transparent' }}
              iconColor={theme.colors.onSurfaceVariant}
            />
          ) : null}
        </View>

        <View style={styles.chipRow}>
          {confidenceChips.map((label) => (
            <View
              key={label}
              style={[
                styles.softChip,
                {
                  backgroundColor: dark ? 'rgba(255, 255, 255, 0.045)' : 'rgba(15, 23, 42, 0.045)',
                },
              ]}
            >
              <Text style={[styles.softChipText, { color: theme.colors.onSurfaceVariant }]}>{label}</Text>
            </View>
          ))}
        </View>

        {confidenceNextStep ? (
          <Text
            variant="bodySmall"
            style={{
              color: theme.colors.onSurfaceVariant,
              marginTop: 8,
              opacity: 0.85,
              lineHeight: 18,
            }}
          >
            {confidenceNextStep}
          </Text>
        ) : null}

        <View style={styles.heroBlock}>
          <Text
            accessibilityRole="text"
            style={[
              reclaimTextRoles.interpretationLead,
              {
                color: theme.colors.onSurface,
                opacity: 0.94,
                fontSize: 19,
                lineHeight: 27,
                fontWeight: '500',
                letterSpacing: -0.11,
              },
            ]}
          >
            {insight.message}
          </Text>
        </View>

        {insight.action ? (
          <View
            style={[
              recessedWell,
              styles.calloutWell,
              {
                paddingVertical: 8,
                paddingHorizontal: 10,
                backgroundColor: dark ? 'rgba(6, 12, 26, 0.32)' : 'rgba(15, 23, 42, 0.028)',
                borderColor: dark ? 'rgba(55, 75, 118, 0.45)' : 'rgba(15, 23, 42, 0.058)',
              },
            ]}
          >
            <Text
              variant="labelSmall"
              style={[reclaimTextRoles.calloutOverline, { color: theme.colors.onSurfaceVariant, opacity: 0.78 }]}
            >
              Suggested next step
            </Text>
            <Text
              variant="bodyMedium"
              style={[reclaimTextRoles.body, { marginTop: 5, color: theme.colors.onSurface, opacity: 0.84 }]}
            >
              {insight.action}
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={() => setExpanded((prev) => !prev)}
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Hide why this insight' : 'Why this insight'}
          style={({ pressed }) => [
            styles.whyToggle,
            {
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <Text style={[reclaimTextRoles.inlineLink, { color: theme.colors.primary }]}>
            {expanded ? 'Hide' : 'Why this?'}
          </Text>
          <MaterialCommunityIcons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={theme.colors.primary}
            style={{ marginLeft: 2 }}
          />
        </Pressable>

        {expanded ? (
          <View style={[recessedWell, styles.reasoningInset]}>
            {insight.matchedConditions?.length ? (
              <View style={styles.reasoningSection}>
                <Text
                  variant="labelSmall"
                  style={[styles.reasoningSectionTitle, { color: theme.colors.onSurfaceVariant }]}
                >
                  Signals used
                </Text>
                <View
                  style={[
                    styles.signalList,
                    {
                      borderColor: dark ? 'rgba(120, 150, 200, 0.16)' : 'rgba(37, 99, 235, 0.1)',
                    },
                  ]}
                >
                  {insight.matchedConditions.map((cond, i) => (
                    <View
                      key={i}
                      style={[
                        styles.signalRow,
                        {
                          borderBottomColor: dark ? 'rgba(120, 145, 190, 0.12)' : theme.colors.outlineVariant,
                        },
                        i === insight.matchedConditions!.length - 1 ? styles.signalRowLast : null,
                      ]}
                    >
                      <View style={[styles.signalBullet, { backgroundColor: cobalt }]} />
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurface, flex: 1, lineHeight: 20 }}>
                        {humaniseCondition(cond)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, lineHeight: 20, marginBottom: 8 }}>
                No specific rule conditions were stored for this read — it may be contextual or broadly inferred.
              </Text>
            )}

            <View style={styles.reasoningSection}>
              <Text
                variant="labelSmall"
                style={[styles.reasoningSectionTitle, { color: theme.colors.onSurfaceVariant }]}
              >
                How we read this
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, lineHeight: 20 }}>
                {whyCopy}
              </Text>
            </View>

            {insight.action ? (
              <View style={styles.reasoningSection}>
                <Text
                  variant="labelSmall"
                  style={[styles.reasoningSectionTitle, { color: theme.colors.onSurfaceVariant }]}
                >
                  Why this suggestion
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, lineHeight: 20 }}>
                  The action matches the pattern above — it is a practical reset aligned with what changed in your
                  signals, not a claim about exact biology.
                </Text>
              </View>
            ) : null}

            {nerdModeEnabled && chemistryTags.length > 0 ? (
              <View
                style={[
                  styles.glossaryStrip,
                  styles.reasoningGlossaryStrip,
                  {
                    borderColor: chipBorder,
                    backgroundColor: dark ? 'rgba(255, 255, 255, 0.028)' : 'rgba(37, 99, 235, 0.04)',
                  },
                ]}
              >
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, opacity: 0.55, marginBottom: 4 }}>
                  Educational glossary — general biology context only, not live lab values.
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {chemistryTags.map((tag) => {
                    const entry = CHEMISTRY_GLOSSARY[tag];
                    if (!entry) return null;
                    return (
                      <Chip
                        key={tag}
                        mode="outlined"
                        compact
                        onPress={() => {
                          setSelectedTag(tag);
                          setGlossaryVisible(true);
                        }}
                        style={{
                          borderRadius: 8,
                          backgroundColor: dark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(37, 99, 235, 0.035)',
                          borderColor: chipBorder,
                        }}
                        textStyle={{
                          color: theme.colors.onSurfaceVariant,
                          fontSize: 11,
                          opacity: 0.88,
                        }}
                        accessibilityLabel={`Glossary: ${entry.name}. Tap to view description.`}
                      >
                        {entry.name}
                      </Chip>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {nerdDebug ? (
              <View
                style={[
                  styles.nerdInset,
                  {
                    borderColor: dark ? 'rgba(100, 130, 185, 0.2)' : theme.colors.outlineVariant,
                    backgroundColor: dark ? 'rgba(0, 0, 0, 0.22)' : 'rgba(15, 23, 42, 0.04)',
                  },
                ]}
              >
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, fontWeight: '600', opacity: 0.8 }}>
                  Interpretability (nerd mode)
                </Text>
                <Text
                  variant="labelSmall"
                  style={{ color: theme.colors.onSurfaceVariant, marginTop: 6, opacity: 0.62, lineHeight: 18 }}
                >
                  Confidence is inferred from how many independent signals fired — fewer signals means a more provisional
                  read.
                </Text>
                {nerdDebug.explain ? (
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, lineHeight: 19 }}>
                    {nerdDebug.explain}
                  </Text>
                ) : null}
                <Text
                  variant="labelSmall"
                  style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, opacity: 0.52, letterSpacing: 0.2 }}
                >
                  rule_id: {String(nerdDebug.id)} · scopes: {nerdDebug.scopes || '—'}
                </Text>
                {nerdDebug.matched.length ? (
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4, opacity: 0.48, letterSpacing: 0.15 }}>
                    {nerdDebug.matched.join(' · ')}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        <View
          style={[
            styles.lowerDock,
            {
              borderTopColor: dark ? 'rgba(130, 155, 195, 0.1)' : 'rgba(15, 23, 42, 0.09)',
              marginTop: expanded ? RECLAIM_CARD_BLOCK_GAP : 6,
            },
          ]}
        >
          <ReclaimButton
            variant="primary"
            onPress={handleActionPress}
            disabled={disabled || isProcessing}
            accessibilityLabel={primaryActionLabel(insight)}
            style={{ alignSelf: 'stretch' }}
          >
            {isProcessing ? 'Working…' : primaryActionLabel(insight)}
          </ReclaimButton>

          {showReasons ? (
            <View style={styles.reasonChipsRow}>
              {NEGATIVE_REASONS.map((r) => (
                <Chip
                  key={r.id}
                  compact
                  mode="outlined"
                  onPress={() => submitReason(r.id).catch((e) => { if (__DEV__) logger.debug('[InsightCard]', e); })}
                  style={{ borderRadius: 8, borderColor: theme.colors.outlineVariant }}
                  textStyle={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}
                  disabled={disabled || feedbackInsertMutation.isPending || feedbackUpdateMutation.isPending}
                >
                  {r.label}
                </Chip>
              ))}
            </View>
          ) : null}

          <View style={styles.footerUtility}>
            {feedback ? (
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, opacity: 0.72 }}>
                Thanks — we heard you
              </Text>
            ) : null}
            <View style={styles.footerUtilityIcons}>
              <IconButton
                icon="share-variant-outline"
                size={18}
                onPress={handleShare}
                disabled={disabled}
                accessibilityLabel="Share this insight"
                style={{ margin: 0, backgroundColor: 'transparent' }}
                iconColor={theme.colors.onSurfaceVariant}
              />
              <IconButton
                icon="thumb-up-outline"
                size={18}
                onPress={() => submitHelpful().catch((e) => { if (__DEV__) logger.debug('[InsightCard]', e); })}
                disabled={disabled || feedbackInsertMutation.isPending || feedbackUpdateMutation.isPending}
                accessibilityLabel="Mark insight as helpful"
                style={{ margin: 0, backgroundColor: 'transparent' }}
                iconColor={theme.colors.onSurfaceVariant}
              />
              <IconButton
                icon="thumb-down-outline"
                size={18}
                onPress={handleThumbDown}
                disabled={disabled || feedbackInsertMutation.isPending || feedbackUpdateMutation.isPending}
                accessibilityLabel="Mark insight as not helpful"
                style={{ margin: 0, backgroundColor: 'transparent' }}
                iconColor={theme.colors.onSurfaceVariant}
              />
            </View>
          </View>
        </View>
      </Card.Content>
      </View>

      <GlossaryModal
        visible={glossaryVisible}
        tag={selectedTag}
        onDismiss={() => {
          setGlossaryVisible(false);
          setSelectedTag(null);
        }}
      />
    </Card>
  );
}

function GlossaryModal({
  visible,
  tag,
  onDismiss,
}: {
  visible: boolean;
  tag: ChemistryTag | null;
  onDismiss: () => void;
}) {
  const theme = useTheme();
  const entry = tag ? CHEMISTRY_GLOSSARY[tag] : null;

  if (!entry) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: theme.colors.backdrop,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
        activeOpacity={1}
        onPress={onDismiss}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 16,
            padding: 20,
            maxWidth: 400,
            width: '100%',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}
          >
            <Text variant="titleMedium" style={[reclaimTextRoles.cardTitle, { color: theme.colors.onSurface }]}>
              {entry.name}
            </Text>
            <TouchableOpacity onPress={onDismiss} accessibilityLabel="Close glossary">
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurface} />
            </TouchableOpacity>
          </View>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, lineHeight: 22 }}>
            {entry.description}
          </Text>
          <ReclaimButton variant="ghost" onPress={onDismiss} style={{ marginTop: 16, alignSelf: 'flex-end' }}>
            Close
          </ReclaimButton>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  cardRoot: {
    position: 'relative',
    overflow: 'hidden',
  },
  cardBodyWrap: {
    position: 'relative',
  },
  content: {
    gap: RECLAIM_CARD_BLOCK_GAP,
    paddingTop: RECLAIM_CARD_MODULE_CONTENT_PADDING.vertical,
    paddingBottom: RECLAIM_CARD_MODULE_CONTENT_PADDING.vertical + 2,
    paddingHorizontal: RECLAIM_CARD_MODULE_CONTENT_PADDING.horizontal,
    position: 'relative',
    zIndex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headerIconWell: {
    opacity: 0.87,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
    marginBottom: 8,
  },
  softChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 0,
  },
  softChipText: {
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 0.08,
    opacity: 0.78,
  },
  heroBlock: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 328,
    paddingVertical: 10,
    marginTop: 2,
  },
  calloutWell: {
    marginTop: 9,
  },
  reasoningInset: {
    marginTop: RECLAIM_CARD_BLOCK_GAP,
  },
  reasoningSection: {
    marginBottom: 12,
  },
  reasoningSectionTitle: {
    fontWeight: '600',
    letterSpacing: 0.35,
    opacity: 0.78,
    marginBottom: 8,
  },
  signalList: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  signalRowLast: {
    borderBottomWidth: 0,
  },
  signalBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 10,
    opacity: 0.85,
  },
  nerdInset: {
    marginTop: 4,
    padding: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  lowerDock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    gap: 8,
  },
  reasonChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  footerUtilityIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 2,
    opacity: 0.52,
  },
  whyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 0,
    paddingRight: 8,
  },
  glossaryStrip: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  /** Glossary lives inside expanded reasoning; spacing ties to inset, not CTA/footer. */
  reasoningGlossaryStrip: {
    marginTop: 4,
    marginBottom: 0,
  },
  footerUtility: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    paddingTop: 2,
  },
});

export default InsightCard;
