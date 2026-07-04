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

export function primaryIntentForDiagram(intents: MovementIntent[]): MovementIntent {
  const order: MovementIntent[] = [
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
  ];
  for (const intent of order) {
    if (intents.includes(intent)) return intent;
  }
  return intents[0] ?? 'horizontal_press';
}

export function resolveExerciseCues(
  exerciseCues: string[] | undefined,
  intents: MovementIntent[],
): string[] {
  if (exerciseCues?.length) return exerciseCues.slice(0, 4);
  const primary = primaryIntentForDiagram(intents);
  return MOVEMENT_PATTERN_CUES[primary]?.slice(0, 4) ?? MOVEMENT_PATTERN_CUES.horizontal_press!.slice(0, 4);
}
