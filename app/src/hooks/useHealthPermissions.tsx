// C:\Reclaim\app\src\hooks\useHealthPermissions.ts
import { getUnifiedHealthService } from '@/lib/health';

/**
 * Ensure health permissions are granted using the unified health service.
 * Uses Apple HealthKit on iOS, Google Fit on Android.
 */
export async function ensureHealthPermissions() {
  const healthService = getUnifiedHealthService();
  const granted = await healthService.requestAllPermissions();
  if (!granted) {
    throw new Error('Health permissions not granted');
  }
}
