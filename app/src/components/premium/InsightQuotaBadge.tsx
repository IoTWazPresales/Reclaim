/**
 * In-context free-tier insight quota — surfaces the existing gate (Phase 3.3).
 */
import React, { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { FREE_RULE_LIMIT, TOTAL_INSIGHT_RULE_COUNT } from '@/lib/premium/premiumConfig';
import { usePremium } from '@/lib/premium/usePremium';
import { useAppTheme } from '@/theme';
import { RECLAIM_CHROME, reclaimChromeElevation } from '@/theme/reclaimChrome';

type InsightQuotaBadgeProps = {
  onUpgradePress?: () => void;
  compact?: boolean;
};

export function InsightQuotaBadge({ onUpgradePress, compact = false }: InsightQuotaBadgeProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const { isPremium, isLoading } = usePremium();

  const handlePress = useCallback(() => {
    onUpgradePress?.();
  }, [onUpgradePress]);

  if (isLoading || isPremium) return null;

  const label = `${FREE_RULE_LIMIT} of ${TOTAL_INSIGHT_RULE_COUNT} insights`;

  if (compact) {
    return (
      <Pressable
        onPress={onUpgradePress ? handlePress : undefined}
        accessibilityRole={onUpgradePress ? 'button' : 'text'}
        accessibilityLabel={`${label}. Upgrade for full library.`}
        style={{
          alignSelf: 'flex-start',
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 999,
          backgroundColor: theme.dark ? 'rgba(83, 201, 202, 0.12)' : 'rgba(83, 201, 202, 0.1)',
          borderWidth: 1,
          borderColor: theme.dark ? 'rgba(83, 201, 202, 0.22)' : 'rgba(83, 201, 202, 0.18)',
        }}
      >
        <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: '600' }}>
          {label}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onUpgradePress ? handlePress : undefined}
      accessibilityRole={onUpgradePress ? 'button' : 'text'}
      accessibilityLabel={`${label}. Upgrade for the full personalised library.`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: RECLAIM_CHROME.cardRadius,
        backgroundColor: theme.dark ? 'rgba(83, 201, 202, 0.08)' : 'rgba(83, 201, 202, 0.06)',
        ...reclaimChromeElevation(appTheme, 'quiet'),
        borderColor: theme.dark ? 'rgba(83, 201, 202, 0.2)' : 'rgba(83, 201, 202, 0.14)',
      }}
    >
      <MaterialCommunityIcons name="lock-outline" size={18} color={theme.colors.primary} />
      <View style={{ flex: 1 }}>
        <Text variant="labelMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
          {label}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
          Premium unlocks the full {TOTAL_INSIGHT_RULE_COUNT}-rule library personalised to you.
        </Text>
      </View>
      {onUpgradePress ? (
        <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.primary} />
      ) : null}
    </Pressable>
  );
}
