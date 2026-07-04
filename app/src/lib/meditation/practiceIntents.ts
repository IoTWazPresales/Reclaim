import type { MeditationType } from '@/lib/meditations';

/** One-line intent copy for practice picker cards (≤12 words). */
export const MEDITATION_PRACTICE_INTENTS: Record<MeditationType, string> = {
  progressive_muscle_relaxation: 'Tense and release each muscle group.',
  body_scan: 'Notice sensation from head to toe.',
  safe_ring_visualization: 'Step into a calm, safe place.',
  box_breathing: 'Steady four-count breath rhythm.',
  four_7_8_breathing: 'Long exhale to settle the nervous system.',
  mindful_breathing: 'Return attention to the breath.',
  loving_kindness: 'Warm wishes for yourself and others.',
  grounding_54321: 'Anchor through the five senses.',
};
