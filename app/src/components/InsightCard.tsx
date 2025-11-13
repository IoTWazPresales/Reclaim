import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Card, Chip, Text, useTheme } from 'react-native-paper';

import type { InsightMatch } from '@/lib/insights/InsightEngine';

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
        <View style={styles.header}>
          <Text variant="labelSmall" style={[styles.pill, { color: theme.colors.secondary }]}>
            Scientific insight
          </Text>
          {onRefreshPress ? (
            <Button
              mode="text"
              compact
              onPress={onRefreshPress}
              accessibilityLabel="Refresh insight"
              style={styles.refreshButton}
            >
              Refresh
            </Button>
          ) : null}
        </View>
        <View style={styles.body}>
          <View style={[styles.iconContainer, { backgroundColor: theme.colors.secondaryContainer }]}>
            <MaterialCommunityIcons name={iconName} size={24} color={theme.colors.onSecondaryContainer} />
          </View>
          <View style={styles.copyContainer}>
            <Text variant="titleMedium" numberOfLines={1} accessibilityRole="text">
              {insight.message}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
              numberOfLines={2}
            >
              {insight.action}
            </Text>
          </View>
        </View>
        <Button
          mode="text"
          compact
          onPress={() => setExpanded((prev) => !prev)}
          accessibilityLabel={expanded ? 'Hide explanation' : 'Why?'}
        >
          {expanded ? 'Hide' : 'Why?'}
        </Button>
        {expanded ? (
          <Text
            variant="bodySmall"
            numberOfLines={2}
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {whyCopy}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <Chip
            mode="flat"
            icon="lightning-bolt-outline"
            onPress={handleActionPress}
            disabled={disabled || isProcessing}
            accessibilityLabel={`Do it: ${insight.action}`}
            style={{ backgroundColor: theme.colors.primaryContainer }}
            textStyle={{ color: theme.colors.onPrimaryContainer, fontWeight: '600' }}
          >
            {isProcessing ? 'Working…' : 'Do it'}
          </Chip>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    marginBottom: 16,
  },
  content: {
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyContainer: {
    flex: 1,
    gap: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 4,
  },
  pill: {
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  body: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  refreshButton: {
    marginLeft: 'auto',
  },
});

export default InsightCard;

