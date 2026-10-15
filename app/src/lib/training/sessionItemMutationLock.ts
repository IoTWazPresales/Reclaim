/** Serialize replacement with canonical Done in this runtime, including notification actions. */
const pending = new Map<string, Promise<unknown>>();

export async function withSessionItemMutationLock<T>(itemId: string, work: () => Promise<T>): Promise<T> {
  const previous = pending.get(itemId) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(work);
  pending.set(itemId, next);
  try {
    return await next;
  } finally {
    if (pending.get(itemId) === next) pending.delete(itemId);
  }
}
