/**
 * Closed muscle-tag ontology for the weekly sets line.
 *
 * Display grouping only. It does not allocate weekly volume, change catalogue
 * strings, or change how `computeWeeklyMuscleSessionCounts` keys the isolation
 * bump. Fractional sets per muscle are N-0011.
 *
 * Evidence: docs/training/ROUTINE_AUDIT.md RA-008 (Core dropped because `core`
 * and `rectus_abdominis` were not in the private map), RA-021 (ontology drift),
 * and the catalogue snapshot of `exercises.v1.json`.
 *
 * `formatWeeklyMuscleSetLine` still adds one count per primary tag. Two
 * primaries that share a bucket add twice. That rule predates this module.
 */

export const VOLUME_BUCKET_ORDER = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core'] as const;

export type VolumeBucket = (typeof VOLUME_BUCKET_ORDER)[number];

export type MuscleTagClass =
  | { status: 'regional'; bucket: VolumeBucket }
  | { status: 'non_regional'; reason: 'conditioning' | 'whole_session' }
  | { status: 'unknown' };

type TagEntry =
  | { kind: 'regional'; bucket: VolumeBucket }
  | { kind: 'non_regional'; reason: 'conditioning' | 'whole_session' };

/**
 * Every token in `exercises.v1.json` musclesPrimary / musclesSecondary, plus
 * three historical names from the old private map that the catalogue does not
 * use (`posterior_deltoids`, `mid_traps`, `abs`).
 */
const MUSCLE_TAGS: Record<string, TagEntry> = {
  pectorals: { kind: 'regional', bucket: 'Chest' },
  lower_pectorals: { kind: 'regional', bucket: 'Chest' },
  upper_pectorals: { kind: 'regional', bucket: 'Chest' },
  serratus_anterior: { kind: 'regional', bucket: 'Chest' },

  lats: { kind: 'regional', bucket: 'Back' },
  rhomboids: { kind: 'regional', bucket: 'Back' },
  middle_traps: { kind: 'regional', bucket: 'Back' },
  mid_traps: { kind: 'regional', bucket: 'Back' },
  traps: { kind: 'regional', bucket: 'Back' },
  upper_traps: { kind: 'regional', bucket: 'Back' },
  upper_back: { kind: 'regional', bucket: 'Back' },
  erector_spinae: { kind: 'regional', bucket: 'Back' },

  anterior_deltoids: { kind: 'regional', bucket: 'Shoulders' },
  lateral_deltoids: { kind: 'regional', bucket: 'Shoulders' },
  rear_deltoids: { kind: 'regional', bucket: 'Shoulders' },
  posterior_deltoids: { kind: 'regional', bucket: 'Shoulders' },
  shoulders: { kind: 'regional', bucket: 'Shoulders' },

  biceps: { kind: 'regional', bucket: 'Arms' },
  triceps: { kind: 'regional', bucket: 'Arms' },
  brachialis: { kind: 'regional', bucket: 'Arms' },
  forearms: { kind: 'regional', bucket: 'Arms' },

  quadriceps: { kind: 'regional', bucket: 'Legs' },
  quads: { kind: 'regional', bucket: 'Legs' },
  hamstrings: { kind: 'regional', bucket: 'Legs' },
  glutes: { kind: 'regional', bucket: 'Legs' },
  calves: { kind: 'regional', bucket: 'Legs' },
  adductors: { kind: 'regional', bucket: 'Legs' },
  hip_adductors: { kind: 'regional', bucket: 'Legs' },
  hip_abductors: { kind: 'regional', bucket: 'Legs' },
  hip_flexors: { kind: 'regional', bucket: 'Legs' },
  legs: { kind: 'regional', bucket: 'Legs' },

  core: { kind: 'regional', bucket: 'Core' },
  rectus_abdominis: { kind: 'regional', bucket: 'Core' },
  obliques: { kind: 'regional', bucket: 'Core' },
  transverse_abdominis: { kind: 'regional', bucket: 'Core' },
  abs: { kind: 'regional', bucket: 'Core' },

  cardiovascular: { kind: 'non_regional', reason: 'conditioning' },
  full_body: { kind: 'non_regional', reason: 'whole_session' },
};

export function classifyMuscleTag(tag: string): MuscleTagClass {
  const entry = MUSCLE_TAGS[tag];
  if (!entry) return { status: 'unknown' };
  if (entry.kind === 'non_regional') {
    return { status: 'non_regional', reason: entry.reason };
  }
  return { status: 'regional', bucket: entry.bucket };
}

/** Regional display bucket, or null when the tag is non-regional or unknown. */
export function muscleVolumeBucket(tag: string): VolumeBucket | null {
  const classified = classifyMuscleTag(tag);
  return classified.status === 'regional' ? classified.bucket : null;
}
