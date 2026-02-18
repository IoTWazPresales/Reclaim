import React from 'react';
import { Pressable, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

type ReportIssueButtonProps = {
  onPress: (event?: GestureResponderEvent) => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  size?: number;
};

export function ReportIssueButton({
  onPress,
  accessibilityLabel = 'Report an issue for this section',
  style,
  size = 16,
}: ReportIssueButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={(event) => {
        event.stopPropagation?.();
        onPress(event);
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={10}
      style={[
        {
          width: 28,
          height: 28,
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: theme.colors.outlineVariant,
          backgroundColor: theme.colors.surface,
        },
        style,
      ]}
    >
      <MaterialCommunityIcons name="bug-outline" size={size} color={theme.colors.onSurfaceVariant} />
    </Pressable>
  );
}
