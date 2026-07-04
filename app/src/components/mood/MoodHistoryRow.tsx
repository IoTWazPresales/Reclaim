import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MoodWeatherGlyph } from '@/components/mood/MoodWeatherGlyph';
import { moodWeather } from '@/lib/mood/moodWeather';
import { useAppTheme } from '@/theme';

type Props = {
  rowKey: string;
  dayLabel: string;
  rating: number;
  volatile: boolean;
  delta?: number;
  windowN: number;
  tagCount: number;
  flash?: boolean;
  onPress: () => void;
  onLayoutY?: (y: number) => void;
};

const BAR_HEIGHT = 24;
const BAR_WIDTH = 40;

export function MoodHistoryRow({
  rowKey,
  dayLabel,
  rating,
  volatile,
  delta,
  windowN,
  tagCount,
  flash,
  onPress,
  onLayoutY,
}: Props) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const accent = appTheme.domainAccents.mood;
  const { kind, label } = moodWeather(rating, volatile);
  const flashAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!flash) return;
    flashAnim.setValue(1);
    Animated.timing(flashAnim, {
      toValue: 0,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [flash, flashAnim]);

  const flashBg = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', theme.colors.primaryContainer],
  });

  const showDelta = windowN >= 3 && delta !== undefined && Math.abs(delta) >= 1;
  const deltaText = showDelta ? (delta! > 0 ? `+${Math.round(delta!)}` : `${Math.round(delta!)}`) : null;
  const barFill = Math.max(2, Math.round((Math.min(10, Math.max(0, rating)) / 10) * BAR_HEIGHT));

  return (
    <Animated.View
      style={{
        backgroundColor: flashBg,
        borderRadius: 10,
        marginBottom: 4,
      }}
    >
      <Pressable
        onPress={onPress}
        onLayout={(e) => onLayoutY?.(e.nativeEvent.layout.y)}
        accessibilityRole="button"
        accessibilityLabel={`${dayLabel}, ${label}, rating ${rating} of 10`}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 8,
          paddingHorizontal: 4,
          gap: 10,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <MoodWeatherGlyph kind={kind} accent={accent} size={22} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: theme.colors.onSurface, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>
            {dayLabel}
          </Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, marginTop: 1 }} numberOfLines={1}>
            {label}
            {volatile ? ' · wider swings' : ''}
          </Text>
        </View>
        <View
          style={{
            width: BAR_WIDTH,
            height: BAR_HEIGHT,
            borderRadius: 4,
            backgroundColor: theme.colors.surfaceVariant,
            justifyContent: 'flex-end',
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: '100%',
              height: barFill,
              borderRadius: 4,
              backgroundColor: accent,
            }}
          />
        </View>
        {deltaText ? (
          <View
            style={{
              minWidth: 36,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor: theme.colors.surfaceVariant,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: theme.colors.onSurfaceVariant, fontWeight: '800', fontSize: 12 }}>{deltaText}</Text>
          </View>
        ) : (
          <View style={{ width: 36 }} />
        )}
        {tagCount > 0 ? (
          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11, fontWeight: '600', minWidth: 52 }}>
            +{tagCount} tag{tagCount === 1 ? '' : 's'}
          </Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}
