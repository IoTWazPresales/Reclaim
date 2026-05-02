import { describe, expect, it } from 'vitest';
import {
  buildGuidedActiveSessionSnapshot,
  GUIDED_ACTIVE_SESSION_SCHEMA_VERSION,
  parseGuidedActiveSessionSnapshot,
} from '../guidedActiveSessionSnapshot';

describe('guidedActiveSessionSnapshot', () => {
  it('build + parse round-trip', () => {
    const built = buildGuidedActiveSessionSnapshot({
      sessionId: 's1',
      currentItem: { id: 'item-1', exercise_id: 'ex-1' },
      exerciseName: 'Squat',
      uiExerciseIndex: 2,
      currentSetIndex: 3,
      phase: 'work',
      restTotalSeconds: null,
      restRemainingSeconds: null,
      restPaused: false,
    });
    const parsed = parseGuidedActiveSessionSnapshot(built);
    expect(parsed).toEqual(built);
  });

  it('build captures rest window when in rest', () => {
    const b = buildGuidedActiveSessionSnapshot({
      sessionId: 's1',
      currentItem: { id: 'i1', exercise_id: 'e1' },
      exerciseName: 'x',
      uiExerciseIndex: 0,
      currentSetIndex: 2,
      phase: 'rest',
      restTotalSeconds: 120,
      restRemainingSeconds: 30,
      restPaused: false,
    });
    expect(b.phase).toBe('rest');
    expect(b.restSecondsRemaining).toBe(30);
    expect(b.restStartedAtIso).toBeTruthy();
    expect(b.restEndsAtIso).toBeTruthy();
  });

  it('rejects wrong schema version', () => {
    expect(parseGuidedActiveSessionSnapshot({ schemaVersion: 0, sessionId: 'x' })).toBeNull();
  });

  it('rejects garbage', () => {
    expect(parseGuidedActiveSessionSnapshot(null)).toBeNull();
    expect(parseGuidedActiveSessionSnapshot('x')).toBeNull();
    expect(parseGuidedActiveSessionSnapshot({})).toBeNull();
  });

  it('rejects out-of-range indices', () => {
    expect(
      parseGuidedActiveSessionSnapshot({
        schemaVersion: GUIDED_ACTIVE_SESSION_SCHEMA_VERSION,
        sessionId: 's',
        sessionItemId: null,
        exerciseId: null,
        exerciseName: null,
        currentExerciseIndex: -1,
        currentSetIndex: 1,
        phase: 'work',
        restStartedAtIso: null,
        restEndsAtIso: null,
        restSecondsRemaining: null,
        notificationMode: 'guided',
        updatedAt: new Date().toISOString(),
      }),
    ).toBeNull();
  });

  it('accepts minimal valid snapshot', () => {
    const ts = new Date().toISOString();
    const v = {
      schemaVersion: GUIDED_ACTIVE_SESSION_SCHEMA_VERSION,
      sessionId: 'sess',
      sessionItemId: null,
      exerciseId: null,
      exerciseName: null,
      currentExerciseIndex: 0,
      currentSetIndex: 1,
      phase: 'work' as const,
      restStartedAtIso: null,
      restEndsAtIso: null,
      restSecondsRemaining: null,
      notificationMode: 'guided' as const,
      updatedAt: ts,
    };
    expect(parseGuidedActiveSessionSnapshot(v)?.sessionId).toBe('sess');
  });
});
