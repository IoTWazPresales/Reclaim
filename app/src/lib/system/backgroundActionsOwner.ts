/**
 * In-memory owner of the one Reclaim session foreground service.
 * Guided training, mindfulness and meditation share that service and must not steal it.
 * Native state is authoritative after a JS reload; this flag only avoids a same-process clash.
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
