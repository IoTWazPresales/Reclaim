// C:\Reclaim\app\src\lib\meditationTiming.test.ts

import { describe, it, expect } from 'vitest';
import {
  buildStepBoundaries,
  getStepIndexForElapsed,
  getStepStartElapsedMs,
  hasStepSeconds,
  isFullyTimingBased,
  type StepBoundaries,
} from './meditationTiming';
import type { MeditationScriptStep } from './meditations';

describe('meditationTiming', () => {
  describe('buildStepBoundaries', () => {
    it('should build cumulative boundaries for steps with seconds', () => {
      const steps: MeditationScriptStep[] = [
        { title: 'Step 1', instruction: 'First', seconds: 10 },
        { title: 'Step 2', instruction: 'Second', seconds: 20 },
        { title: 'Step 3', instruction: 'Third', seconds: 15 },
      ];

      const boundaries = buildStepBoundaries(steps);

      expect(boundaries.boundaries).toEqual([10000, 30000, 45000]);
      expect(boundaries.totalDurationMs).toBe(45000);
      expect(boundaries.stepCount).toBe(3);
    });

    it('should skip steps without seconds', () => {
      const steps: MeditationScriptStep[] = [
        { title: 'Step 1', instruction: 'First', seconds: 10 },
        { title: 'Step 2', instruction: 'Second' }, // no seconds
        { title: 'Step 3', instruction: 'Third', seconds: 15 },
      ];

      const boundaries = buildStepBoundaries(steps);

      expect(boundaries.boundaries).toEqual([10000, 25000]);
      expect(boundaries.totalDurationMs).toBe(25000);
      expect(boundaries.stepCount).toBe(3);
    });

    it('should return empty boundaries if no steps have seconds', () => {
      const steps: MeditationScriptStep[] = [
        { title: 'Step 1', instruction: 'First' },
        { title: 'Step 2', instruction: 'Second' },
      ];

      const boundaries = buildStepBoundaries(steps);

      expect(boundaries.boundaries).toEqual([]);
      expect(boundaries.totalDurationMs).toBe(0);
      expect(boundaries.stepCount).toBe(2);
    });
  });

  describe('getStepIndexForElapsed', () => {
    it('should return correct step index for elapsed time', () => {
      const boundaries: StepBoundaries = {
        boundaries: [10000, 30000, 45000],
        totalDurationMs: 45000,
        stepCount: 3,
      };
      const steps: MeditationScriptStep[] = [
        { title: 'Step 1', instruction: 'First', seconds: 10 },
        { title: 'Step 2', instruction: 'Second', seconds: 20 },
        { title: 'Step 3', instruction: 'Third', seconds: 15 },
      ];

      expect(getStepIndexForElapsed(boundaries, 0, steps)).toBe(0);
      expect(getStepIndexForElapsed(boundaries, 5000, steps)).toBe(0);
      expect(getStepIndexForElapsed(boundaries, 10000, steps)).toBe(1);
      expect(getStepIndexForElapsed(boundaries, 20000, steps)).toBe(1);
      expect(getStepIndexForElapsed(boundaries, 30000, steps)).toBe(2);
      expect(getStepIndexForElapsed(boundaries, 40000, steps)).toBe(2);
      expect(getStepIndexForElapsed(boundaries, 50000, steps)).toBe(2); // beyond boundaries, return last
    });

    it('should return 0 if no boundaries', () => {
      const boundaries: StepBoundaries = {
        boundaries: [],
        totalDurationMs: 0,
        stepCount: 2,
      };
      const steps: MeditationScriptStep[] = [
        { title: 'Step 1', instruction: 'First' },
        { title: 'Step 2', instruction: 'Second' },
      ];

      expect(getStepIndexForElapsed(boundaries, 0, steps)).toBe(0);
      expect(getStepIndexForElapsed(boundaries, 10000, steps)).toBe(0);
    });
  });

  describe('getStepStartElapsedMs', () => {
    it('should return correct start time for each step', () => {
      const boundaries: StepBoundaries = {
        boundaries: [10000, 30000, 45000],
        totalDurationMs: 45000,
        stepCount: 3,
      };

      expect(getStepStartElapsedMs(boundaries, 0)).toBe(0);
      expect(getStepStartElapsedMs(boundaries, 1)).toBe(10000);
      expect(getStepStartElapsedMs(boundaries, 2)).toBe(30000);
      expect(getStepStartElapsedMs(boundaries, 3)).toBe(45000); // beyond boundaries, return last
    });
  });

  describe('hasStepSeconds', () => {
    it('should return true for steps with seconds', () => {
      expect(hasStepSeconds({ title: 'Test', instruction: 'Test', seconds: 10 })).toBe(true);
      expect(hasStepSeconds({ title: 'Test', instruction: 'Test', seconds: 0 })).toBe(false);
    });

    it('should return false for steps without seconds', () => {
      expect(hasStepSeconds({ title: 'Test', instruction: 'Test' })).toBe(false);
    });
  });

  describe('isFullyTimingBased', () => {
    it('should return true if all steps have seconds', () => {
      const steps: MeditationScriptStep[] = [
        { title: 'Step 1', instruction: 'First', seconds: 10 },
        { title: 'Step 2', instruction: 'Second', seconds: 20 },
      ];

      expect(isFullyTimingBased(steps)).toBe(true);
    });

    it('should return false if any step lacks seconds', () => {
      const steps: MeditationScriptStep[] = [
        { title: 'Step 1', instruction: 'First', seconds: 10 },
        { title: 'Step 2', instruction: 'Second' },
      ];

      expect(isFullyTimingBased(steps)).toBe(false);
    });

    it('should return false for empty array', () => {
      expect(isFullyTimingBased([])).toBe(false);
    });
  });
});
