/** Shared identity for N-0030 high-fidelity Design Lab. Not production theme. */
export const LUMEN = {
  page: '#0B1220',
  surface: '#1A2742',
  raised: '#1E3150',
  line: 'rgba(114, 215, 216, 0.28)',
  text: '#E8EEF7',
  muted: '#8BA0B8',
  teal: '#72d7d8',
  onTeal: '#0B1220',
  mood: '#e6afe0',
  sleep: '#69d6ef',
  training: '#ffaf76',
  meds: '#73dbc0',
  insights: '#c4b5fd',
} as const;

export const PULSE = {
  ...LUMEN,
  page: '#070B14',
  surface: '#10182A',
} as const;
