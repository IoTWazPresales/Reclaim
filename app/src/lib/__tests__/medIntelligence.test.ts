// C:\Reclaim\app\src\lib\__tests__\medIntelligence.test.ts

import { describe, it, expect } from 'vitest';
import { computeMedContextNotes, confidenceLabel, type MedContextInput } from '../medIntelligence';

describe('medIntelligence', () => {
  describe('computeMedContextNotes', () => {
    it('should trigger stress note when mood.latest is low', () => {
      const input: MedContextInput = {
        medName: 'Sertraline',
        mood: {
          latest: 2,
        },
      };

      const notes = computeMedContextNotes(input);
      expect(notes.length).toBeGreaterThan(0);
      const stressNote = notes.find(n => n.id === 'stress_mood');
      expect(stressNote).toBeDefined();
      expect(stressNote?.reasons).toContain('mood_latest_low');
    });

    it('should trigger stress note when tags include stressed', () => {
      const input: MedContextInput = {
        medName: 'Sertraline',
        mood: {
          tags: ['stressed', 'anxious'],
        },
      };

      const notes = computeMedContextNotes(input);
      expect(notes.length).toBeGreaterThan(0);
      const stressNote = notes.find(n => n.id === 'stress_mood');
      expect(stressNote).toBeDefined();
      expect(stressNote?.reasons).toContain('stress_tag_present');
    });

    it('should trigger stress note when flags.stress is true', () => {
      const input: MedContextInput = {
        medName: 'Sertraline',
        flags: {
          stress: true,
        },
      };

      const notes = computeMedContextNotes(input);
      expect(notes.length).toBeGreaterThan(0);
      const stressNote = notes.find(n => n.id === 'stress_mood');
      expect(stressNote).toBeDefined();
      expect(stressNote?.reasons).toContain('stress_flag');
    });

    it('should trigger stress note when mood trend is down', () => {
      const input: MedContextInput = {
        medName: 'Sertraline',
        mood: {
          trend3dPct: -15,
        },
      };

      const notes = computeMedContextNotes(input);
      expect(notes.length).toBeGreaterThan(0);
      const stressNote = notes.find(n => n.id === 'stress_mood');
      expect(stressNote).toBeDefined();
      expect(stressNote?.reasons).toContain('mood_trend_down');
    });

    it('should reduce confidence when mood triggered only by tags', () => {
      const input: MedContextInput = {
        medName: 'Sertraline',
        mood: {
          tags: ['stressed'],
          // No latest, no trend
        },
      };

      const notes = computeMedContextNotes(input);
      const stressNote = notes.find(n => n.id === 'stress_mood');
      expect(stressNote).toBeDefined();
      expect(stressNote?.confidence).toBeLessThan(0.65); // Should be penalized
      expect(stressNote?.reasons).toContain('mood_sparse_data');
    });

    it('should trigger sleep note when lastNightHours is low', () => {
      const input: MedContextInput = {
        medName: 'Sertraline',
        sleep: {
          lastNightHours: 5.5,
        },
      };

      const notes = computeMedContextNotes(input);
      expect(notes.length).toBeGreaterThan(0);
      const sleepNote = notes.find(n => n.id === 'sleep');
      expect(sleepNote).toBeDefined();
      expect(sleepNote?.reasons).toContain('sleep_lastNight_low');
    });

    it('should trigger sleep note when avg7dHours is low', () => {
      const input: MedContextInput = {
        medName: 'Sertraline',
        sleep: {
          avg7dHours: 6.0,
        },
      };

      const notes = computeMedContextNotes(input);
      expect(notes.length).toBeGreaterThan(0);
      const sleepNote = notes.find(n => n.id === 'sleep');
      expect(sleepNote).toBeDefined();
      expect(sleepNote?.reasons).toContain('sleep_avg7d_low');
    });

    it('should reduce confidence when sleep has sparse data', () => {
      const input: MedContextInput = {
        medName: 'Sertraline',
        sleep: {
          avg7dHours: 5.5,
          sparseData: true,
        },
      };

      const notes = computeMedContextNotes(input);
      const sleepNote = notes.find(n => n.id === 'sleep');
      expect(sleepNote).toBeDefined();
      expect(sleepNote?.confidence).toBeLessThan(0.75); // Should be penalized
      expect(sleepNote?.reasons).toContain('sleep_sparse_data');
    });

    it('should trigger adherence note when adherencePct7d is low', () => {
      const input: MedContextInput = {
        medName: 'Sertraline',
        meds: {
          adherencePct7d: 60,
        },
      };

      const notes = computeMedContextNotes(input);
      expect(notes.length).toBeGreaterThan(0);
      const adherenceNote = notes.find(n => n.id === 'consistency');
      expect(adherenceNote).toBeDefined();
      expect(adherenceNote?.reasons).toContain('adherence_low');
    });

    it('should trigger adherence note when missedDoses3d >= 1', () => {
      const input: MedContextInput = {
        medName: 'Sertraline',
        meds: {
          missedDoses3d: 1,
        },
      };

      const notes = computeMedContextNotes(input);
      expect(notes.length).toBeGreaterThan(0);
      const adherenceNote = notes.find(n => n.id === 'consistency');
      expect(adherenceNote).toBeDefined();
      expect(adherenceNote?.reasons).toContain('missed_doses_recent');
    });

    it('should reduce confidence when missedDoses3d is undefined but adherence triggered', () => {
      const input: MedContextInput = {
        medName: 'Sertraline',
        meds: {
          adherencePct7d: 60,
          missedDoses3d: undefined,
        },
      };

      const notes = computeMedContextNotes(input);
      const adherenceNote = notes.find(n => n.id === 'consistency');
      expect(adherenceNote).toBeDefined();
      expect(adherenceNote?.confidence).toBeLessThan(0.8); // Should be penalized
    });

    it('should reduce confidence when has unknown status', () => {
      const input: MedContextInput = {
        medName: 'Sertraline',
        meds: {
          adherencePct7d: 60,
          hasUnknownStatus: true,
        },
      };

      const notes = computeMedContextNotes(input);
      const adherenceNote = notes.find(n => n.id === 'consistency');
      expect(adherenceNote).toBeDefined();
      expect(adherenceNote?.confidence).toBeLessThan(0.8); // Should be penalized
      expect(adherenceNote?.reasons).toContain('meds_unknown_status');
    });

    it('should cap to max 3 notes', () => {
      const input: MedContextInput = {
        medName: 'Sertraline',
        mood: {
          latest: 2,
        },
        sleep: {
          lastNightHours: 5.0,
          avg7dHours: 6.0,
        },
        meds: {
          adherencePct7d: 60,
          missedDoses3d: 2,
        },
        flags: {
          stress: true,
        },
      };

      const notes = computeMedContextNotes(input);
      expect(notes.length).toBeLessThanOrEqual(3);
    });

    it('should be deterministic: same input yields same output', () => {
      const input: MedContextInput = {
        medName: 'Sertraline',
        mood: {
          latest: 2,
          trend3dPct: -10,
        },
        sleep: {
          lastNightHours: 5.5,
        },
        meds: {
          adherencePct7d: 65,
        },
      };

      const notes1 = computeMedContextNotes(input);
      const notes2 = computeMedContextNotes(input);

      expect(notes1.length).toBe(notes2.length);
      expect(notes1.map(n => n.id)).toEqual(notes2.map(n => n.id));
      expect(notes1.map(n => n.reasons)).toEqual(notes2.map(n => n.reasons));
    });

    it('should return empty array when no triggers', () => {
      const input: MedContextInput = {
        medName: 'Sertraline',
        mood: {
          latest: 4,
          trend3dPct: 5,
        },
        sleep: {
          lastNightHours: 7.5,
          avg7dHours: 7.0,
        },
        meds: {
          adherencePct7d: 90,
          missedDoses3d: 0,
        },
      };

      const notes = computeMedContextNotes(input);
      expect(notes.length).toBe(0);
    });

    it('should reduce confidence when relying on weak signals', () => {
      const input: MedContextInput = {
        medName: 'Sertraline',
        mood: {
          tags: ['stressed'],
          // No latest or trend
        },
      };

      const notes = computeMedContextNotes(input);
      const stressNote = notes.find(n => n.id === 'stress_mood');
      expect(stressNote).toBeDefined();
      expect(stressNote?.confidence).toBeLessThan(0.7);
    });

    it('should reduce confidence when mood triggered only by tags', () => {
      const input: MedContextInput = {
        medName: 'Sertraline',
        mood: {
          tags: ['stressed'],
          // No latest, no trend
        },
      };

      const notes = computeMedContextNotes(input);
      const stressNote = notes.find(n => n.id === 'stress_mood');
      expect(stressNote).toBeDefined();
      expect(stressNote?.confidence).toBeLessThan(0.65); // Should be penalized
      expect(stressNote?.reasons).toContain('mood_sparse_data');
    });

    it('should reduce confidence when sleep has sparse data', () => {
      const input: MedContextInput = {
        medName: 'Sertraline',
        sleep: {
          avg7dHours: 5.5,
          sparseData: true,
        },
      };

      const notes = computeMedContextNotes(input);
      const sleepNote = notes.find(n => n.id === 'sleep');
      expect(sleepNote).toBeDefined();
      expect(sleepNote?.confidence).toBeLessThan(0.75); // Should be penalized
      expect(sleepNote?.reasons).toContain('sleep_sparse_data');
    });

    it('should reduce confidence when missedDoses3d is undefined but adherence triggered', () => {
      const input: MedContextInput = {
        medName: 'Sertraline',
        meds: {
          adherencePct7d: 60,
          missedDoses3d: undefined,
        },
      };

      const notes = computeMedContextNotes(input);
      const adherenceNote = notes.find(n => n.id === 'consistency');
      expect(adherenceNote).toBeDefined();
      expect(adherenceNote?.confidence).toBeLessThan(0.8); // Should be penalized
    });

    it('should reduce confidence when has unknown status', () => {
      const input: MedContextInput = {
        medName: 'Sertraline',
        meds: {
          adherencePct7d: 60,
          hasUnknownStatus: true,
        },
      };

      const notes = computeMedContextNotes(input);
      const adherenceNote = notes.find(n => n.id === 'consistency');
      expect(adherenceNote).toBeDefined();
      expect(adherenceNote?.confidence).toBeLessThan(0.8); // Should be penalized
      expect(adherenceNote?.reasons).toContain('meds_unknown_status');
    });
  });

  describe('confidenceLabel', () => {
    it('should return Low for values < 0.45', () => {
      expect(confidenceLabel(0.2)).toBe('Low');
      expect(confidenceLabel(0.44)).toBe('Low');
    });

    it('should return Medium for values >= 0.45 and < 0.75', () => {
      expect(confidenceLabel(0.45)).toBe('Medium');
      expect(confidenceLabel(0.5)).toBe('Medium');
      expect(confidenceLabel(0.74)).toBe('Medium');
    });

    it('should return High for values >= 0.75', () => {
      expect(confidenceLabel(0.75)).toBe('High');
      expect(confidenceLabel(0.9)).toBe('High');
      expect(confidenceLabel(1.0)).toBe('High');
    });
  });
});
