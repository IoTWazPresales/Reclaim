import * as Updates from 'expo-updates';

function normalizedChannel(): string {
  try {
    return String(Updates.channel ?? '').trim().toLowerCase();
  } catch {
    return '';
  }
}

export function isFeedbackCaptureEnabled(): boolean {
  const forceOff = String(process.env.EXPO_PUBLIC_ALPHA_FEEDBACK_FORCE_OFF ?? '') === '1';
  if (forceOff) return false;

  const forceOn = String(process.env.EXPO_PUBLIC_ALPHA_FEEDBACK_FORCE_ON ?? '') === '1';
  if (forceOn) return true;

  if (__DEV__) return true;

  const channel = normalizedChannel();
  return channel === 'preview' || channel === 'development' || channel === 'dev';
}

export function getFeedbackChannel(): string | null {
  const channel = normalizedChannel();
  return channel || null;
}
