export type InterventionKey = 'box_breath_60' | 'five_senses' | 'reality_check' | 'urge_surf';

export const INTERVENTIONS: Record<InterventionKey, { title: string; steps: string[] }> = {
  box_breath_60: {
    title: 'Box Breathing (60s)',
    steps: ['Inhale 4', 'Hold 4', 'Exhale 4', 'Hold 4 (×4)'],
  },
  five_senses: {
    title: '5-Senses Grounding',
    steps: ['5 see', '4 touch', '3 hear', '2 smell', '1 taste'],
  },
  reality_check: {
    title: 'Reality Check',
    steps: ['Name the worry', 'Evidence for/against', 'One next action'],
  },
  urge_surf: {
    title: 'Panic pause (1–2 min)',
    steps: ['Notice the feeling', 'Rate intensity 0–10', 'Breathe and let it pass'],
  },
};

/** User-facing labels for history and anywhere raw intervention IDs must not appear (Phase 7 T1-07). */
const INTERVENTION_ALIASES: Record<string, string> = {
  breath_478: '4-7-8 Breathing',
  urge_surfing: 'Panic pause',
};

export function formatInterventionLabel(id: string | null | undefined): string {
  if (!id) return 'Mindfulness session';
  const known = INTERVENTIONS[id as InterventionKey]?.title;
  if (known) return known;
  const alias = INTERVENTION_ALIASES[id];
  if (alias) return alias;
  return id
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export type AffectSignal = {
  hr?: number;           // current heart rate
  hrv?: number;          // ms
  sleepDebtHrs?: number; // last 3 days
  recentNegativeTags?: number; // count in past day
  lastMood?: number;     // 1..5
};

export function simpleRuleEngine(sig: AffectSignal): { hit: boolean; reason?: string; intervention?: InterventionKey } {
  // naive examples, tune later
  if (typeof sig.hr === 'number' && sig.hr > 100 && (sig.recentNegativeTags ?? 0) >= 1) {
    return { hit: true, reason: 'elevated_hr', intervention: 'box_breath_60' };
  }
  if ((sig.sleepDebtHrs ?? 0) >= 4 && (sig.lastMood ?? 3) <= 2) {
    return { hit: true, reason: 'low_mood_sleep_debt', intervention: 'five_senses' };
  }
  return { hit: false };
}
