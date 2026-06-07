import { describe, it, expect } from 'vitest';
import {
  computeAdherenceSignals,
  computeMoodSignals,
  computeSleepSignals,
} from '../medDetailSignals';
import type { MedDoseRow } from '@/components/meds/medDetailTypes';

describe('medDetailSignals', () => {
  it('computeMoodSignals returns trend when enough data', () => {
    const now = new Date();
    const moods = Array.from({ length: 6 }, (_, i) => ({
      created_at: new Date(now.getTime() - i * 86400000).toISOString(),
      rating: i < 3 ? 2 : 4,
    }));
    const signals = computeMoodSignals(moods as any);
    expect(signals.latest).toBe(2);
    expect(signals.trend3dPct).toBeDefined();
  });

  it('computeSleepSignals marks sparse data when fewer than 3 days', () => {
    const signals = computeSleepSignals([]);
    expect(signals.sparseData).toBe(false);
    expect(signals.lastNightHours).toBeUndefined();
  });

  it('computeAdherenceSignals counts missed doses in 3d window', () => {
    const now = new Date();
    const logs: MedDoseRow[] = [
      {
        id: '1',
        med_id: 'm1',
        status: 'missed',
        scheduled_for: now.toISOString(),
      },
    ];
    const signals = computeAdherenceSignals(logs);
    expect(signals.missedDoses3d).toBe(1);
  });
});
