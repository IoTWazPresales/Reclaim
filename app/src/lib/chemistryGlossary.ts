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
  | 'acetylcholine';

export type ChemistryGlossaryEntry = {
  id: ChemistryTag;
  name: string;
  description: string;
};

export const CHEMISTRY_GLOSSARY: Record<ChemistryTag, ChemistryGlossaryEntry> = {
  dopamine_d2: {
    id: 'dopamine_d2',
    name: 'Dopamine D2',
    description: 'D2 receptor modulates motivation, reward, and movement. Low D2 tone can dampen drive and pleasure.',
  },
  serotonin_5ht1a: {
    id: 'serotonin_5ht1a',
    name: 'Serotonin 5-HT1A',
    description: '5-HT1A receptor helps regulate mood stability and anxiety. Steady activation supports emotional balance.',
  },
  adenosine_a2a: {
    id: 'adenosine_a2a',
    name: 'Adenosine A2A',
    description: 'A2A receptor builds during wakefulness, promoting sleep pressure. Caffeine blocks A2A to reduce drowsiness.',
  },
  melatonin: {
    id: 'melatonin',
    name: 'Melatonin',
    description: 'Hormone released by the pineal gland in darkness, signaling the body to prepare for sleep.',
  },
  cortisol: {
    id: 'cortisol',
    name: 'Cortisol',
    description: 'Stress hormone that follows a daily rhythm. Morning peaks help wakefulness; evening dips support sleep.',
  },
  mg: {
    id: 'mg',
    name: 'Magnesium',
    description: 'Mineral that supports GABA activity and muscle relaxation. Low levels may increase stress sensitivity.',
  },
  fe: {
    id: 'fe',
    name: 'Iron',
    description: 'Essential for oxygen transport and dopamine synthesis. Deficiency can reduce energy and motivation.',
  },
  gaba: {
    id: 'gaba',
    name: 'GABA',
    description: 'Primary inhibitory neurotransmitter. Enhances relaxation and reduces anxiety when activated.',
  },
  norepinephrine: {
    id: 'norepinephrine',
    name: 'Norepinephrine',
    description: 'Arousal and alertness neurotransmitter. Balanced levels support focus; excess can cause anxiety.',
  },
  acetylcholine: {
    id: 'acetylcholine',
    name: 'Acetylcholine',
    description: 'Neurotransmitter for attention, learning, and memory. Active during wakefulness and REM sleep.',
  },
};

export function getTagForInsight(sourceTag: string): ChemistryTag[] {
  const tagMap: Record<string, ChemistryTag[]> = {
    'sleep_serotonin': ['serotonin_5ht1a', 'melatonin'],
    'mood_dopamine': ['dopamine_d2'],
    'sleep_circadian': ['melatonin', 'cortisol', 'adenosine_a2a'],
    'activity_endorphins': ['dopamine_d2'],
    'meds_adherence': [],
    'sleep_inertia': ['adenosine_a2a', 'cortisol'],
    'social_buffer': ['norepinephrine'],
    'breath_vagal': ['gaba', 'norepinephrine'],
  };
  return tagMap[sourceTag] ?? [];
}

