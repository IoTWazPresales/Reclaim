export type ChemistryTag =
  | 'dopamine_d2'
  | 'serotonin_5ht1a'
  | 'adenosine_a2a'
  | 'melatonin'
  | 'cortisol'
  | 'mg'
  | 'fe'
  | 'gaba'
  | 'norepinephrine'
  | 'acetylcholine'
  // Added (patch-only: minimal but high-signal)
  | 'oxytocin'
  | 'beta_endorphin'
  | 'histamine';

export type ChemistryGlossaryEntry = {
  id: ChemistryTag;
  name: string;
  description: string;
};

export const CHEMISTRY_GLOSSARY: Record<ChemistryTag, ChemistryGlossaryEntry> = {
  dopamine_d2: {
    id: 'dopamine_d2',
    name: 'Dopamine D2',
    description: 'Dopamine signaling is associated with motivation and reward. Reclaim does not measure it.',
  },
  serotonin_5ht1a: {
    id: 'serotonin_5ht1a',
    name: 'Serotonin 5-HT1A',
    description: 'Serotonin signaling is associated with mood. Reclaim does not measure it.',
  },
  adenosine_a2a: {
    id: 'adenosine_a2a',
    name: 'Adenosine A2A',
    description: 'Adenosine signaling is associated with sleep pressure. Reclaim does not measure it.',
  },
  melatonin: {
    id: 'melatonin',
    name: 'Melatonin',
    description: 'Melatonin is associated with the body preparing for sleep. Reclaim does not measure it.',
  },
  cortisol: {
    id: 'cortisol',
    name: 'Cortisol',
    description: 'Cortisol is associated with the daily rhythm of alertness and sleep. Reclaim does not measure it.',
  },
  mg: {
    id: 'mg',
    name: 'Magnesium',
    description: 'Magnesium intake is associated with muscle relaxation. Reclaim does not measure it.',
  },
  fe: {
    id: 'fe',
    name: 'Iron',
    description: 'Iron status is associated with energy and motivation. Reclaim does not measure it.',
  },
  gaba: {
    id: 'gaba',
    name: 'GABA',
    description: 'GABA signaling is associated with calm. Reclaim does not measure it.',
  },
  norepinephrine: {
    id: 'norepinephrine',
    name: 'Norepinephrine',
    description: 'Norepinephrine is associated with arousal, alertness, focus, and anxiety. Reclaim does not measure it.',
  },
  acetylcholine: {
    id: 'acetylcholine',
    name: 'Acetylcholine',
    description: 'Acetylcholine is associated with attention and memory. Reclaim does not measure it.',
  },
  oxytocin: {
    id: 'oxytocin',
    name: 'Oxytocin',
    description: 'Oxytocin is associated with social connection. Reclaim does not measure it.',
  },
  beta_endorphin: {
    id: 'beta_endorphin',
    name: 'β-Endorphin',
    description: 'Endorphin signaling is associated with mood after movement. Reclaim does not measure it.',
  },
  histamine: {
    id: 'histamine',
    name: 'Histamine',
    description: 'Histamine signaling is associated with wakefulness. Reclaim does not measure it.',
  },
};

