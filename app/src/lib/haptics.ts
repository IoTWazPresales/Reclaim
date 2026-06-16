import * as Haptics from 'expo-haptics';

type HapticStyle = 'impact' | 'success' | 'selection';

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
    } else if (style === 'selection') {
      await Haptics.selectionAsync();
    } else {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch {
    // No-op – haptics may not be supported on all devices (e.g., simulators)
  }
}


