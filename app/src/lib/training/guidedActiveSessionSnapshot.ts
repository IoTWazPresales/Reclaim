/**
 * Minimal durable snapshot for guided training continuity (local SQLite blob mirror).
 * React remains the live UI runtime; this is a restore hint only.
 *
 * Next slice: read `loadGuidedActiveSessionSnapshot` at app/session startup, navigate when
 * snapshot.sessionId matches an in-progress session row and snapshot.updatedAt is newer than
 * any stale server cache — never overwrite fresher in-memory session state.
 */

export const GUIDED_ACTIVE_SESSION_SCHEMA_VERSION = 1 as const;

export type GuidedActiveSessionPhase = 'work' | 'rest';

export type GuidedActiveSessionSnapshot = {
  schemaVersion: typeof GUIDED_ACTIVE_SESSION_SCHEMA_VERSION;
  sessionId: string;
  sessionItemId: string | null;
  exerciseId: string | null;
  exerciseName: string | null;
  currentExerciseIndex: number;
  currentSetIndex: number;
  phase: GuidedActiveSessionPhase;
  restStartedAtIso: string | null;
  restEndsAtIso: string | null;
  /** Seconds remaining when persisted; null if not in rest or unknown */
  restSecondsRemaining: number | null;
  notificationMode: 'guided';
  /** Monotonic ISO time for comparing freshness vs in-memory state on restore */
  updatedAt: string;
};

export type BuildGuidedActiveSessionSnapshotArgs = {
  sessionId: string;
  currentItem: { id: string; exercise_id: string } | null;
  exerciseName: string | null;
  uiExerciseIndex: number;
  currentSetIndex: number;
  phase: GuidedActiveSessionPhase;
  restTotalSeconds: number | null;
  restRemainingSeconds: number | null;
  restPaused: boolean;
};

export function buildGuidedActiveSessionSnapshot(
  args: BuildGuidedActiveSessionSnapshotArgs,
): GuidedActiveSessionSnapshot {
  const now = Date.now();
  const updatedAt = new Date(now).toISOString();

  let restStartedAtIso: string | null = null;
  let restEndsAtIso: string | null = null;
  let restSecondsRemaining: number | null = null;

  if (
    args.phase === 'rest' &&
    args.restTotalSeconds != null &&
    args.restRemainingSeconds != null &&
    !args.restPaused
  ) {
    const total = Math.max(0, args.restTotalSeconds);
    const remaining = Math.max(0, Math.floor(args.restRemainingSeconds));
    const elapsed = Math.max(0, total - remaining);
    restStartedAtIso = new Date(now - elapsed * 1000).toISOString();
    restEndsAtIso = new Date(now + remaining * 1000).toISOString();
    restSecondsRemaining = remaining;
  } else if (args.phase === 'rest' && args.restPaused && args.restRemainingSeconds != null) {
    restSecondsRemaining = Math.max(0, Math.floor(args.restRemainingSeconds));
  }

  return {
    schemaVersion: GUIDED_ACTIVE_SESSION_SCHEMA_VERSION,
    sessionId: args.sessionId,
    sessionItemId: args.currentItem?.id ?? null,
    exerciseId: args.currentItem?.exercise_id ?? null,
    exerciseName: args.exerciseName,
    currentExerciseIndex: Math.max(0, args.uiExerciseIndex),
    currentSetIndex: Math.max(1, args.currentSetIndex),
    phase: args.phase,
    restStartedAtIso,
    restEndsAtIso,
    restSecondsRemaining,
    notificationMode: 'guided',
    updatedAt,
  };
}

function isIsoLike(s: string): boolean {
  return Number.isFinite(Date.parse(s));
}

/** Strict parse for SQLite blob payloads; returns null if corrupt or wrong version. */
export function parseGuidedActiveSessionSnapshot(raw: unknown): GuidedActiveSessionSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;

  if (o.schemaVersion !== GUIDED_ACTIVE_SESSION_SCHEMA_VERSION) return null;
  if (typeof o.sessionId !== 'string' || !o.sessionId.trim()) return null;

  if (o.sessionItemId != null && typeof o.sessionItemId !== 'string') return null;
  if (o.exerciseId != null && typeof o.exerciseId !== 'string') return null;
  if (o.exerciseName != null && typeof o.exerciseName !== 'string') return null;

  if (typeof o.currentExerciseIndex !== 'number' || !Number.isFinite(o.currentExerciseIndex)) return null;
  if (o.currentExerciseIndex < 0 || o.currentExerciseIndex > 10_000) return null;

  if (typeof o.currentSetIndex !== 'number' || !Number.isFinite(o.currentSetIndex)) return null;
  if (o.currentSetIndex < 1 || o.currentSetIndex > 10_000) return null;

  if (o.phase !== 'work' && o.phase !== 'rest') return null;

  if (o.restStartedAtIso != null && (typeof o.restStartedAtIso !== 'string' || !isIsoLike(o.restStartedAtIso))) {
    return null;
  }
  if (o.restEndsAtIso != null && (typeof o.restEndsAtIso !== 'string' || !isIsoLike(o.restEndsAtIso))) {
    return null;
  }
  if (
    o.restSecondsRemaining != null &&
    (typeof o.restSecondsRemaining !== 'number' || !Number.isFinite(o.restSecondsRemaining))
  ) {
    return null;
  }

  if (o.notificationMode !== 'guided') return null;

  if (typeof o.updatedAt !== 'string' || !isIsoLike(o.updatedAt)) return null;

  return {
    schemaVersion: GUIDED_ACTIVE_SESSION_SCHEMA_VERSION,
    sessionId: o.sessionId,
    sessionItemId: (o.sessionItemId as string) ?? null,
    exerciseId: (o.exerciseId as string) ?? null,
    exerciseName: (o.exerciseName as string) ?? null,
    currentExerciseIndex: o.currentExerciseIndex,
    currentSetIndex: o.currentSetIndex,
    phase: o.phase,
    restStartedAtIso: (o.restStartedAtIso as string) ?? null,
    restEndsAtIso: (o.restEndsAtIso as string) ?? null,
    restSecondsRemaining: (o.restSecondsRemaining as number) ?? null,
    notificationMode: 'guided',
    updatedAt: o.updatedAt,
  };
}
