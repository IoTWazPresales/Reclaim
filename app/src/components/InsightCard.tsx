import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Modal, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Card, Chip, Text, useTheme } from 'react-native-paper';

import type { InsightMatch } from '@/lib/insights/InsightEngine';
import { getTagForInsight, CHEMISTRY_GLOSSARY, type ChemistryTag } from '@/lib/chemistryGlossary';
import { getUserSettings } from '@/lib/userSettings';
import { useQuery } from '@tanstack/react-query';
import { FeatureCardHeader } from '@/components/ui/FeatureCardHeader';

type InsightIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type InsightCardProps = {
  insight: InsightMatch;
  onActionPress?: (insight: InsightMatch) => void;
  onRefreshPress?: () => void;
  isProcessing?: boolean;
  disabled?: boolean;
  testID?: string;
};

export function InsightCard({
  insight,
  onActionPress,
  onRefreshPress,
  isProcessing,
  disabled,
  testID,
}: InsightCardProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [glossaryVisible, setGlossaryVisible] = useState(false);
  const [selectedTag, setSelectedTag] = useState<ChemistryTag | null>(null);

  const userSettingsQ = useQuery({
    queryKey: ['user:settings'],
    queryFn: getUserSettings,
  });

  const nerdModeEnabled = userSettingsQ.data?.nerdModeEnabled ?? false;
  const chemistryTags = useMemo(() => {
    if (!nerdModeEnabled) return [];
    return getTagForInsight(insight.sourceTag);
  }, [nerdModeEnabled, insight.sourceTag]);

  const iconName: InsightIconName = (insight.icon as InsightIconName) ?? 'lightbulb-on-outline';

  const whyCopy = useMemo(() => {
    if (insight.why) return insight.why;
    if (!insight.matchedConditions.length) {
      return 'This suggestion draws from your recent mood, sleep, and routine patterns.';
    }
    return 'This suggestion considers your latest mood, sleep, and routine signals.';
  }, [insight.matchedConditions.length, insight.why]);

  const handleActionPress = () => {
    if (!disabled) {
      onActionPress?.(insight);
    }
  };

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
        {/* NEW: standardized header */}
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

        {/* Main copy */}
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

        {/* Why toggle */}
        <Button
          mode="text"
          compact
          onPress={() => setExpanded((prev) => !prev)}
          accessibilityLabel={expanded ? 'Hide explanation' : 'Why?'}
        >
          {expanded ? 'Hide' : 'Why?'}
        </Button>

        {expanded ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {whyCopy}
          </Text>
        ) : null}

        {/* Nerd Mode: chemistry tags */}
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
                  style={{ backgroundColor: theme.colors.tertiaryContainer ?? theme.colors.surfaceVariant }}
                  textStyle={{ color: theme.colors.onTertiaryContainer ?? theme.colors.onSurfaceVariant, fontSize: 11 }}
                  accessibilityLabel={`Chemistry tag: ${entry.name}. Tap to view description.`}
                >
                  {entry.name}
                </Chip>
              );
            })}
          </View>
        )}

        {/* Action */}
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
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
