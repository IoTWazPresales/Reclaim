// C:\Reclaim\app\src\components\ui\InsightCard.tsx

import React, { useMemo, useState, useCallback } from 'react';
import { StyleSheet, View, Modal, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Card, Chip, Text, useTheme, IconButton } from 'react-native-paper';

import type { InsightMatch } from '@/lib/insights/InsightEngine';
import { getTagForInsight, CHEMISTRY_GLOSSARY, type ChemistryTag } from '@/lib/chemistryGlossary';
import { getUserSettings } from '@/lib/userSettings';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';
import {
  logInsightFeedback,
  updateInsightFeedback,
  type InsightFeedbackReason,
  INSIGHT_FEEDBACK_REASON_LABELS,
  type InsightFeedbackRow,
} from '@/lib/api';
import { logTelemetry } from '@/lib/telemetry';

type InsightIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type InsightCardProps = {
  insight: InsightMatch;
  onActionPress?: (insight: InsightMatch) => void;
  onRefreshPress?: () => void;
  isProcessing?: boolean;
  disabled?: boolean;
  testID?: string;
  screenSource?: 'dashboard' | 'mood' | 'sleep' | 'meds' | 'finish'; // For telemetry
};

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

function signalsLabel(insight: InsightMatch): string {
  const n = insight.matchedConditions?.length ?? 0;
  if (n <= 0) return 'Based on your recent activity';
  if (n === 1) return 'Based on 1 signal';
  return `Based on ${n} signals`;
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

export function InsightCard({
  insight,
  onActionPress,
  onRefreshPress,
  isProcessing,
  disabled,
  testID,
  screenSource,
}: InsightCardProps) {
  const theme = useTheme();
  const qc = useQueryClient();

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
        }).catch(() => {}); // Non-blocking, don't fail feedback submission
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
          }).catch(() => {}); // Non-blocking, don't fail feedback submission
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
    submitNotHelpfulInitial().catch(() => {});
  }, [disabled, feedbackInsertMutation.isPending, feedbackUpdateMutation.isPending, submitNotHelpfulInitial]);

  const nerdDebug = useMemo(() => {
    if (!nerdModeEnabled) return null;

    const scopes = Array.isArray((insight as any).scopes) ? (insight as any).scopes.join(', ') : '';
    const conds = (insight.matchedConditions ?? []).map((c) => `${c.field} ${c.op} ${String(c.value)}`);

    return {
      id: insight.id,
      scopes,
      matched: conds,
    };
  }, [insight, nerdModeEnabled]);

  return (
    <Card
      mode="elevated"
      elevation={2}
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
      testID={testID}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`Scientific insight: ${insight.message}`}
    >
      <Card.Content style={styles.content}>
        <FeatureCardHeader
          icon={iconName}
          title="Scientific insight"
          subtitle={insight.sourceTag ? insight.sourceTag.replace(/_/g, ' ') : undefined}
          rightSlot={
            onRefreshPress ? (
              <Button
                mode="text"
                compact
                onPress={onRefreshPress}
                accessibilityLabel="Refresh insight"
                style={styles.refreshButton}
              >
                Refresh
              </Button>
            ) : null
          }
        />

        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: -6 }}>
          {signalsLabel(insight)}
        </Text>

        <View style={styles.copyBlock}>
          <Text variant="titleMedium" accessibilityRole="text" style={{ marginBottom: 4 }}>
            {insight.message}
          </Text>
          {insight.action ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {insight.action}
            </Text>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Button
            mode="text"
            compact
            onPress={() => setExpanded((prev) => !prev)}
            accessibilityLabel={expanded ? 'Hide explanation' : 'Why?'}
          >
            {expanded ? 'Hide' : 'Why?'}
          </Button>

          {feedback ? (
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Thanks
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginRight: 4 }}>
                Helpful?
              </Text>
              <IconButton
                icon="thumb-up-outline"
                size={18}
                onPress={() => submitHelpful().catch(() => {})}
                disabled={disabled || feedbackInsertMutation.isPending || feedbackUpdateMutation.isPending}
                accessibilityLabel="Mark insight as helpful"
              />
              <IconButton
                icon="thumb-down-outline"
                size={18}
                onPress={handleThumbDown}
                disabled={disabled || feedbackInsertMutation.isPending || feedbackUpdateMutation.isPending}
                accessibilityLabel="Mark insight as not helpful"
              />
            </View>
          )}
        </View>

        {expanded ? (
          <>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {whyCopy}
            </Text>

            {nerdDebug ? (
              <View style={{ marginTop: 8, padding: 10, borderRadius: 12, backgroundColor: theme.colors.surfaceVariant }}>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Rule: {nerdDebug.id}
                </Text>
                {nerdDebug.scopes ? (
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Scopes: {nerdDebug.scopes}
                  </Text>
                ) : null}
                {nerdDebug.matched.length ? (
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}>
                    Matched:
                    {'\n'}- {nerdDebug.matched.join('\n- ')}
                  </Text>
                ) : (
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}>
                    Matched: (none)
                  </Text>
                )}
              </View>
            ) : null}
          </>
        ) : null}

        {showReasons ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {NEGATIVE_REASONS.map((r) => (
              <Chip
                key={r.id}
                compact
                mode="outlined"
                onPress={() => submitReason(r.id).catch(() => {})}
                style={{ borderColor: theme.colors.outlineVariant }}
                textStyle={{ fontSize: 11, color: theme.colors.onSurfaceVariant }}
                disabled={disabled || feedbackInsertMutation.isPending || feedbackUpdateMutation.isPending}
              >
                {r.label}
              </Chip>
            ))}
          </View>
        ) : null}

        {nerdModeEnabled && chemistryTags.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {chemistryTags.map((tag) => {
              const entry = CHEMISTRY_GLOSSARY[tag];
              if (!entry) return null;
              return (
                <Chip
                  key={tag}
                  mode="flat"
                  compact
                  onPress={() => {
                    setSelectedTag(tag);
                    setGlossaryVisible(true);
                  }}
                  style={{ backgroundColor: (theme.colors as any).tertiaryContainer ?? theme.colors.surfaceVariant }}
                  textStyle={{
                    color: (theme.colors as any).onTertiaryContainer ?? theme.colors.onSurfaceVariant,
                    fontSize: 11,
                  }}
                  accessibilityLabel={`Chemistry tag: ${entry.name}. Tap to view description.`}
                >
                  {entry.name}
                </Chip>
              );
            })}
          </View>
        )}

        <View style={[styles.actions, { marginTop: 8 }]}>
          <Chip
            mode="flat"
            icon="lightning-bolt-outline"
            onPress={handleActionPress}
            disabled={disabled || isProcessing}
            accessibilityLabel={`Do it: ${insight.action ?? 'Action'}`}
            style={{ backgroundColor: theme.colors.primaryContainer }}
            textStyle={{ color: theme.colors.onPrimaryContainer, fontWeight: '600' }}
          >
            {isProcessing ? 'Working…' : 'Do it'}
          </Chip>
        </View>
      </Card.Content>

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
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
              {entry.name}
            </Text>
            <TouchableOpacity onPress={onDismiss} accessibilityLabel="Close glossary">
              <MaterialCommunityIcons name="close" size={24} color={theme.colors.onSurface} />
            </TouchableOpacity>
          </View>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, lineHeight: 22 }}>
            {entry.description}
          </Text>
          <Button mode="text" onPress={onDismiss} style={{ marginTop: 16, alignSelf: 'flex-end' }}>
            Close
          </Button>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    marginBottom: 16,
  },
  content: {
    gap: 10,
    paddingVertical: 4,
  },
  copyBlock: {
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 8,
  },
  refreshButton: {
    marginLeft: 'auto',
  },
});

export default InsightCard;
