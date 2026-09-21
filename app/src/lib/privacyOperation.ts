/** A short-lived exclusion boundary, not another auth/session source of truth. */
let owner: string | null = null;
const listeners = new Set<() => void>();

export class PrivacyIdentityChangedError extends Error {
  constructor() { super('The active account changed; its device data and sign-in details were preserved.'); }
}

export const getPrivacyOperationOwner = (): string | null => owner;
export function subscribePrivacyOperation(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function beginPrivacyOperation(userId: string): () => void {
  if (!userId) throw new Error('No account was selected. Please sign in and try again.');
  if (owner) throw new Error('A data request is already in progress. Please wait.');
  owner = userId;
  listeners.forEach(listener => listener());
  let released = false;
  return () => {
    if (released) return;
    released = true;
    owner = null;
    listeners.forEach(listener => listener());
  };
}

export function assertAuthIdentityMayPersist(userId: string | undefined): void {
  if (owner && userId !== owner) {
    throw new Error('Please wait for the current data request to finish before signing in.');
  }
}
