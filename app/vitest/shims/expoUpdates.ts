/** Vitest shim — avoids loading native `expo-updates` in Node. */
export const channel: string | null = null;
export const runtimeVersion: string | null = null;
export const updateId: string | null = null;
export const isEmbeddedLaunch = false;
export const isEnabled = true;

export async function checkForUpdateAsync() {
  return { isAvailable: false } as const;
}

export async function fetchUpdateAsync() {
  return {};
}

export async function reloadAsync() {
  return undefined;
}
