import type { MovementIntent } from './types';

/** Pattern-level cue fallbacks when an exercise has no catalog `cues`. */
export const MOVEMENT_PATTERN_CUES: Partial<Record<MovementIntent, string[]>> = {
  knee_dominant: [
    'Brace your core; feet shoulder-width.',
    'Sit hips back and down; knees track over toes.',
    'Drive through mid-foot to stand.',
    'Breathe out on the way up.',
  ],
  hip_hinge: [
    'Soft knees; hinge from hips, not lower back.',
    'Keep a long spine; chest proud.',
    'Feel tension in hamstrings at the bottom.',
    'Squeeze glutes to finish each rep.',
  ],
  horizontal_press: [
    'Retract shoulder blades into the bench.',
    'Lower with control to mid-chest.',
    'Press up and slightly together.',
    'Keep wrists stacked over elbows.',
  ],
  vertical_press: [
    'Ribs down; glutes lightly engaged.',
    'Press overhead without arching the low back.',
    'Bar or bells travel in a slight arc.',
    'Lock out with biceps by ears.',
  ],
  horizontal_pull: [
    'Lead with the elbow; squeeze shoulder blades.',
    'Keep torso still — no rocking.',
    'Pull to lower ribs or hip crease.',
    'Control the return; full stretch.',
  ],
  vertical_pull: [
    'Depress shoulders before you pull.',
    'Drive elbows down and slightly back.',
    'Chin or chest to bar without neck crunch.',
    'Lower slowly to a dead hang.',
  ],
  elbow_flexion: [
    'Elbows stay pinned at your sides.',
    'Curl through full range — no swing.',
    'Squeeze at the top; lower under control.',
    'Keep wrists neutral.',
  ],
  elbow_extension: [
    'Lock upper arms in place.',
    'Extend fully without flaring elbows.',
    'Control the eccentric.',
    'Breathe steadily — no breath-holding.',
  ],
  trunk_stability: [
    'Brace like someone might poke your stomach.',
    'Move only where the exercise allows.',
    'Keep hips and shoulders square.',
    'Exhale on effort; never hold your breath.',
  ],
  shoulder_isolation: [
    'Light weight; strict form over load.',
    'Raise to shoulder height, not higher.',
    'Pause briefly at the top.',
    'Lower with control — no momentum.',
  ],
  carry: [
    'Stand tall; shoulders away from ears.',
    'Walk with short, controlled steps.',
    'Brace core throughout the carry.',
    'Breathe normally; do not rush.',
  ],
  conditioning: [
    'Start smooth — build pace gradually.',
    'Land softly; stay relaxed in the shoulders.',
    'Find a rhythm you can hold.',
    'Cool down before you stop completely.',
  ],
};

/** Poses the stick figure can draw. The first catalog intent in this set is the movement. */
const DIAGRAM_INTENTS: ReadonlySet<MovementIntent> = new Set([
  'knee_dominant',
  'hip_hinge',
  'horizontal_press',
  'vertical_press',
  'horizontal_pull',
  'vertical_pull',
  'trunk_stability',
  'carry',
  'elbow_flexion',
  'elbow_extension',
  'shoulder_isolation',
  'conditioning',
]);

/**
 * The diagram follows the exercise's first drawable movement intent.
 * A name guess is only the fallback when the catalog did not supply one.
 * Reordering intents, or letting "row" / "raise" / "bench" override the catalog,
 * drew a different movement than the exercise.
 */
export function primaryIntentForDiagram(
  intents: MovementIntent[],
  exerciseName?: string | null,
  exerciseId?: string | null,
): MovementIntent {
  const fromCatalog = intents.find((intent) => DIAGRAM_INTENTS.has(intent));
  if (fromCatalog) return fromCatalog;
  return inferIntentFromExerciseLabel(exerciseName, exerciseId) ?? 'horizontal_press';
}

