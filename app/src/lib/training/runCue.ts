/** Talk-test cue. RUNNING_DESIGN.md RD-002. No pace and no minute table. */
export function runStartCue(): { title: string; body: string } {
  return {
    title: 'Run',
    body: 'Keep a conversational effort. You should be able to talk. No pace is set.',
  };
}

export function runCueIntentKey(sessionId: string): string {
  return `training_run:${sessionId}`;
}
