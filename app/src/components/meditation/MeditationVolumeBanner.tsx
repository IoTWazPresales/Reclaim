import React from 'react';
import { Pressable, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

type Props = {
  onReady: () => void;
};

/**
 * Shown on autoStart when voice guidance is on. User tap unlocks audio (compliant —
 * no background volume changes without gesture).
 */
export function MeditationVolumeBanner({ onReady }: Props) {
  const theme = useTheme();

  const onEnable = async () => {
    try {
      await Audio.setAudioModeAsync({
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
      Speech.speak('Voice guidance is ready.', { rate: 0.95 });
    } catch {
      // proceed even if mode setup fails
    }
    onReady();
  };

  return (
    <Pressable
      onPress={onEnable}
      accessibilityRole="button"
      accessibilityLabel="Enable voice volume"
      style={{
        marginBottom: 12,
        borderRadius: 14,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: theme.colors.primaryContainer,
        borderWidth: 1,
        borderColor: theme.colors.primary,
      }}
    >
      <MaterialCommunityIcons name="volume-high" size={22} color={theme.colors.primary} />
      <View style={{ flex: 1 }}>
        <Text variant="labelLarge" style={{ color: theme.colors.onPrimaryContainer, fontWeight: '700' }}>
          Enable voice volume
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer, marginTop: 2, opacity: 0.9 }}>
          Tap to confirm media volume, then voice guidance will start.
        </Text>
      </View>
    </Pressable>
  );
}
