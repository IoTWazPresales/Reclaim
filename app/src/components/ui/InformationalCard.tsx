import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { AppCard } from './AppCard';
import { useAppTheme } from '@/theme';

export interface InformationalCardProps {
  children: React.ReactNode;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor?: string;
  style?: any;
  contentContainerStyle?: any;
}

/**
 * InformationalCard - Flat card for displaying information
 * No elevation, uses theme surface/background
 * Optional left-aligned icon
 */
export function InformationalCard({
  children,
  icon,
  iconColor,
  style,
  contentContainerStyle,
}: InformationalCardProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();

  return (
    <AppCard
      mode="flat"
      borderRadius="lg"
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.outlineVariant,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.content,
          {
            padding: appTheme.spacing.lg,
          },
          contentContainerStyle,
        ]}
      >
        {icon && (
          <MaterialCommunityIcons
            name={icon}
            size={20}
            color={iconColor || theme.colors.onSurfaceVariant}
            style={styles.icon}
          />
        )}
        <View style={styles.childrenContainer}>{children}</View>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    marginRight: 12,
    marginTop: 2,
  },
  childrenContainer: {
    flex: 1,
  },
});

