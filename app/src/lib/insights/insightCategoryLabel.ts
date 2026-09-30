/**
 * Display-only category heading for InsightCard.
 * Persisted sourceTag, rule id, conditions, routes and telemetry stay unchanged.
 * Chemistry glossary text stays association-only. The card chips are associationChips.ts.
 */

const EXACT_LABELS: Readonly<Record<string, string>> = {
  sleep_breath_vagal: 'Breathing',
  global_breath: 'Breathing',
  breath: 'Breathing',
  sleep_circadian: 'Sleep timing',
  sleep_circadian_advance: 'Sleep timing',
  sleep_circadian_late: 'Sleep timing',
  circadian_delay_risk: 'Sleep timing',
  mood_social_buffer: 'Social',
  social_recharge: 'Social',
  social_positive: 'Social',
  cross_isolation_mood: 'Social',
  recovery_optimal: 'Recovery',
  vitals_resting_hr_trend_mood: 'Recovery',
  activity: 'Activity',
};

const PREFIX_LABELS: ReadonlyArray<readonly [string, string]> = [
  ['sleep_', 'Sleep'],
  ['mood_', 'Mood'],
  ['meds_', 'Medication'],
  ['training_', 'Training'],
  ['steps_', 'Movement'],
  ['stress_', 'Stress'],
  ['dashboard_', 'Today'],
  ['cross_', 'Patterns'],
];

const BARE_LABELS: Readonly<Record<string, string>> = {
  sleep: 'Sleep',
  mood: 'Mood',
  meds: 'Medication',
  training: 'Training',
  steps: 'Movement',
  stress: 'Stress',
  dashboard: 'Today',
};

function normalizeCategoryKey(sourceTag: string): string {
  return sourceTag.trim().toLowerCase().replace(/-+/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
}

/** Neutral domain or observation label. Unknown tags do not echo the internal id. */
export function formatInsightCategory(sourceTag?: string | null): string {
  if (!sourceTag?.trim()) return 'Daily signal';
  const key = normalizeCategoryKey(sourceTag);
  if (!key) return 'Daily signal';
  const exact = EXACT_LABELS[key];
  if (exact) return exact;
  const bare = BARE_LABELS[key];
  if (bare) return bare;
  for (const [prefix, label] of PREFIX_LABELS) {
    if (key.startsWith(prefix)) return label;
  }
  return 'Daily signal';
}
