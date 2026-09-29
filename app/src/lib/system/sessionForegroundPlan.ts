/**
 * Pure start/stop decision for the one Reclaim session foreground service.
 * Guided, mindfulness and meditation share that service. A second service is not allowed.
 * N-0042 may later add the location type to this same service.
 */

export type SessionForegroundDomain = 'guided' | 'mindfulness' | 'meditation';

export type SessionForegroundSnapshot = {
  running: boolean;
  domain: string | null;
  sessionId: string | null;
};

export type SessionForegroundStartPlan =
  | 'start'
  | 'already-running'
  | 'refuse-other-domain'
  | 'replace-own-session';

export function planSessionForegroundStart(
  self: SessionForegroundDomain,
  sessionId: string,
  snapshot: SessionForegroundSnapshot,
): SessionForegroundStartPlan {
  if (!snapshot.running) return 'start';
  if (snapshot.domain && snapshot.domain !== self) return 'refuse-other-domain';
  if (snapshot.sessionId === sessionId) return 'already-running';
  return 'replace-own-session';
}
