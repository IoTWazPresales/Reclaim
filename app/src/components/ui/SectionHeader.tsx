import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, useTheme } from 'react-native-paper';
import { useAppTheme } from '@/theme';

export interface SectionHeaderProps {
  title: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  caption?: string;
  style?: any;
}

/**
 * SectionHeader - Consistent section headers with optional icon and caption
 * Uses theme.typography.h3 or variant="titleLarge"
 * Optional small icon on the left
 * Optional caption/explanation line in softer color
 */
export function SectionHeader({ title, icon, caption, style }: SectionHeaderProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();

  return (
    <View style={[styles.container, { marginBottom: appTheme.spacing.md }, style]}>
      <View style={styles.titleRow}>
        {icon && (
          <MaterialCommunityIcons
            name={icon}
            size={20}
            color={theme.colors.primary}
            style={styles.icon}
          />
        )}
        <Text
          variant="titleLarge"
          style={[
            appTheme.typography.h3,
            {
              color: theme.colors.onSurface,
              flex: 1,
            },
          ]}
        >
          {title}
        </Text>
      </View>
      {caption && (
        <Text
          variant="bodySmall"
          style={[
            {
              color: theme.colors.onSurfaceVariant,
              marginTop: appTheme.spacing.xs,
              marginLeft: icon ? 32 : 0,
            },
          ]}
        >
          {caption}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
});

