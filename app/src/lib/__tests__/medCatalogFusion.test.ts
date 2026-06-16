import { describe, expect, it } from 'vitest';
import {
  fuseMedCatalogWithUserState,
  aggregateMedDomainOverlapForMeds,
  MED_FUSION_HINT_COPY,
  MED_FUSION_NOTE_COPY,
} from '@/lib/medCatalogFusion';
import {
  lintGovernedMedGeneratedCopy,
  ALLOWED_EFFECT_TAGS,
  ALLOWED_STATE_IMPACT_TAGS,
  EFFECT_TAG_TO_DOMAIN,
  STATE_IMPACT_TAG_TO_DOMAIN,
} from '@/lib/medCatalogGovernance';

describe('medCatalogFusion', () => {
  it('fires overlap when catalogue sleep tag meets low sleep state', () => {
    const signals = fuseMedCatalogWithUserState(
      { effectTags: ['sleep_relevant'], stateImpactTags: ['sleep_interpretation'] },
      { sleep: { lastNightHours: 5.2, avg7dHours: 6.1 } },
    );

    expect(signals.sleep?.overlap).toBe(true);
    expect(signals.sleep?.catalogTagged).toBe(true);
    expect(signals.sleep?.userStateActive).toBe(true);
  });

  it('does not overlap when catalogue tagged but user state is neutral', () => {
    const signals = fuseMedCatalogWithUserState(
      { effectTags: ['mood_relevant'] },
      { mood: { latest: 4, trend3dPct: 2 }, flags: { stress: false } },
    );

    expect(signals.mood?.catalogTagged).toBe(true);
    expect(signals.mood?.overlap).toBe(false);
  });

  it('aggregates overlap across meds with catalogue matches', () => {
    const overlap = aggregateMedDomainOverlapForMeds(
      [{ name: 'Sertraline' }, { name: 'Not In Catalog XYZ' }],
      {
        mood: { latest: 2, trend3dPct: -12 },
        flags: { stress: true },
      },
    );

    expect(overlap.mood).toBe(true);
  });

  it('maps every allowed catalogue tag to a fusion domain', () => {
    for (const tag of ALLOWED_EFFECT_TAGS) {
      expect(EFFECT_TAG_TO_DOMAIN[tag], `missing effect map for ${tag}`).toBeTruthy();
    }
    for (const tag of ALLOWED_STATE_IMPACT_TAGS) {
      expect(STATE_IMPACT_TAG_TO_DOMAIN[tag], `missing state map for ${tag}`).toBeTruthy();
    }
  });

  it('governance-lints all generated fusion copy', () => {
    for (const copy of Object.values(MED_FUSION_NOTE_COPY)) {
      if (!copy) continue;
      expect(lintGovernedMedGeneratedCopy(copy.title)).toBeNull();
      expect(lintGovernedMedGeneratedCopy(copy.message)).toBeNull();
    }
    for (const line of Object.values(MED_FUSION_HINT_COPY)) {
      if (!line) continue;
      expect(lintGovernedMedGeneratedCopy(line)).toBeNull();
    }
  });
});
