// Lightweight local gate using Expo's built-in storage
import * as SecureStore from 'expo-secure-store';

const KEY = 'reclaim_has_onboarded_v1';
export async function setHasOnboarded(v: boolean) {
  try { await SecureStore.setItemAsync(KEY, v ? '1' : '0'); } catch {}
}
export async function getHasOnboarded(): Promise<boolean> {
  try { return (await SecureStore.getItemAsync(KEY)) === '1'; } catch { return false; }
}
