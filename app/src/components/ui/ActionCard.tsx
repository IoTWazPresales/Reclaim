import React from 'react';
import { TouchableOpacity, View, StyleSheet, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { AppCard } from './AppCard';
import { useAppTheme } from '@/theme';

export interface ActionCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor?: string;
  disabled?: boolean;
  style?: any;
  contentContainerStyle?: any;
}

/**
 * ActionCard - Elevated card for actionable content
 * 4-6dp elevation, uses theme.primary for accents
 * Small scale animation on press
 * Optional left icon to indicate "actionable"
 */
export function ActionCard({
  children,
  onPress,
  icon,
  iconColor,
  disabled = false,
  style,
  contentContainerStyle,
}: ActionCardProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled || !onPress) return;
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      damping: 15,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled || !onPress) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 15,
    }).start();
  };

  const handlePress = () => {
    if (disabled || !onPress) return;
    onPress();
  };

  const cardContent = (
    <AppCard
      mode="elevated"
      borderRadius="xl"
      style={[
        {
          backgroundColor: theme.colors.surface,
          elevation: 4,
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
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
            size={24}
            color={iconColor || theme.colors.primary}
            style={styles.icon}
          />
        )}
        <View style={styles.childrenContainer}>{children}</View>
        {onPress && (
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color={theme.colors.onSurfaceVariant}
            style={styles.chevron}
          />
        )}
      </View>
    </AppCard>
  );

  if (onPress && !disabled) {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
          disabled={disabled}
        >
          {cardContent}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return cardContent;
}

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  childrenContainer: {
    flex: 1,
  },
  chevron: {
    marginLeft: 8,
    opacity: 0.6,
  },
});

