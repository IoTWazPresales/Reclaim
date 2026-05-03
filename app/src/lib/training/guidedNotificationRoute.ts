/**
 * Pure routing for guided training notification deep-links → session UI.
 * Watch TRAINING_REST "Next set" is normalized to set_done; stale performed-set data
 * could otherwise open the edit dialog instead of SetFocusOverlay.
 */

export type GuidedNotificationOverlayChoiceArgs = {
  action: 'set_done' | 'edit_set';
  /** True when route came from TRAINING_REST NEXT_SET (TrainingScreen normalizes next_set → set_done). */
  fromRestNextSet?: boolean;
  /** Whether server/runtime already shows this set as logged (can lag vs watch). */
  isPerformed: boolean;
};

export type GuidedNotificationOverlayChoice = 'focus' | 'edit';

export function guidedNotificationOverlayChoice(
  args: GuidedNotificationOverlayChoiceArgs,
): GuidedNotificationOverlayChoice {
  if (args.action === 'edit_set') return 'edit';
  if (args.fromRestNextSet) return 'focus';
  return args.isPerformed ? 'edit' : 'focus';
}
