/**
 * Pure routing for guided training notification deep-links → session UI.
 * Position comes from sessionWorkAuthority; this only chooses presentation.
 */

export type GuidedNotificationOverlayChoiceArgs = {
  action: 'set_done' | 'edit_set';
  fromRestNextSet?: boolean;
  /** DB performed includes the active work set (do not re-prompt Done). */
  isActiveSetAlreadyPerformed: boolean;
};

export type GuidedNotificationOverlayChoice = 'focus' | 'edit' | 'none';

export function guidedNotificationOverlayChoice(
  args: GuidedNotificationOverlayChoiceArgs,
): GuidedNotificationOverlayChoice {
  if (args.action === 'edit_set') return 'edit';
  if (args.isActiveSetAlreadyPerformed) return 'none';
  return 'focus';
}
