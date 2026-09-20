export type StaleResumePrompt = 'unevaluated' | 'pending' | 'cleared';

/**
 * Header-clock origin after a stale prompt.
 * Resume starts a display bout from `now`. `started_at` is not rewritten.
 */
export function resolveDisplayClockOriginMs(args: {
  staleResumePrompt: StaleResumePrompt;
  displayBoutOriginMs: number | null;
  startedAtMs: number | null;
  nowMs: number;
  isEnded: boolean;
}): number | null {
  if (args.staleResumePrompt === 'unevaluated' || args.staleResumePrompt === 'pending') {
    return null;
  }
  if (args.displayBoutOriginMs != null) return args.displayBoutOriginMs;
  if (args.startedAtMs != null) return args.startedAtMs;
  return args.isEnded ? null : args.nowMs;
}

export function staleHeaderClockLabel(
  prompt: StaleResumePrompt,
  elapsedSeconds: number,
  formatTime: (seconds: number) => string,
): string {
  if (prompt === 'pending' || prompt === 'unevaluated') return 'Paused';
  return formatTime(elapsedSeconds);
}
