import { describe, it, expect, vi, beforeEach } from 'vitest';

const hcMocks = vi.hoisted(() => ({
  insertRecords: vi.fn().mockResolvedValue(['uuid-1']),
  requestPermission: vi.fn().mockResolvedValue([]),
  getGrantedPermissions: vi.fn().mockResolvedValue([{ accessType: 'write', recordType: 'ExerciseSession' }]),
  initialize: vi.fn().mockResolvedValue(true),
}));

vi.mock('react-native', () => ({
  Platform: { OS: 'android', Version: 33 },
}));

vi.mock('react-native-health-connect', () => ({
  initialize: hcMocks.initialize,
  requestPermission: hcMocks.requestPermission,
  getGrantedPermissions: hcMocks.getGrantedPermissions,
  insertRecords: hcMocks.insertRecords,
}));

vi.mock('@/lib/health/healthConnectService', () => ({
  healthConnectGetActiveEnergyForSessionWindow: vi.fn().mockResolvedValue({ activeCaloriesKcal: 312, source: 'health_connect' }),
  healthConnectGetHeartRateForSessionWindow: vi.fn().mockResolvedValue({ avgHeartRateBpm: 121, source: 'health_connect' }),
}));

import {
  markTrainingSessionStartForHealthConnect,
  writeTrainingExerciseSessionToHealthConnect,
  formatSessionHealthMetricsLine,
} from '@/lib/health/exerciseSessionWriter';

describe('exerciseSessionWriter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hcMocks.getGrantedPermissions.mockResolvedValue([{ accessType: 'write', recordType: 'ExerciseSession' }]);
  });

  it('marks session start and requests write permission once', async () => {
    await markTrainingSessionStartForHealthConnect();
    await markTrainingSessionStartForHealthConnect();
    expect(hcMocks.requestPermission).toHaveBeenCalledTimes(1);
  });

  it('writes ExerciseSessionRecord on finish when permitted', async () => {
    const result = await writeTrainingExerciseSessionToHealthConnect(
      '2026-07-04T10:00:00.000Z',
      '2026-07-04T11:00:00.000Z',
    );
    expect(hcMocks.insertRecords).toHaveBeenCalledWith([
      expect.objectContaining({
        recordType: 'ExerciseSession',
        exerciseType: 70,
        title: 'Reclaim strength training',
      }),
    ]);
    expect(result.wrote).toBe(true);
    expect(result.activeCaloriesKcal).toBe(312);
    expect(result.avgHeartRateBpm).toBe(121);
  });

  it('formats summary metrics line', () => {
    expect(
      formatSessionHealthMetricsLine({
        activeCaloriesKcal: 312,
        avgHeartRateBpm: 121,
        durationMinutes: 56,
        wroteExerciseSession: true,
      }),
    ).toBe(
      'Saved to Health Connect · Active calories (Health Connect): 312 kcal · avg HR 121 bpm · 56 min',
    );
  });
});
