import React from 'react';
import { View } from 'react-native';
import { Button, IconButton, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { InformationalCard } from '@/components/ui/InformationalCard';
import {
  reclaimGhostCapsuleButton,
  reclaimPrimaryCapsuleButton,
} from '@/theme/reclaimVisualLanguage';
import { useAppTheme } from '@/theme';

type Props = {
  visible: boolean;
  message: string;
  showMeLabel?: string;
  onShowMe?: () => void;
  onDismiss: () => void;
  style?: object;
};

/** One-time dismissible coach card for first screen visit. */
export function FirstVisitCoach({ visible, message, showMeLabel, onShowMe, onDismiss, style }: Props) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const primaryCapsule = reclaimPrimaryCapsuleButton(appTheme);
  const ghostCapsule = reclaimGhostCapsuleButton(appTheme);

  if (!visible) return null;

  return (
    <InformationalCard icon="lightbulb-on-outline" style={style}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, paddingRight: 4 }}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, lineHeight: 22 }}>
            {message}
          </Text>
          {onShowMe && showMeLabel ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12, alignItems: 'center' }}>
              <Button
                mode="contained"
                onPress={onShowMe}
                style={primaryCapsule.style}
                contentStyle={primaryCapsule.contentStyle}
                labelStyle={primaryCapsule.labelStyle}
                icon={({ size, color }) => (
                  <MaterialCommunityIcons name="gesture-tap" size={size} color={color} />
                )}
              >
                {showMeLabel}
              </Button>
              <Button
                mode="text"
                onPress={onDismiss}
                textColor={theme.colors.primary}
                style={ghostCapsule.style}
                contentStyle={ghostCapsule.contentStyle}
                labelStyle={ghostCapsule.labelStyle}
              >
                Got it
              </Button>
            </View>
          ) : (
            <Button
              mode="text"
              onPress={onDismiss}
              textColor={theme.colors.primary}
              style={[ghostCapsule.style, { alignSelf: 'flex-start', marginTop: 8 }]}
              contentStyle={ghostCapsule.contentStyle}
              labelStyle={ghostCapsule.labelStyle}
            >
              Got it
            </Button>
          )}
        </View>
        <IconButton
          icon="close"
          size={18}
          onPress={onDismiss}
          accessibilityLabel="Dismiss coach"
          style={{ margin: 0 }}
        />
      </View>
    </InformationalCard>
  );
}
