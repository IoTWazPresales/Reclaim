import { describe, it, expect } from 'vitest';
import {
  claimBackgroundActionsOwner,
  getBackgroundActionsOwner,
  isBackgroundActionsOwnedByOther,
  releaseBackgroundActionsOwner,
} from '@/lib/system/backgroundActionsOwner';
import { durationSecForIntervention } from '@/lib/mindfulness/mindfulnessSessionState';

describe('backgroundActionsOwner', () => {
  it('tracks claim/release and other-owner checks', () => {
    releaseBackgroundActionsOwner('guided');
    releaseBackgroundActionsOwner('mindfulness');
    releaseBackgroundActionsOwner('meditation');
    expect(getBackgroundActionsOwner()).toBe('none');

    claimBackgroundActionsOwner('guided');
    expect(getBackgroundActionsOwner()).toBe('guided');
    expect(isBackgroundActionsOwnedByOther('mindfulness')).toBe(true);
    expect(isBackgroundActionsOwnedByOther('guided')).toBe(false);

    releaseBackgroundActionsOwner('mindfulness'); // wrong owner — no-op
    expect(getBackgroundActionsOwner()).toBe('guided');
    releaseBackgroundActionsOwner('guided');
    expect(getBackgroundActionsOwner()).toBe('none');
  });
});

describe('durationSecForIntervention', () => {
  it('maps known interventions to honest durations', () => {
    expect(durationSecForIntervention('box_breath_60')).toBe(60);
    expect(durationSecForIntervention('breath_478')).toBe(90);
    expect(durationSecForIntervention('five_senses')).toBe(120);
    expect(durationSecForIntervention('unknown')).toBe(90);
  });
});
