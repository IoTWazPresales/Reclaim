import * as Haptics from 'expo-haptics';

type HapticStyle = 'impact' | 'success';

export async function triggerLightHaptic({
  enabled,
  reduceMotion,
  style = 'impact',
}: {
  enabled: boolean;
  reduceMotion?: boolean;
  style?: HapticStyle;
}) {
  if (!enabled || reduceMotion) return;
  try {
    if (style === 'success') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch {
    // No-op – haptics may not be supported on all devices (e.g., simulators)
  }
}


