import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export type TelemetryEvent = {
  name: string;
  properties?: Record<string, any>;
  severity?: 'info' | 'warn' | 'error';
};

export async function logTelemetry(event: TelemetryEvent): Promise<void> {
  try {
    await supabase.from('app_logs').insert({
      event_name: event.name,
      severity: event.severity ?? 'info',
      properties: event.properties ?? {},
    });
  } catch (error) {
    logger.warn('Telemetry insert failed', error);
  }
}

