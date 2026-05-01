/**
 * Regression tests for meditationTiming — D11 fix verification.
 *
 * After the fix: buildStepBoundaries tracks scriptIndices so
 * getStepIndexForElapsed returns actual script-step indices,
 * not timed-segment indices. Mixed scripts now work correctly.
 */
import { describe, it, expect } from 'vitest';
import {
  buildStepBoundaries,
  getStepIndexForElapsed,
} from '../meditationTiming';
import type { MeditationScriptStep } from '../meditations';

const PMR_STEPS: MeditationScriptStep[] = [
  { title: 'Intro', instruction: 'Comfortable position…' },           // 0 — no seconds (TTS)
  { title: 'Breath', instruction: 'Inhale nose…', seconds: 30 },      // 1
  { title: 'Feet', instruction: 'Tense toes…', seconds: 20 },         // 2
  { title: 'Calves', instruction: 'Tense calves…', seconds: 20 },     // 3
  { title: 'Thighs', instruction: 'Tense…', seconds: 25 },            // 4
  { title: 'Hands', instruction: 'Clench…', seconds: 20 },            // 5
  { title: 'Shoulders', instruction: 'Lift…', seconds: 20 },          // 6
  { title: 'Face', instruction: 'Gently tense…', seconds: 20 },       // 7
  { title: 'Chest', instruction: 'Deep breath…', seconds: 25 },       // 8
  { title: 'Wrap-up', instruction: 'Whole-body scan…', seconds: 30 }, // 9
];

const SAFE_RING_STEPS: MeditationScriptStep[] = [
  { title: 'Breathing', instruction: 'Slow breathing…' },               // 0 — no seconds
  { title: 'Form the Ring', instruction: 'Visualize…', seconds: 30 },   // 1
  { title: 'Step Through', instruction: 'Enter…', seconds: 90 },        // 2
  { title: 'Anchor', instruction: 'Choose one detail…', seconds: 60 },  // 3
  { title: 'Return', instruction: 'Step back…', seconds: 45 },          // 4
];

describe('D11 — mixed script index mapping (fixed)', () => {
  describe('PMR script (first step has no seconds)', () => {
    it('boundaries exclude the non-timed intro but scriptIndices map back correctly', () => {
      const b = buildStepBoundaries(PMR_STEPS);
      expect(b.boundaries).toHaveLength(9);
      expect(b.scriptIndices).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      expect(b.stepCount).toBe(10);
    });

    it('returns script index 1 during first 30s (Breath step)', () => {
      const b = buildStepBoundaries(PMR_STEPS);
      const idx = getStepIndexForElapsed(b, 5_000, PMR_STEPS);
      expect(idx).toBe(1);
    });

    it('returns script index 2 after 30s (Feet step)', () => {
      const b = buildStepBoundaries(PMR_STEPS);
      const idx = getStepIndexForElapsed(b, 31_000, PMR_STEPS);
      expect(idx).toBe(2);
    });
  });

  describe('Safe Ring script (first step has no seconds)', () => {
    it('scriptIndices map to correct script positions', () => {
      const b = buildStepBoundaries(SAFE_RING_STEPS);
      expect(b.boundaries).toHaveLength(4);
      expect(b.scriptIndices).toEqual([1, 2, 3, 4]);
      expect(b.stepCount).toBe(5);
    });

    it('elapsed within first timed step returns script index 1', () => {
      const b = buildStepBoundaries(SAFE_RING_STEPS);
      const idx = getStepIndexForElapsed(b, 10_000, SAFE_RING_STEPS);
      expect(idx).toBe(1);
    });

    it('elapsed beyond all boundaries returns last timed script index (4)', () => {
      const b = buildStepBoundaries(SAFE_RING_STEPS);
      const idx = getStepIndexForElapsed(b, 999_999, SAFE_RING_STEPS);
      expect(idx).toBe(4);
    });
  });

  describe('all-timed scripts (unchanged behavior)', () => {
    const ALL_TIMED: MeditationScriptStep[] = [
      { title: 'A', instruction: '…', seconds: 10 },
      { title: 'B', instruction: '…', seconds: 20 },
      { title: 'C', instruction: '…', seconds: 15 },
    ];

    it('script index equals timed-segment index when all steps have seconds', () => {
      const b = buildStepBoundaries(ALL_TIMED);
      expect(b.scriptIndices).toEqual([0, 1, 2]);
      expect(getStepIndexForElapsed(b, 0, ALL_TIMED)).toBe(0);
      expect(getStepIndexForElapsed(b, 10_000, ALL_TIMED)).toBe(1);
      expect(getStepIndexForElapsed(b, 30_000, ALL_TIMED)).toBe(2);
    });
  });

  describe('script with non-timed step in the middle', () => {
    const MID_GAP: MeditationScriptStep[] = [
      { title: 'A', instruction: '…', seconds: 10 },   // 0
      { title: 'B', instruction: '…' },                  // 1 — no seconds
      { title: 'C', instruction: '…', seconds: 20 },    // 2
    ];

    it('scriptIndices skip non-timed step', () => {
      const b = buildStepBoundaries(MID_GAP);
      expect(b.boundaries).toEqual([10_000, 30_000]);
      expect(b.scriptIndices).toEqual([0, 2]);
    });

    it('after first timed step returns script index 2 (C), skipping non-timed B', () => {
      const b = buildStepBoundaries(MID_GAP);
      const idx = getStepIndexForElapsed(b, 15_000, MID_GAP);
      expect(idx).toBe(2);
    });
  });
});
