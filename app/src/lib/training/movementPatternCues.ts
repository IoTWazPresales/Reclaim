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

export function primaryIntentForDiagram(
  intents: MovementIntent[],
  exerciseName?: string | null,
  exerciseId?: string | null,
): MovementIntent {
  const fromName = inferIntentFromExerciseLabel(exerciseName, exerciseId);
  if (fromName) return fromName;

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

/** Keyword / id heuristics so stick diagrams match the exercise, not a stale primary intent. */
export function inferIntentFromExerciseLabel(
  name?: string | null,
  id?: string | null,
): MovementIntent | null {
  const hay = `${id ?? ''} ${name ?? ''}`.toLowerCase();
  if (!hay.trim()) return null;
  if (/\b(squat|lunge|split squat|step.?up|leg press)\b/.test(hay)) return 'knee_dominant';
  if (/\b(deadlift|rdl|romanian|good morning|hip thrust|kettlebell swing)\b/.test(hay)) return 'hip_hinge';
  if (/\b(bench|push.?up|chest press|floor press|dip)\b/.test(hay)) return 'horizontal_press';
  if (/\b(overhead press|ohp|military press|shoulder press|push press)\b/.test(hay)) return 'vertical_press';
  if (/\b(row|face pull|seated row|chest.?supported)\b/.test(hay)) return 'horizontal_pull';
  if (/\b(pull.?up|chin.?up|lat pulldown|pulldown)\b/.test(hay)) return 'vertical_pull';
  if (/\b(curl|bicep)\b/.test(hay)) return 'elbow_flexion';
  if (/\b(tricep|skull.?crusher|pushdown|extension)\b/.test(hay) && !/\b(hip|leg)\b/.test(hay)) {
    return 'elbow_extension';
  }
  if (/\b(plank|pallof|dead bug|bird dog|carry|farmer)\b/.test(hay)) return 'trunk_stability';
  if (/\b(farmer|suitcase carry|yoke)\b/.test(hay)) return 'carry';
  if (/\b(lateral raise|rear delt|fly)\b/.test(hay)) return 'shoulder_isolation';
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
