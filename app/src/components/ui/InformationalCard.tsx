import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { AppCard, type AppCardProps } from './AppCard';
import { useAppTheme } from '@/theme';

export interface InformationalCardProps {
  children: React.ReactNode;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor?: string;
  style?: any;
  contentContainerStyle?: any;
  /** Pass 0 when a parent owns inter-section spacing (e.g. reclaimSectionSpacing). */
  marginBottom?: AppCardProps['marginBottom'];
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
  marginBottom,
}: InformationalCardProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();

  return (
    <AppCard mode="elevated" borderRadius="lg" marginBottom={marginBottom} style={style}>
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
            size={18}
            color={iconColor || theme.colors.onSurfaceVariant}
            style={[styles.icon, { opacity: 0.7 }]}
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
