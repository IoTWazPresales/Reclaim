import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { logTelemetry } from '@/lib/telemetry';
import { requestPlayIntegrityToken, isPlayIntegritySupported } from './native';

export type PlayIntegrityMonitorResult = {
  ok: boolean;
  reason?: string;
  summary?: Record<string, unknown>;
};

function buildNonce() {
  const randomPart =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const raw = `reclaim-${Platform.OS}-${Date.now()}-${randomPart}`;
  // Keep nonce URL-safe for Play Integrity request and within limits.
  return raw.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 500);
}

export async function runPlayIntegrityMonitor(): Promise<PlayIntegrityMonitorResult> {
  if (Platform.OS !== 'android') {
    return { ok: false, reason: 'non_android' };
  }
  if (!isPlayIntegritySupported()) {
    await logTelemetry({
      name: 'play_integrity_monitor',
      severity: 'warn',
      properties: { status: 'unsupported_native_module' },
      tags: ['play-integrity'],
    });
    return { ok: false, reason: 'unsupported_native_module' };
  }

  const nonce = buildNonce();
  const requestHash = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    const integrityToken = await requestPlayIntegrityToken(nonce);
    const { data, error } = await supabase.functions.invoke('verify-play-integrity', {
      body: { integrityToken, nonce, requestHash },
    });

    if (error) {
      await logTelemetry({
        name: 'play_integrity_monitor',
        severity: 'warn',
        properties: {
          status: 'edge_function_error',
          message: error.message,
        },
        tags: ['play-integrity'],
      });
      return { ok: false, reason: 'edge_function_error' };
    }

    const summary = (data?.summary ?? {}) as Record<string, unknown>;
    await logTelemetry({
      name: 'play_integrity_monitor',
      properties: {
        status: 'ok',
        summary,
        monitorOnly: true,
      },
      tags: ['play-integrity'],
    });
    return { ok: true, summary };
  } catch (error: any) {
    await logTelemetry({
      name: 'play_integrity_monitor',
      severity: 'warn',
      properties: {
        status: 'request_failed',
        message: error?.message ?? String(error),
      },
      tags: ['play-integrity'],
    });
    return { ok: false, reason: 'request_failed' };
  }
}