/**
 * Name / id fallback when an exercise has no drawable catalog intent.
 * Specific names come before broad tokens (`row`, `raise`, `bench`, `dip`).
 */
export function inferIntentFromExerciseLabel(
  name?: string | null,
  id?: string | null,
): MovementIntent | null {
  const hay = `${id ?? ''} ${name ?? ''}`.toLowerCase();
  if (!hay.trim()) return null;
  if (/\b(glute[-_\s]?ham|ghr|nordic)\b/.test(hay)) return 'hip_hinge';
  if (/\b(hanging[-_\s]?leg[-_\s]?raises?|leg[-_\s]?raises?|knee[-_\s]?raises?)\b/.test(hay)) {
    return 'trunk_stability';
  }
  if (/\bupright[-_\s]?rows?\b/.test(hay)) return 'vertical_press';
  if (/\b(farmer|suitcase|sandbag|yoke|waiter)\b/.test(hay)) return 'carry';
  if (/\b(squats?|lunges?|split[-_\s]?squats?|step[-_\s]?ups?|leg[-_\s]?press|goblet|sled[-_\s]?push)\b/.test(hay)) {
    return 'knee_dominant';
  }
  if (/\b(deadlifts?|rdl|romanian|good[-_\s]?mornings?|hip[-_\s]?thrusts?|kettlebell[-_\s]?swings?|hinge)\b/.test(hay)) {
    return 'hip_hinge';
  }
  if (/\b(dips?|skull[-_\s]?crushers?|pushdowns?)\b/.test(hay)) return 'elbow_extension';
  if (/\b(bench|push[-_\s]?ups?|chest[-_\s]?press|floor[-_\s]?press)\b/.test(hay)) return 'horizontal_press';
  if (/\b(overhead[-_\s]?press|ohp|military[-_\s]?press|shoulder[-_\s]?press|push[-_\s]?press|arnold)\b/.test(hay)) {
    return 'vertical_press';
  }
  if (/\b(rowing|rowers?|ellipticals?|assault[-_\s]?bikes?)\b/.test(hay)) return 'conditioning';
  if (/\b(rows?|face[-_\s]?pulls?|chest[-_\s]?supported|renegade)\b/.test(hay)) return 'horizontal_pull';
  if (/\b(pull[-_\s]?ups?|chin[-_\s]?ups?|lat[-_\s]?pulldowns?|pulldowns?)\b/.test(hay)) return 'vertical_pull';
  if (/\b(curls?|biceps?)\b/.test(hay) && !/\b(leg|nordic|ham)\b/.test(hay)) return 'elbow_flexion';
  if (/\b(triceps?|extensions?)\b/.test(hay) && !/\b(hip|leg|back)\b/.test(hay)) return 'elbow_extension';
  if (/\b(planks?|pallof|dead[-_\s]?bugs?|bird[-_\s]?dogs?)\b/.test(hay)) return 'trunk_stability';
  if (
    /\b(lateral[-_\s]?raises?|front[-_\s]?raises?|rear[-_\s]?delts?|flyes?|flys?)\b/.test(hay) &&
    !/\b(deadlift|calf)\b/.test(hay)
  ) {
    return 'shoulder_isolation';
  }
  if (/\b(jump[-_\s]?ropes?|burpees?|battle[-_\s]?ropes?|cardio)\b/.test(hay)) return 'conditioning';
  return null;
}

export function resolveExerciseCues(
  exerciseCues: string[] | undefined,
  intents: MovementIntent[],
  exerciseName?: string | null,
  exerciseId?: string | null,
): string[] {
  if (exerciseCues?.length) return exerciseCues.slice(0, 4);
  const primary = primaryIntentForDiagram(intents, exerciseName, exerciseId);
  return MOVEMENT_PATTERN_CUES[primary]?.slice(0, 4) ?? MOVEMENT_PATTERN_CUES.horizontal_press!.slice(0, 4);
}
