/**
 * Store compliance strings for Google Play Health Policy and Apple App Store.
 * Required for health/wellness apps: medical disclaimer, healthcare reminder, privacy policy URL.
 */

/** Medical disclaimer - required for non-medical-device health apps (Google Play) */
export const MEDICAL_DISCLAIMER =
  'Reclaim is not a medical device and does not diagnose, treat, cure, or prevent any medical condition.';

/** Healthcare professional reminder - required by Google Play for health apps */
export const HEALTHCARE_REMINDER =
  'Always consult a healthcare professional for medical advice, diagnosis, or treatment.';

/** Privacy policy URL - update when published. Must be publicly accessible, non-geofenced. */
export const PRIVACY_POLICY_URL =
  process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL ??
  'https://github.com/IoTWazPresales/Reclaim/blob/work/PRIVACY.md';

/** Crisis helpline - 988 Suicide & Crisis Lifeline (US). Shown where mood/mental health content appears. */
export const CRISIS_HELPLINE_LABEL = '988 Suicide & Crisis Lifeline';
export const CRISIS_HELPLINE_URL = 'https://988lifeline.org';
export const CRISIS_HELPLINE_PHONE = '988';
