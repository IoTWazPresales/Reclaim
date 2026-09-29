/** Identity of one notification intent write. Legacy rows may lack revision. */
export type PromptIdentity = {
  revision?: string;
  issuedAt?: string;
  scheduledAt?: string;
};

export function promptIdentityFromIntent(
  intent: { revision?: string; data?: Record<string, unknown> } | null | undefined,
): PromptIdentity | null {
  if (!intent) return null;
  const data = intent.data ?? {};
  const issuedAt = typeof data.issuedAt === 'string' ? data.issuedAt : undefined;
  const scheduledAt = typeof data.scheduledAt === 'string' ? data.scheduledAt : undefined;
  return { revision: intent.revision, issuedAt, scheduledAt };
}

export function samePromptIdentity(
  before: PromptIdentity | null,
  after: PromptIdentity | null,
): boolean {
  if (!before || !after) return false;
  if (before.revision !== undefined || after.revision !== undefined) {
    return before.revision !== undefined && before.revision === after.revision;
  }
  return typeof before.issuedAt === 'string'
    && before.issuedAt.length > 0
    && before.issuedAt === after.issuedAt
    && before.scheduledAt === after.scheduledAt;
}

/**
 * A timed completion may dismiss the now-slot only when that slot is still the
 * prompt captured before the await. A newer prompt is left alone. A slot that
 * was cleared may still be dismissed, because there is no newer prompt to hide.
 */
export function shouldDismissNowSlotAfterTimedDelivery(
  before: PromptIdentity | null,
  after: PromptIdentity | null,
): boolean {
  if (after && !samePromptIdentity(before, after)) return false;
  return before != null;
}
