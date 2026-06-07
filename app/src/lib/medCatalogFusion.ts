import { findMedCatalogItemByName } from '@/lib/medCatalog';
import type { MedCatalogItem } from '@/lib/medCatalog';
import {
  MED_INSIGHT_DOMAINS,
  assertGovernedMedGeneratedCopy,
  catalogTagsToDomains,
  type MedInsightDomain,
} from '@/lib/medCatalogGovernance';
import type { InsightContext } from '@/lib/insights/InsightEngine';

export type MedDomainSignal = {
  catalogTagged: boolean;
  userStateActive: boolean;
  overlap: boolean;
  reasons: string[];
};

export type MedDomainSignals = Partial<Record<MedInsightDomain, MedDomainSignal>>;

export type MedFusionUserState = {
  mood?: {
    latest?: number;
    trend3dPct?: number;
    tags?: string[];
  };
  sleep?: {
    lastNightHours?: number;
    avg7dHours?: number;
    sparseData?: boolean;
  };
  training?: InsightContext['training'];
  meds?: {
    adherencePct7d?: number;
    missedDoses3d?: number;
    hasUnknownStatus?: boolean;
  };
  flags?: {
    stress?: boolean;
  };
};

export type MedCatalogFusionInput = Pick<MedCatalogItem, 'effectTags' | 'stateImpactTags'>;

const MOOD_TAG_MATCHERS: Partial<Record<MedInsightDomain, RegExp>> = {
  pain: /\b(pain|sore|ache|hurt)\b/i,
  fatigue: /\b(tired|exhausted|fatigue|drained)\b/i,
  anxiety: /\b(anxious|stress|overwhelm|worry)\b/i,
};

function moodTagsMatch(domain: MedInsightDomain, tags: string[]): boolean {
  const re = MOOD_TAG_MATCHERS[domain];
  if (!re) return false;
  return tags.some((t) => re.test(t));
}

function detectDomainUserState(
  domain: MedInsightDomain,
  state: MedFusionUserState,
): { active: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const moodTags = state.mood?.tags ?? [];

  switch (domain) {
    case 'sleep': {
      if (state.sleep?.lastNightHours !== undefined && state.sleep.lastNightHours < 6) {
        reasons.push('sleep_lastNight_low');
      }
      if (state.sleep?.avg7dHours !== undefined && state.sleep.avg7dHours < 6.5) {
        reasons.push('sleep_avg7d_low');
      }
      break;
    }
    case 'mood': {
      if (state.flags?.stress) reasons.push('stress_flag');
      if (state.mood?.latest !== undefined && state.mood.latest <= 2) reasons.push('mood_latest_low');
      if (state.mood?.trend3dPct !== undefined && state.mood.trend3dPct <= -10) {
        reasons.push('mood_trend_down');
      }
      if (moodTagsMatch('mood', moodTags)) reasons.push('mood_tag_present');
      break;
    }
    case 'training': {
      const days = state.training?.daysSinceLastSession;
      if (days !== undefined && days > 5) reasons.push('training_gap');
      if (state.training?.weeklySessionCount === 0 && days !== undefined && days >= 3) {
        reasons.push('training_sparse_week');
      }
      break;
    }
    case 'anxiety': {
      if (state.flags?.stress) reasons.push('stress_flag');
      if (moodTagsMatch('anxiety', moodTags)) reasons.push('anxiety_tag_present');
      break;
    }
    case 'pain': {
      if (moodTagsMatch('pain', moodTags)) reasons.push('pain_tag_present');
      break;
    }
    case 'fatigue': {
      if (moodTagsMatch('fatigue', moodTags)) reasons.push('fatigue_tag_present');
      if (
        state.sleep?.lastNightHours !== undefined &&
        state.sleep.lastNightHours < 6 &&
        state.mood?.latest !== undefined &&
        state.mood.latest <= 3
      ) {
        reasons.push('sleep_mood_fatigue_pattern');
      }
      break;
    }
    case 'recovery': {
      const days = state.training?.daysSinceLastSession;
      if (days !== undefined && days > 4) reasons.push('recovery_gap');
      break;
    }
    default:
      break;
  }

  return { active: reasons.length > 0, reasons };
}

/**
 * Fuse catalogue tags with live user state for one medication profile.
 */
export function fuseMedCatalogWithUserState(
  catalog: MedCatalogFusionInput | null | undefined,
  state: MedFusionUserState,
): MedDomainSignals {
  if (!catalog) return {};

  const catalogDomains = catalogTagsToDomains(catalog.effectTags, catalog.stateImpactTags);
  const domainSignals: MedDomainSignals = {};

  for (const domain of MED_INSIGHT_DOMAINS) {
    const catalogTagged = catalogDomains.has(domain);
    const user = detectDomainUserState(domain, state);
    domainSignals[domain] = {
      catalogTagged,
      userStateActive: user.active,
      overlap: catalogTagged && user.active,
      reasons: [...user.reasons, ...(catalogTagged ? [`catalog_tag_${domain}`] : [])],
    };
  }

  return domainSignals;
}

