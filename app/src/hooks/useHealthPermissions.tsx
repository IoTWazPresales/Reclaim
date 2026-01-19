// C:\Reclaim\app\src\hooks\useHealthPermissions.ts
import { googleFitRequestPermissions } from '@/lib/health/googleFitService';

/**
 * Ensure health permissions are granted using the unified health service.
 * Uses Apple HealthKit on iOS, Google Fit on Android.
 */
export async function ensureHealthPermissions() {
  const granted = await googleFitRequestPermissions();
  if (!granted) {
    throw new Error('Health permissions not granted');
  }
}
