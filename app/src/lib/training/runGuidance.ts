/**
 * Run session length. RUNNING_DESIGN.md RD-006.
 * Garber et al. 2011: vigorous work on the order of 20 minutes,
 * moderate work on the order of 30 minutes. Not a pace and not a heart-rate zone.
 */
export function runTargetMinutes(weekIndex: number | undefined): number {
  if (weekIndex === 3 || weekIndex === 4) return 30;
  return 20;
}

export function runPhaseCue(phase: 'ready' | 'running' | 'walking' | 'paused'): string {
  if (phase === 'walking') {
    return 'Walk until you can speak a sentence. Then run again.';
  }
  if (phase === 'running') {
    return 'Speak a sentence. If you cannot, walk.';
  }
  if (phase === 'paused') {
    return 'Paused. Resume when you are ready.';
  }
  return 'Start when you are ready. Keep a conversational effort. No pace is set.';
}
