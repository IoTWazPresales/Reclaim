import React from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Text, useTheme } from 'react-native-paper';

export type MindfulnessToolKey = 'breath_478' | 'box_breath_60' | 'five_senses' | 'reality_check' | 'urge_surf';

type Props = {
  toolKey: MindfulnessToolKey;
  title: string;
  selected?: boolean;
  onPress: () => void;
};

function ToolGlyph({ toolKey, color }: { toolKey: MindfulnessToolKey; color: string }) {
  const stroke = { stroke: color, strokeWidth: 2, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (toolKey) {
    case 'breath_478':
      return (
        <Svg width={28} height={28} viewBox="0 0 28 28">
          <Path d="M14 4 L24 22 H4 Z" {...stroke} />
        </Svg>
      );
    case 'box_breath_60':
      return (
        <Svg width={28} height={28} viewBox="0 0 28 28">
          <Rect x={6} y={6} width={16} height={16} rx={2} {...stroke} />
        </Svg>
      );
    case 'five_senses':
      return (
        <Svg width={28} height={28} viewBox="0 0 28 28">
          <Path d="M8 20 C8 12 12 8 16 8 C18 8 20 10 20 13 C20 17 17 20 14 22 L12 24" {...stroke} />
          <Circle cx={16} cy={11} r={1.2} fill={color} />
        </Svg>
      );
    case 'reality_check':
      return (
        <Svg width={28} height={28} viewBox="0 0 28 28">
          <Circle cx={14} cy={14} r={8} {...stroke} />
          <Circle cx={14} cy={14} r={3} {...stroke} />
        </Svg>
      );
    case 'urge_surf':
    default:
      return (
        <Svg width={28} height={28} viewBox="0 0 28 28">
          <Path d="M14 6 V22 M10 10 H18 M10 18 H18" {...stroke} />
          <Circle cx={14} cy={6} r={2} fill={color} />
        </Svg>
      );
  }
}

export function MindfulnessToolTile({ toolKey, title, selected, onPress }: Props) {
  const theme = useTheme();
  const accent = theme.colors.primary;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{
        width: '48%',
        flexGrow: 1,
        minHeight: 88,
        borderRadius: 14,
        padding: 12,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? accent : theme.colors.outlineVariant,
        backgroundColor: selected ? theme.colors.primaryContainer : theme.colors.surfaceVariant,
      }}
    >
      <ToolGlyph toolKey={toolKey} color={selected ? accent : theme.colors.onSurfaceVariant} />
      <Text
        variant="labelLarge"
        style={{
          marginTop: 10,
          color: selected ? theme.colors.onPrimaryContainer : theme.colors.onSurface,
          fontWeight: '700',
        }}
        numberOfLines={2}
      >
        {title}
      </Text>
    </Pressable>
  );
}
