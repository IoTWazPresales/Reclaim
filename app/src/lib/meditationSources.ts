// C:\Reclaim\app\src\lib\meditationSources.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MeditationType } from '@/lib/meditations';

/**
 * External providers we can infer from a URL.
 * Extend freely later.
 */
export type ExternalProvider =
  | 'youtube'
  | 'spotify'
  | 'soundcloud'
  | 'apple_podcasts'
  | 'web'
  | 'unknown';

/**
 * IMPORTANT:
 * Some parts of the app use kind: "script" (scriptId),
 * while older code used kind: "built_in" (type).
 *
 * We support BOTH shapes and normalize internally where needed.
 */
export type MeditationSource =
  | {
      kind: 'built_in';
      type: MeditationType;
    }
  | {
      kind: 'script';
      scriptId: MeditationType;
    }
  | {
      kind: 'audio';
      title: string;
      audioUrl: string;
      provider?: ExternalProvider;
      estMinutes?: number;
    }
  | {
      kind: 'external';
      title: string;
      url: string;
      provider?: ExternalProvider;
      estMinutes?: number;
    };

export type StoredExternalMeditation = {
  id: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  source: Extract<MeditationSource, { kind: 'external' | 'audio' }>;
};

const STORAGE_KEY = 'reclaim:meditationSources:v1';
const DEFAULT_SOURCE_KEY = 'reclaim:meditationDefaultSource:v1';

function nowISO() {
  return new Date().toISOString();
}

function uuid(): string {
  // good-enough uuid for local storage (no dependency)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    // eslint-disable-next-line no-mixed-operators
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Infer provider from a URL.
 */
export function inferProvider(inputUrl: string): ExternalProvider {
  const url = (inputUrl || '').toLowerCase();

  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('spotify.com')) return 'spotify';
  if (url.includes('soundcloud.com')) return 'soundcloud';
  if (url.includes('podcasts.apple.com')) return 'apple_podcasts';
  if (url.startsWith('http://') || url.startsWith('https://')) return 'web';

  return 'unknown';
}

/**
 * Human label fallback used in UI lists.
 */
export function labelForSource(src: MeditationSource): string {
  if (src.kind === 'external') return src.title;
  if (src.kind === 'audio') return src.title;
  if (src.kind === 'script') return String(src.scriptId).replace(/_/g, ' ');
  // built_in
  return String(src.type).replace(/_/g, ' ');
}

/**
 * Normalize:
 * - treat built_in as script (preferred)
 * - keep external/audio as-is
 */
export function normalizeMeditationSource(src: MeditationSource): MeditationSource {
  if (src.kind === 'built_in') {
    return { kind: 'script', scriptId: src.type };
  }
  return src;
}

/**
 * Serialize a MeditationSource for storage.
 * We store normalized form so the rest of the app can rely on kind:"script" where applicable.
 */
export function serializeMeditationSource(src: MeditationSource): string {
  return JSON.stringify(normalizeMeditationSource(src));
}

/**
 * Backward tolerant deserializer:
 * - supports current MeditationSource union
 * - supports older legacy "audio" objects
 * - supports older "external" objects missing provider/estMinutes
 * - supports legacy built_in { kind:"built_in", type:string }
 */
export function deserializeMeditationSource(raw: string): MeditationSource | null {
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object') return null;

    // script (preferred)
    if (obj.kind === 'script' && typeof obj.scriptId === 'string') {
      return { kind: 'script', scriptId: obj.scriptId as MeditationType };
    }

    // built_in (legacy / tolerated)
    if (obj.kind === 'built_in' && typeof obj.type === 'string') {
      // normalize to script so downstream code doesn't need both cases
      return { kind: 'script', scriptId: obj.type as MeditationType };
    }

    // audio (current)
    if (obj.kind === 'audio' && typeof obj.title === 'string' && typeof obj.audioUrl === 'string') {
      return {
        kind: 'audio',
        title: obj.title,
        audioUrl: obj.audioUrl,
        provider: typeof obj.provider === 'string' ? (obj.provider as ExternalProvider) : inferProvider(obj.audioUrl),
        estMinutes: typeof obj.estMinutes === 'number' ? obj.estMinutes : undefined,
      };
    }

    // audio (legacy: url instead of audioUrl)
    if (obj.kind === 'audio' && typeof obj.title === 'string' && typeof obj.url === 'string') {
      return {
        kind: 'audio',
        title: obj.title,
        audioUrl: obj.url,
        provider: typeof obj.provider === 'string' ? (obj.provider as ExternalProvider) : inferProvider(obj.url),
        estMinutes: typeof obj.estMinutes === 'number' ? obj.estMinutes : undefined,
      };
    }

    // external (current)
    if (obj.kind === 'external' && typeof obj.title === 'string' && typeof obj.url === 'string') {
      return {
        kind: 'external',
        title: obj.title,
        url: obj.url,
        provider: typeof obj.provider === 'string' ? (obj.provider as ExternalProvider) : inferProvider(obj.url),
        estMinutes: typeof obj.estMinutes === 'number' ? obj.estMinutes : undefined,
      };
    }

    return null;
  } catch {
    return null;
  }
}

