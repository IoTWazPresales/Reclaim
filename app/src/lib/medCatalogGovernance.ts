/**
 * MedicationKnowledge catalog governance — validation only (no runtime side effects).
 * Enforces controlled vocabulary, confidence bounds, duplicate keys, and banned phrases.
 *
 * Types mirror `MedCatalogItem` without importing medCatalog.ts (avoid circular imports).
 */
export type MedCatalogRow = {
  id: string;
  genericName: string;
  brandNames?: string[];
  matchAliases?: string[];
  category: string;
  /** Pharmacologic / therapeutic class label (detail UI); optional in JSON. */
  medicationClass?: string;
  activeIngredients?: string[];
  mechanism: string;
  plainEnglishMechanism?: string;
  commonUses?: string[];
  whatYouMightNotice?: string[];
  mentalHealthLinks?: string[];
  onsetWindow?: string;
  durationWindow?: string;
  effectTags?: string[];
  stateImpactTags?: string[];
  confidence: number;
  safetyNote: string;
  sourceNote?: string;
};

/** Effect tags allowed in catalog JSON (detail UI + insight hints). Extend deliberately. */
export const ALLOWED_EFFECT_TAGS = [
  'sleep_relevant',
  'mood_relevant',
  'heart_rate_relevant',
  'fatigue_relevant',
  'pain_masking_relevant',
  'appetite_relevant',
  'hydration_relevant',
  'training_readiness_relevant',
  'recovery_interpretation_relevant',
  'anxiety_context',
  'sedation_relevant',
  'activation_relevant',
] as const;

/** State-impact tags allowed in catalog JSON. */
export const ALLOWED_STATE_IMPACT_TAGS = [
  'sleep_interpretation',
  'mood_context',
  'heart_rate_interpretation',
  'pain_perception',
  'fatigue_context',
  'appetite_context',
  'hydration_context',
  'training_readiness',
  'recovery_interpretation',
  'anxiety_interpretation',
  /** Acute illness / infection recovery context (non-diagnostic; interpretive only). */
  'illness_context',
] as const;

const ALLOWED_EFFECT_SET = new Set<string>(ALLOWED_EFFECT_TAGS);
const ALLOWED_STATE_SET = new Set<string>(ALLOWED_STATE_IMPACT_TAGS);

/**
 * Banned instructional / causal / interaction patterns for educational catalog copy.
 * Case-insensitive; tested against concatenated text fields per entry.
 */
export const BANNED_PHRASE_PATTERNS: RegExp[] = [
  /\btake this medication\b/i,
  /\bstop taking\b/i,
  /\bchange your dose\b/i,
  /\bincrease your dose\b/i,
  /\bdecrease your dose\b/i,
  /\bsafe to combine\b/i,
  /\bdo not use if\b/i,
  /\bcontraindicat/i,
  /\bthis caused your\b/i,
  /\byou should take\b/i,
  /\byou must take\b/i,
  /\bdo not take\b/i,
  /\bavoid taking\b/i,
  /\btreatment recommendation\b/i,
  /\bseek emergency\b/i,
  /\bcall 911\b/i,
];

export type CatalogValidationIssue = { id: string; message: string };

function collectEntryText(item: MedCatalogRow): string {
  const parts = [
    item.mechanism,
    item.plainEnglishMechanism,
    item.safetyNote,
    item.sourceNote,
    ...(item.commonUses ?? []),
    ...(item.whatYouMightNotice ?? []),
    ...(item.mentalHealthLinks ?? []),
    item.onsetWindow,
    item.durationWindow,
  ];
  return parts.filter(Boolean).join(' ');
}

/** Normalize key the same way catalog indexing uses for lookups (import avoids circular dep). */
export function governanceNormalizeKey(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/-/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Validate merged catalog array. Call from tests and optional CI.
 */
export function validateMedCatalog(entries: MedCatalogRow[]): CatalogValidationIssue[] {
  const issues: CatalogValidationIssue[] = [];
  const keyToId = new Map<string, string>();

  for (const item of entries) {
    const id = item.id || '(missing id)';

    if (!item.sourceNote?.trim()) {
      issues.push({ id, message: 'sourceNote is required for catalog entries' });
    }
    if (item.confidence === undefined || item.confidence === null || Number.isNaN(item.confidence)) {
      issues.push({ id, message: 'confidence is required' });
    } else if (item.confidence < 0 || item.confidence > 1) {
      issues.push({ id, message: `confidence must be in [0,1], got ${item.confidence}` });
    }

    for (const t of item.effectTags ?? []) {
      if (!ALLOWED_EFFECT_SET.has(t)) {
        issues.push({ id, message: `effectTags contains unknown tag "${t}"` });
      }
    }
    for (const t of item.stateImpactTags ?? []) {
      if (!ALLOWED_STATE_SET.has(t)) {
        issues.push({ id, message: `stateImpactTags contains unknown tag "${t}"` });
      }
    }

    const textBlob = collectEntryText(item);
    for (const re of BANNED_PHRASE_PATTERNS) {
      if (re.test(textBlob)) {
        issues.push({ id, message: `Banned phrase pattern matched catalog copy: ${re}` });
      }
    }

    const registerKey = (raw: string | undefined, label: string) => {
      if (!raw?.trim()) return;
      const k = governanceNormalizeKey(raw);
      if (!k) return;
      const existing = keyToId.get(k);
      if (existing && existing !== item.id) {
        issues.push({
          id,
          message: `Duplicate normalized match key "${k}" (${label}) — already used by "${existing}"`,
        });
      } else {
        keyToId.set(k, item.id);
      }
    };

    registerKey(item.genericName, 'genericName');
    for (const b of item.brandNames ?? []) registerKey(b, 'brandNames');
    for (const a of item.matchAliases ?? []) registerKey(a, 'matchAliases');
    for (const ing of item.activeIngredients ?? []) {
      registerKey(ing, 'activeIngredients');
    }
  }

  return issues;
}
