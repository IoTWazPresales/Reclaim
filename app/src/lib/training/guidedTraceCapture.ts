/**
 * DEV-only in-memory ring buffer + optional AsyncStorage persistence for [GUIDED_TRACE] rows.
 * Does not emit logs; used by traceGuidedTransition after structured trace is built.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { isGuidedDevInstrumentationEnabled } from '@/lib/training/guidedDevInstrumentation';
import type { GuidedTracePayload } from '@/lib/training/guidedTransitionTrace';

export const GUIDED_TRACE_BUFFER_MAX = 350;

const STORAGE_KEY = '@reclaim/dev_guided_trace_v1';

let buffer: GuidedTracePayload[] = [];
let hydrated = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function mergeTraceBuffers(
  fromStorage: GuidedTracePayload[],
  inMemory: GuidedTracePayload[],
): GuidedTracePayload[] {
  const combined = [...fromStorage, ...inMemory];
  combined.sort((a, b) => a.ts.localeCompare(b.ts));
  const seen = new Set<string>();
  const deduped: GuidedTracePayload[] = [];
  for (const row of combined) {
    const k = JSON.stringify(row);
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(row);
  }
  return deduped.slice(-GUIDED_TRACE_BUFFER_MAX);
}

function schedulePersist(): void {
  if (!isGuidedDevInstrumentationEnabled()) return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void persistToStorage();
  }, 450);
}

async function persistToStorage(): Promise<void> {
  if (!isGuidedDevInstrumentationEnabled()) return;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(buffer));
  } catch {
    // ignore persistence failures (read-only / quota)
  }
}

/** Load persisted traces once and merge with any events captured before hydration completed. */
export async function hydrateGuidedTraceCaptureFromStorage(): Promise<void> {
  if (!isGuidedDevInstrumentationEnabled() || hydrated) return;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    let loaded: GuidedTracePayload[] = [];
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        loaded = parsed.filter((x): x is GuidedTracePayload => x != null && typeof x === 'object');
      }
    }
    buffer = mergeTraceBuffers(loaded, buffer);
  } catch {
    // ignore corrupt storage
  } finally {
    hydrated = true;
  }
}

export function appendGuidedTraceCapture(row: GuidedTracePayload): void {
  if (!isGuidedDevInstrumentationEnabled()) return;
  buffer.push(row);
  if (buffer.length > GUIDED_TRACE_BUFFER_MAX) {
    buffer = buffer.slice(-GUIDED_TRACE_BUFFER_MAX);
  }
  schedulePersist();
}

export function getGuidedTraceEvents(): GuidedTracePayload[] {
  return [...buffer];
}

export async function clearGuidedTraceEvents(): Promise<void> {
  buffer = [];
  hydrated = true;
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function formatGuidedTracesForExport(events: GuidedTracePayload[]): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      count: events.length,
      events,
    },
    null,
    2,
  );
}

/** Test-only reset — not used in production paths. */
export function __resetGuidedTraceCaptureForTests(): void {
  buffer = [];
  hydrated = false;
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
}
