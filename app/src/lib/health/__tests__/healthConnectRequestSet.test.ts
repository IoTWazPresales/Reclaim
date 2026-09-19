import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { HEALTH_CONNECT_DEFAULT_METRICS, HEALTH_CONNECT_FORBIDDEN_REQUEST_METRICS } from '@/lib/health/healthConnectMetrics';

const PLUGIN = path.resolve(__dirname, '../../../../plugins/withHealthConnectPermissions.js');

describe('Health Connect request-set vs plugin keep-set (N-0015)', () => {
  it('requests Steps and ActiveCalories that the plugin already declares', () => {
    expect(HEALTH_CONNECT_DEFAULT_METRICS).toContain('steps');
    expect(HEALTH_CONNECT_DEFAULT_METRICS).toContain('active_energy');
    expect(HEALTH_CONNECT_FORBIDDEN_REQUEST_METRICS.every((m) => !HEALTH_CONNECT_DEFAULT_METRICS.includes(m))).toBe(
      true,
    );

    const plugin = fs.readFileSync(PLUGIN, 'utf8');
    expect(plugin).toContain('android.permission.health.READ_STEPS');
    expect(plugin).toContain('android.permission.health.READ_ACTIVE_CALORIES_BURNED');
    expect(plugin).not.toMatch(/READ_RESTING_HEART_RATE/);
    expect(plugin).not.toMatch(/READ_HEART_RATE_VARIABILITY/);
    expect(plugin).not.toMatch(/TOTAL_CALORIES/);
  });
});