export function insightContextToFusionUserState(
  ctx: Pick<InsightContext, 'mood' | 'sleep' | 'training' | 'flags' | 'tags'> | undefined,
  extra?: MedFusionUserState['meds'] & { sleepSparseData?: boolean },
): MedFusionUserState {
  if (!ctx) {
    return extra?.adherencePct7d !== undefined || extra?.missedDoses3d !== undefined
      ? { meds: extra }
      : {};
  }

  return {
    mood: {
      latest: ctx.mood?.last,
      trend3dPct: ctx.mood?.trend3dPct,
      tags: ctx.tags ?? [],
    },
    sleep: {
      lastNightHours: ctx.sleep?.lastNight?.hours,
      avg7dHours: ctx.sleep?.avg7d?.hours,
      sparseData: extra?.sleepSparseData,
    },
    training: ctx.training,
    flags: ctx.flags,
    meds: extra,
  };
}

/** Aggregate domain overlap across all user meds with catalogue matches. */
export function aggregateMedDomainOverlapForMeds(
  meds: { name?: string }[],
  state: MedFusionUserState,
): Partial<Record<MedInsightDomain, boolean>> {
  const overlap: Partial<Record<MedInsightDomain, boolean>> = {};

  for (const med of meds) {
    if (!med.name?.trim()) continue;
    const catalog = findMedCatalogItemByName(med.name.trim());
    if (!catalog) continue;
    const signals = fuseMedCatalogWithUserState(catalog, state);
    for (const domain of MED_INSIGHT_DOMAINS) {
      if (signals[domain]?.overlap) overlap[domain] = true;
    }
  }

  return overlap;
}

/** Governed educational copy for catalog×state overlap detail notes. */
export const MED_FUSION_NOTE_COPY: Partial<
  Record<MedInsightDomain, { title: string; message: string }>
> = {
  sleep: {
    title: 'Sleep pattern context',
    message:
      'Your recent sleep has been shorter than your usual range, and this medication type is sometimes discussed alongside sleep patterns. Reclaim treats that as parallel context — not proof that the medication caused or fixed your sleep.',
  },
  mood: {
    title: 'Mood pattern context',
    message:
      'Your mood signals have been lower or more variable lately, and this medication type is catalogued as mood-relevant. That overlap is one interpretive lens among many — not a diagnosis or a change instruction.',
  },
  training: {
    title: 'Training rhythm context',
    message:
      'Your training rhythm has had more gap lately, and this medication type may overlap with how you read readiness or recovery. Use it as context alongside soreness, sleep, and mood — not as a training prescription.',
  },
  anxiety: {
    title: 'Stress and anxiety context',
    message:
      'Stress or anxiety tags showed up in your recent check-ins, and this medication type is catalogued as anxiety-relevant. Patterns can coexist without implying cause — your care team owns medication decisions.',
  },
  pain: {
    title: 'Comfort context',
    message:
      'Discomfort or pain showed up in your recent mood tags, and this medication type may relate to how you interpret comfort signals. Reclaim does not judge effectiveness or tell you what to take.',
  },
  fatigue: {
    title: 'Fatigue context',
    message:
      'Fatigue signals appeared alongside this medication type that is sometimes discussed with energy interpretation. Low energy can have many contributors — medication is only one possible context line.',
  },
  recovery: {
    title: 'Recovery rhythm context',
    message:
      'Your training gap has widened recently, and this medication type may overlap with recovery interpretation. Use logs and clinician guidance as the anchor — not app pattern matching alone.',
  },
};

// Fail fast in dev/test if generated fusion copy violates governance.
for (const [domain, copy] of Object.entries(MED_FUSION_NOTE_COPY)) {
  if (!copy) continue;
  assertGovernedMedGeneratedCopy(copy.title, `MED_FUSION_NOTE_COPY.${domain}.title`);
  assertGovernedMedGeneratedCopy(copy.message, `MED_FUSION_NOTE_COPY.${domain}.message`);
}

/** Governed insight footnote lines from aggregate domain overlap. */
export const MED_FUSION_HINT_COPY: Partial<Record<MedInsightDomain, string>> = {
  sleep:
    'A medication you track is catalogued as sleep-relevant, and your recent sleep pattern may be worth viewing alongside that context — not as cause.',
  mood:
    'A medication you track is catalogued as mood-relevant while mood signals have shifted — parallel context only.',
  training:
    'A medication you track may overlap with training-readiness interpretation while your session rhythm has changed.',
  anxiety:
    'Stress or anxiety showed up in recent check-ins alongside a medication catalogued for anxiety context.',
  pain:
    'Discomfort tags appeared recently alongside a medication that may relate to pain interpretation.',
  fatigue:
    'Fatigue signals and a fatigue-relevant medication profile overlap — one context line among many.',
  recovery:
    'Recovery-relevant medication context may apply while your training gap has widened.',
};

for (const [domain, line] of Object.entries(MED_FUSION_HINT_COPY)) {
  if (!line) continue;
  assertGovernedMedGeneratedCopy(line, `MED_FUSION_HINT_COPY.${domain}`);
}

export function buildFusionInsightHints(
  domainOverlap: Partial<Record<MedInsightDomain, boolean>>,
): string[] {
  const hints: string[] = [];
  for (const domain of MED_INSIGHT_DOMAINS) {
    if (!domainOverlap[domain]) continue;
    const line = MED_FUSION_HINT_COPY[domain];
    if (line) hints.push(line);
  }
  return hints.slice(0, 3);
}
