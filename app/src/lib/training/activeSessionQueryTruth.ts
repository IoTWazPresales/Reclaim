/**
 * Resolve TrainingScreen's active-session query into a finite view state.
 * Settled empty/error must not keep the "Opening session…" spinner (AA-04 / N-0007).
 */

export const POST_SETUP_RECONCILE_MS = 4_000;

export type ActiveSessionQuerySlice = {
  status: 'pending' | 'error' | 'success';
  isError: boolean;
  data: { session?: unknown } | null | undefined;
};

export type ActiveSessionViewKind = 'none' | 'ready' | 'loading' | 'error' | 'missing';

export function resolveActiveSessionViewState(
  activeSessionId: string | null,
  query: ActiveSessionQuerySlice,
): ActiveSessionViewKind {
  if (!activeSessionId) return 'none';
  if (query.data?.session) return 'ready';
  if (query.isError || query.status === 'error') return 'error';
  if (query.status === 'success') return 'missing';
  return 'loading';
}

export function isPostSetupReconcileActive(
  setupJustCompletedAt: number | null,
  nowMs: number,
  windowMs: number = POST_SETUP_RECONCILE_MS,
): boolean {
  return setupJustCompletedAt !== null && nowMs - setupJustCompletedAt < windowMs;
}
