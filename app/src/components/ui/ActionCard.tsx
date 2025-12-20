import React from 'react';
import { TouchableOpacity, View, StyleSheet, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';
import { AppCard } from './AppCard';
import { useAppTheme } from '@/theme';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

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
  const gradientId = React.useMemo(() => `hero-grad-${Math.random().toString(36).slice(2)}`, []);
  const glowId = React.useMemo(() => `hero-glow-${Math.random().toString(36).slice(2)}`, []);

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
          // Premium hero surface treatment (dark-first): subtle separation via surface contrast + faint overlay.
          // Avoid strong shadows to keep it calm/sleep-friendly.
          elevation: theme.dark ? 0 : 8,
          shadowColor: theme.dark ? undefined : theme.colors.primary,
          shadowOffset: theme.dark ? undefined : { width: 0, height: 4 },
          shadowOpacity: theme.dark ? 0 : 0.15,
          shadowRadius: theme.dark ? 0 : 8,
          borderWidth: 1,
          borderColor: theme.dark ? theme.colors.outlineVariant : theme.colors.primaryContainer,
        },
        style,
      ]}
    >
      <View
        style={{
          position: 'relative',
          borderRadius: appTheme.borderRadius.xl,
          overflow: 'hidden',
        }}
      >
        {/* Subtle overlay gradient + optional radial glow (dark mode only). */}
        {theme.dark ? (
          <Svg
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
            width="100%"
            height="100%"
          >
            <Defs>
              <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
                {/* Use stopOpacity (instead of rgba alpha) for reliable rendering across platforms */}
                <Stop offset="0" stopColor="rgba(255,255,255,1)" stopOpacity={0.05} />
                <Stop offset="1" stopColor="rgba(255,255,255,1)" stopOpacity={0.0} />
              </LinearGradient>
              {/* Ultra-subtle focus glow behind the primary metric area (kept very calm). */}
              <RadialGradient id={glowId} cx="35%" cy="35%" rx="55%" ry="55%">
                <Stop offset="0" stopColor="rgba(255,255,255,1)" stopOpacity={0.04} />
                <Stop offset="1" stopColor="rgba(255,255,255,1)" stopOpacity={0.0} />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${glowId})`} />
            <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradientId})`} />
          </Svg>
        ) : null}

        {/* 1px inner top highlight (dark mode only). */}
        {theme.dark ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              backgroundColor: 'rgba(255,255,255,0.04)',
            }}
          />
        ) : null}

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
          <View style={{ backgroundColor: theme.colors.primaryContainer, borderRadius: 8, padding: 6, marginRight: 12 }}>
            <MaterialCommunityIcons
              name={icon}
              size={20}
              color={iconColor || theme.colors.primary}
            />
          </View>
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
    // Icon container is now handled inline
  },
  childrenContainer: {
    flex: 1,
  },
  chevron: {
    marginLeft: 8,
    opacity: 0.6,
  },
});

