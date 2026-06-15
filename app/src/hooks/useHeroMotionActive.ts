/**
 * Whether hero Skia/Reanimated loops should run (focused, in view, motion allowed).
 */
export function useHeroMotionActive(options: {
  screenFocused?: boolean;
  reduceMotion?: boolean;
  inView?: boolean;
}): boolean {
  const { screenFocused = true, reduceMotion = false, inView = true } = options;
  return screenFocused && !reduceMotion && inView;
}
