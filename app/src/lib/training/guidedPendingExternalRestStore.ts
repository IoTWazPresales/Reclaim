/**
 * Durable pending guided SET_DONE → rest UI transition.
 * Survives navRef-not-ready and process wake after Wear Done.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/logger';
import type { GuidedExternalSetDonePayload } from '@/lib/training/guidedExternalSetDoneTransition';

const STORE_KEY = '@reclaim/training/pendingGuidedExternalRest';
const TTL_MS = 6 * 60 * 60 * 1000;

type StoreShape = Record<string, GuidedExternalSetDonePayload & { savedAtMs: number }>;

async function loadStore(): Promise<StoreShape> {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    const now = Date.now();
    const out: StoreShape = {};
    for (const [sessionId, entry] of Object.entries(parsed as StoreShape)) {
      if (!entry?.savedAtMs || now - entry.savedAtMs > TTL_MS) continue;
      out[sessionId] = entry;
    }
    return out;
  } catch {
    return {};
  }
}

async function saveStore(store: StoreShape): Promise<void> {
  try {
    await AsyncStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch (e) {
    logger.warn('[GUIDED_PENDING_REST] save failed', e);
  }
}

export async function savePendingGuidedExternalRest(
  sessionId: string,
  payload: GuidedExternalSetDonePayload,
): Promise<void> {
  const store = await loadStore();
  store[sessionId] = { ...payload, savedAtMs: Date.now() };
  await saveStore(store);
  logger.debug('[GUIDED_PENDING_REST] saved', {
    sessionId,
    idempotencyKey: payload.idempotencyKey,
    restSeconds: payload.restSecondsAfterCompleted,
  });
}

export async function takePendingGuidedExternalRest(
  sessionId: string,
): Promise<GuidedExternalSetDonePayload | null> {
  const store = await loadStore();
  const entry = store[sessionId];
  if (!entry) return null;
  delete store[sessionId];
  await saveStore(store);
  const { savedAtMs: _s, ...payload } = entry;
  return payload;
}

export async function clearPendingGuidedExternalRest(sessionId: string): Promise<void> {
  const store = await loadStore();
  if (!(sessionId in store)) return;
  delete store[sessionId];
  await saveStore(store);
}
