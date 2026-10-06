/**
 * A run has no lifting items (RUNNING_DESIGN.md RD-001).
 * That empty list is the session. Any other session with no current
 * item is still unresolved, and the session view holds a spinner.
 */
export function holdBlankSpinnerForMissingExercise(
  isRunSession: boolean,
  hasCurrentItem: boolean,
): boolean {
  return !hasCurrentItem && !isRunSession;
}