async function readAll(): Promise<StoredExternalMeditation[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const out: StoredExternalMeditation[] = [];

    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;

      const id = typeof item.id === 'string' ? item.id : uuid();
      const createdAt = typeof item.createdAt === 'string' ? item.createdAt : nowISO();
      const updatedAt = typeof item.updatedAt === 'string' ? item.updatedAt : createdAt;

      // source may be stored as object or serialized string from older version
      let src: MeditationSource | null = null;

      if (item.source && typeof item.source === 'object') {
        src = normalizeMeditationSource(item.source as MeditationSource);
      } else if (typeof item.source === 'string') {
        src = deserializeMeditationSource(item.source);
      }

      // This storage is specifically for external/audio items
      if (src?.kind === 'external') {
        out.push({
          id,
          createdAt,
          updatedAt,
          source: {
            kind: 'external',
            title: src.title,
            url: src.url,
            provider: src.provider ?? inferProvider(src.url),
            estMinutes: src.estMinutes,
          },
        });
      } else if (src?.kind === 'audio') {
        out.push({
          id,
          createdAt,
          updatedAt,
          source: {
            kind: 'audio',
            title: src.title,
            audioUrl: src.audioUrl,
            provider: src.provider ?? inferProvider(src.audioUrl),
            estMinutes: src.estMinutes,
          },
        });
      }
    }

    return out.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  } catch {
    return [];
  }
}

async function writeAll(items: StoredExternalMeditation[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/**
 * Default meditation source used by auto-meditation triggers.
 */
export async function setDefaultMeditationSource(source: MeditationSource): Promise<void> {
  const normalized = normalizeMeditationSource(source);
  await AsyncStorage.setItem(DEFAULT_SOURCE_KEY, serializeMeditationSource(normalized));
}

/**
 * NOTE:
 * We always return the normalized shape (script/external/audio).
 * If an old build stored built_in, deserializer normalizes it to script.
 */
export async function getDefaultMeditationSource(): Promise<MeditationSource | null> {
  const raw = await AsyncStorage.getItem(DEFAULT_SOURCE_KEY);
  if (!raw) return null;
  return deserializeMeditationSource(raw);
}

/**
 * List everything stored by the external meditation library modal.
 */
export async function listExternalMeditations(): Promise<StoredExternalMeditation[]> {
  return readAll();
}

/**
 * Add an external URL meditation.
 * Matches what your modal wants: title + url (+ optional estMinutes/provider).
 */
export async function addExternalMeditation(input: {
  title: string;
  url: string;
  provider?: ExternalProvider;
  estMinutes?: number;
}): Promise<StoredExternalMeditation> {
  const title = (input.title || '').trim();
  const url = (input.url || '').trim();

  if (!title) throw new Error('Title is required.');
  if (!url) throw new Error('URL is required.');

  const provider = input.provider ?? inferProvider(url);
  const estMinutes = typeof input.estMinutes === 'number' ? input.estMinutes : undefined;

  const item: StoredExternalMeditation = {
    id: uuid(),
    createdAt: nowISO(),
    updatedAt: nowISO(),
    source: { kind: 'external', title, url, provider, estMinutes },
  };

  const all = await readAll();
  await writeAll([item, ...all]);

  return item;
}

/**
 * Optional: add an audio URL as an "audio" meditation.
 */
export async function addAudioMeditation(input: {
  title: string;
  audioUrl: string;
  provider?: ExternalProvider;
  estMinutes?: number;
}): Promise<StoredExternalMeditation> {
  const title = (input.title || '').trim();
  const audioUrl = (input.audioUrl || '').trim();

  if (!title) throw new Error('Title is required.');
  if (!audioUrl) throw new Error('Audio URL is required.');

  const provider = input.provider ?? inferProvider(audioUrl);
  const estMinutes = typeof input.estMinutes === 'number' ? input.estMinutes : undefined;

  const item: StoredExternalMeditation = {
    id: uuid(),
    createdAt: nowISO(),
    updatedAt: nowISO(),
    source: { kind: 'audio', title, audioUrl, provider, estMinutes },
  };

  const all = await readAll();
  await writeAll([item, ...all]);

  return item;
}

/**
 * Delete by id.
 */
export async function deleteExternalMeditation(id: string): Promise<void> {
  const all = await readAll();
  const next = all.filter((x) => x.id !== id);
  await writeAll(next);
}
