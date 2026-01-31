import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { sanitizeLogPayload } from './logSanitizer';

export type TelemetryEvent = {
  name: string;
  properties?: Record<string, any>;
  severity?: 'info' | 'warn' | 'error';
  /** Optional tag or tags array for observability (e.g. "SYNC_ENGINE" or ["APP_BOOT", "NOTIF_RECON"]) */
  tags?: string | string[];
};

export async function logTelemetry(event: TelemetryEvent): Promise<void> {
  try {
    const baseProps = event.properties ? sanitizeLogPayload(event.properties) : {};
    const tags = event.tags
      ? Array.isArray(event.tags)
        ? event.tags
        : [event.tags]
      : [];
    const sanitizedProperties = tags.length > 0 ? { ...baseProps, _tags: tags } : baseProps;
    
    await supabase.from('app_logs').insert({
      event_name: event.name,
      severity: event.severity ?? 'info',
      properties: sanitizedProperties,
    });
  } catch (error) {
    logger.warn('Telemetry insert failed', error);
  }
}