function norm(tag?: string | null): string {
  return String(tag ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

/**
 * Nerd Mode chemistry tags
 * - Uses exact mapping for “special” tags
 * - Falls back to prefix buckets so mood_* / sleep_* / meds_* always show chips
 */
export function getTagForInsight(sourceTag: string): ChemistryTag[] {
  const t = norm(sourceTag);
  if (!t) return [];

  // Exact/specific mappings (highest precision)
  // NOTE: Includes legacy aliases for backwards compatibility.
  const exact: Record<string, ChemistryTag[]> = {
    // Sleep
    sleep_serotonin: ['serotonin_5ht1a', 'melatonin', 'cortisol'],
    sleep_circadian: ['melatonin', 'cortisol', 'adenosine_a2a'],
    sleep_inertia: ['adenosine_a2a', 'cortisol', 'histamine'],

    // NEW: extra mappings for additional rule sourceTags (more precise Nerd Mode chips)
    sleep_debt: ['adenosine_a2a', 'cortisol', 'melatonin'],
    sleep_debt_prevent: ['adenosine_a2a', 'melatonin'],
    sleep_circadian_advance: ['melatonin', 'cortisol'],

    // Breath / vagal (new normalized + legacy)
    sleep_breath_vagal: ['gaba', 'norepinephrine'],
    breath_vagal: ['gaba', 'norepinephrine'],

    // Mood (new normalized + legacy)
    mood_dopamine: ['dopamine_d2', 'norepinephrine'],
    mood_activity_endorphins: ['beta_endorphin', 'dopamine_d2', 'norepinephrine'],
    activity_endorphins: ['beta_endorphin', 'dopamine_d2', 'norepinephrine'],

    mood_social_buffer: ['oxytocin', 'norepinephrine', 'serotonin_5ht1a'],
    social_buffer: ['oxytocin', 'norepinephrine', 'serotonin_5ht1a'],

    // NEW: combos / load / friction tags (if used by rules)
    mood_allostatic_load: ['cortisol', 'norepinephrine', 'gaba'],
    meds_friction: ['dopamine_d2', 'norepinephrine'],
    dashboard_state_shift: ['norepinephrine', 'beta_endorphin', 'dopamine_d2'],

    // Meds (optional exact mappings to keep chips stable and meaningful)
    meds_high: ['dopamine_d2', 'norepinephrine'],
    meds_moderate: ['dopamine_d2', 'norepinephrine'],
    meds_low: ['dopamine_d2', 'norepinephrine'],

    // New per-screen fallbacks
    sleep_fallback: ['melatonin', 'cortisol', 'adenosine_a2a'],
    mood_fallback: ['serotonin_5ht1a', 'gaba', 'norepinephrine'],
    meds_fallback: ['dopamine_d2', 'norepinephrine'],
    dashboard_fallback: ['dopamine_d2', 'norepinephrine'],

    // Normalized “old fallback” tags (if you kept them)
    sleep_light: ['melatonin', 'cortisol', 'adenosine_a2a'],
    mood_note: ['serotonin_5ht1a', 'acetylcholine'],
    meds_anchor: ['dopamine_d2', 'norepinephrine'],
    dashboard_tinywin: ['dopamine_d2', 'norepinephrine'],
    global_breath: ['gaba', 'norepinephrine']

    // Legacy fallback prefixes still supported via prefix buckets below:
    // fallback_sleep_* etc.
  };

  if (exact[t]) return uniq(exact[t]);

  // Bucket/prefix mapping (robust, low-maintenance)

  // Mood family
  if (t === 'mood' || t.startsWith('mood_')) {
    // Mood: regulation + arousal + motivation + memory/attention
    return uniq(['dopamine_d2', 'serotonin_5ht1a', 'norepinephrine', 'gaba', 'acetylcholine']);
  }

  // Sleep family
  if (t === 'sleep' || t.startsWith('sleep_') || t.includes('circadian') || t.includes('bedtime') || t.includes('winddown')) {
    // Sleep: circadian timing + sleep pressure + wake modulation + REM/attention crossover
    return uniq(['melatonin', 'cortisol', 'adenosine_a2a', 'acetylcholine', 'histamine']);
  }

  // Meds family
  if (t === 'meds' || t.startsWith('meds_') || t.includes('medication') || t.includes('adherence') || t.includes('pill')) {
    // Meds: follow-through chemistry + routine stability
    return uniq(['dopamine_d2', 'norepinephrine']);
  }

  // Dashboard family (if you use dashboard_* tags)
  if (t === 'dashboard' || t.startsWith('dashboard_')) {
    return uniq(['dopamine_d2', 'norepinephrine']);
  }

  // Fallback family (scope-specific fallbacks) — legacy support
  if (t.startsWith('fallback_sleep')) return uniq(['melatonin', 'adenosine_a2a', 'cortisol', 'histamine']);
  if (t.startsWith('fallback_mood')) return uniq(['serotonin_5ht1a', 'gaba', 'norepinephrine', 'acetylcholine']);
  if (t.startsWith('fallback_meds')) return uniq(['dopamine_d2', 'norepinephrine']);
  if (t.startsWith('fallback_dashboard')) return uniq(['norepinephrine', 'dopamine_d2']);

  // Global family (if you use global_* tags)
  if (t === 'global' || t.startsWith('global_')) {
    return uniq(['gaba', 'norepinephrine']);
  }

  // Default: no chips
  return [];
}

/** Illustrative class motif for medication About headers (not per-drug structure). */
export type MedClassMotif =
  | 'ssri'
  | 'stimulant'
  | 'benzo'
  | 'opioid'
  | 'nsaid'
  | 'statin'
  | 'antipsychotic'
  | 'generic';

export function mapCatalogCategoryToMotif(
  category?: string | null,
  medicationClass?: string | null,
): MedClassMotif {
  const blob = `${category ?? ''} ${medicationClass ?? ''}`.toLowerCase();
  if (blob.includes('ssri') || blob.includes('snri') || blob.includes('antidepressant')) return 'ssri';
  if (blob.includes('stimulant') || blob.includes('adhd')) return 'stimulant';
  if (blob.includes('benzo')) return 'benzo';
  if (blob.includes('opioid') || blob.includes('analgesic')) return 'opioid';
  if (blob.includes('nsaid')) return 'nsaid';
  if (blob.includes('statin') || blob.includes('lipid')) return 'statin';
  if (blob.includes('antipsychotic')) return 'antipsychotic';
  return 'generic';
}
