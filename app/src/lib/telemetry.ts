import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { sanitizeLogPayload } from './logSanitizer';

export type TelemetryEvent = {
  name: string;
  properties?: Record<string, any>;
  severity?: 'info' | 'warn' | 'error';
};

export async function logTelemetry(event: TelemetryEvent): Promise<void> {
  try {
    const sanitizedProperties = event.properties ? sanitizeLogPayload(event.properties) : {};
    
    await supabase.from('app_logs').insert({
      event_name: event.name,
      severity: event.severity ?? 'info',
      properties: sanitizedProperties,
    });
  } catch (error) {
    logger.warn('Telemetry insert failed', error);
  }
}

