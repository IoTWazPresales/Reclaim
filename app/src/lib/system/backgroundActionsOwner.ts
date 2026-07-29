/**
 * Singleton ownership for react-native-background-actions.
 * Guided training and mindfulness/meditation must not steal each other's FGS blindly.
 */
export type BackgroundActionsOwner = 'none' | 'guided' | 'mindfulness' | 'meditation';

let owner: BackgroundActionsOwner = 'none';

export function getBackgroundActionsOwner(): BackgroundActionsOwner {
  return owner;
}

export function claimBackgroundActionsOwner(next: Exclude<BackgroundActionsOwner, 'none'>): void {
  owner = next;
}

export function releaseBackgroundActionsOwner(expected: Exclude<BackgroundActionsOwner, 'none'>): void {
  if (owner === expected) owner = 'none';
}

/** True when another domain already owns the FGS. */
export function isBackgroundActionsOwnedByOther(
  self: Exclude<BackgroundActionsOwner, 'none'>,
): boolean {
  return owner !== 'none' && owner !== self;
}
