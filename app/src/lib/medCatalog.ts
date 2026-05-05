// C:\Reclaim\app\src\lib\medCatalog.ts

import catalogCore from '@/data/medCatalog.v1.json';
import catalogBatch1 from '@/data/medCatalog.batch1.json';
import catalogBatch2 from '@/data/medCatalog.batch2.json';

/**
 * Curated static knowledge for a medication. All extended fields are optional in JSON
 * for forward compatibility; required fields are normalized in `loadMedCatalog()`.
 */
export type MedCatalogItem = {
  id: string;
  genericName: string;
  brandNames?: string[];
  /** Additional exact-match strings (normalized same as generic/brand). */
  matchAliases?: string[];
  /** Slug / internal grouping (e.g. ssri) */
  category: string;
  /** Optional human label (e.g. pharmacologic class) */
  medicationClass?: string;
  activeIngredients?: string[];
  mechanism: string;
  /** Shorter, plain-language mechanism when present */
  plainEnglishMechanism?: string;
  commonUses?: string[];
  whatYouMightNotice?: string[];
  mentalHealthLinks?: string[];
  /** Free-text timing hints; educational, not individualized PK */
  onsetWindow?: string;
  durationWindow?: string;
  /**
   * Coarse tags for safe interpretation hints (e.g. sleep_relevant).
   * Not a clinical coding system.
   */
  effectTags?: string[];
  /**
   * How this med may act as context when reading state (e.g. sleep_interpretation).
   */
  stateImpactTags?: string[];
  confidence: number;
  safetyNote: string;
  /** Provenance / curation note for transparency */
  sourceNote?: string;
};

function normalizeCatalogEntry(raw: MedCatalogItem): MedCatalogItem {
  return {
    ...raw,
    whatYouMightNotice: raw.whatYouMightNotice ?? [],
    mentalHealthLinks: raw.mentalHealthLinks ?? [],
  };
}

/**
 * Load merged static catalogs (core + governed batch seeds).
 */
export function loadMedCatalog(): MedCatalogItem[] {
  const merged = [
    ...(catalogCore as MedCatalogItem[]),
    ...(catalogBatch1 as MedCatalogItem[]),
    ...(catalogBatch2 as MedCatalogItem[]),
  ];
  return merged.map(normalizeCatalogEntry);
}

/** Test-only: clear memoized lookup index after catalog hot-reload in tests. */
export function resetMedCatalogLookupCache(): void {
  catalogIndex = null;
}

/**
 * Normalize a medication name for matching:
 * - Lowercase
 * - Trim whitespace
 * - Collapse multiple spaces
 * - Replace hyphens with spaces (so "Prozac-50" becomes "prozac 50")
 * - Remove punctuation and special symbols (keep letters, numbers, spaces)
 * - Remove trailing dosage tokens (mg, mcg, g, ml, tablet, tab, cap, capsule) and numbers
 */
export function normalizeMedName(s: string): string {
  if (!s) return '';
  
  // Lowercase and trim
  let normalized = s.toLowerCase().trim();
  
  // Replace hyphens with spaces first (so "Prozac-50" becomes "prozac 50")
  normalized = normalized.replace(/-/g, ' ');
  
  // Remove common punctuation and symbols (keep letters, numbers, spaces)
  normalized = normalized.replace(/[^\w\s]/g, ' ');
  
  // Collapse multiple spaces
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  // Remove trailing dosage patterns: "50mg", "100 mg", "25mcg", "10mg tablet", etc.
  // Match: optional number + optional space + dosage unit + optional word (tablet/tab/cap/capsule) at end
  normalized = normalized.replace(/\s*\d+\s*(mg|mcg|g|ml)\s*(tablet|tab|cap|capsule)?\s*$/i, '').trim();
  
  // Don't remove standalone trailing numbers - they might be part of the name (e.g., "Prozac-50")
  // Only remove if clearly dosage-like (with unit)
  
  return normalized;
}

/**
 * Strip common salt / salt-form suffixes after normalizeMedName for a second exact lookup.
 * Deterministic only — no fuzzy matching.
 */
export function stripMedicationSaltSuffix(normalized: string): string {
  if (!normalized) return '';
  return normalized
    .replace(
      /\s+(hydrochloride|hydrobromide|hcl|hbr|sulfate|mesylate|maleate|fumarate|succinate|tartrate|citrate|besylate|benzoate|oxalate|acetate)$/i,
      '',
    )
    .trim();
}

function addIndexKey(index: Map<string, MedCatalogItem>, key: string, item: MedCatalogItem): void {
  if (!key) return;
  index.set(key, item);
}

// Precomputed index for fast lookup
let catalogIndex: Map<string, MedCatalogItem> | null = null;

function buildCatalogIndex(): Map<string, MedCatalogItem> {
  if (catalogIndex) return catalogIndex;

  const catalog = loadMedCatalog();
  const index = new Map<string, MedCatalogItem>();

  for (const item of catalog) {
    const genericKey = normalizeMedName(item.genericName);
    if (genericKey) addIndexKey(index, genericKey, item);

    if (item.brandNames) {
      for (const brand of item.brandNames) {
        const brandKey = normalizeMedName(brand);
        if (brandKey) addIndexKey(index, brandKey, item);
      }
    }

    if (item.matchAliases) {
      for (const a of item.matchAliases) {
        const ak = normalizeMedName(a);
        if (ak) addIndexKey(index, ak, item);
      }
    }

    // Single-ingredient exact match only (avoids combo ambiguity)
    if (item.activeIngredients?.length === 1) {
      const ik = normalizeMedName(item.activeIngredients[0]);
      if (ik) addIndexKey(index, ik, item);
    }
  }

  catalogIndex = index;
  return index;
}

function lookupKeysForQuery(normalized: string): string[] {
  const saltStripped = stripMedicationSaltSuffix(normalized);
  const keys = [normalized, saltStripped].filter(Boolean);
  return [...new Set(keys)];
}

/**
 * Find a medication catalog item by name (generic, brand, alias, or single active ingredient).
 * Exact normalized keys only; optional deterministic salt-stripped retry. No fuzzy match.
 */
export function findMedCatalogItemByName(name: string): MedCatalogItem | null {
  if (!name) return null;

  const normalized = normalizeMedName(name);
  if (!normalized) return null;

  const index = buildCatalogIndex();
  for (const key of lookupKeysForQuery(normalized)) {
    const hit = index.get(key);
    if (hit) return hit;
  }
  return null;
}

/**
 * Get human-friendly category label.
 */
export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    ssri: 'SSRI',
    snri: 'SNRI',
    ndri: 'NDRI',
    snri_nri: 'SNRI / NRI',
    tricyclic: 'Tricyclic antidepressant',
    maoi: 'MAOI',
    anxiolytic: 'Anxiolytic',
    benzodiazepine: 'Benzodiazepine',
    antidepressant: 'Antidepressant',
    mood_stabilizer: 'Mood stabilizer',
    anticonvulsant: 'Anticonvulsant',
    antipsychotic: 'Antipsychotic',
    stimulant: 'Stimulant',
    adhd_non_stimulant: 'ADHD (non-stimulant)',
    sleep_aid: 'Sleep medication',
    supplement: 'Supplement',
    beta_blocker: 'Beta blocker',
    movement_adjunct: 'Movement-related adjunct',
    neurology_adjunct: 'Neurology-related therapy',
    alpha_blocker: 'Alpha blocker',
    pain_analgesic: 'Pain reliever',
    nsaid: 'Anti-inflammatory (NSAID)',
    opioid_analgesic: 'Opioid pain medication',
    muscle_relaxant: 'Muscle relaxant',
    migraine_triptan: 'Migraine (triptan family)',
    allergy_antihistamine: 'Allergy / antihistamine',
    cold_symptom_relief: 'Cold & flu symptom relief',
    reflux_acid: 'Reflux / stomach acid',
    antiemetic: 'Nausea support',
    laxative: 'Bowel regularity',
    ace_inhibitor: 'ACE inhibitor',
    arb: 'ARB (angiotensin receptor blocker)',
    calcium_channel_blocker: 'Calcium channel blocker',
    thiazide_diuretic: 'Thiazide diuretic',
    loop_diuretic: 'Loop diuretic',
    mineralocorticoid_antagonist: 'Potassium-sparing diuretic',
    anticoagulant: 'Anticoagulant',
    cardiac_glycoside: 'Heart rhythm medication',
    thyroid_hormone: 'Thyroid hormone',
    antithyroid: 'Antithyroid therapy',
    corticosteroid_systemic: 'Corticosteroid',
    diabetes_medication: 'Glucose-related medication',
    antibiotic: 'Antibiotic',
    antiviral: 'Antiviral',
    respiratory: 'Lung / airway medication',
  };
  return labels[category] ?? category.replace(/_/g, ' ');
}

/** Display labels for catalog effect tags (safe interpretation hints). */
const EFFECT_TAG_LABELS: Record<string, string> = {
  sleep_relevant: 'Sleep patterns',
  mood_relevant: 'Mood context',
  heart_rate_relevant: 'Heart rate context',
  fatigue_relevant: 'Energy / fatigue',
  pain_masking_relevant: 'Pain perception',
  appetite_relevant: 'Appetite',
  hydration_relevant: 'Hydration context',
  training_readiness_relevant: 'Training readiness context',
  recovery_interpretation_relevant: 'Recovery interpretation',
  anxiety_context: 'Anxiety context',
  sedation_relevant: 'Sedation / drowsiness',
  activation_relevant: 'Alertness / activation',
};

/** Display labels for “state impact” tags (how Reclaim may use context). */
const STATE_IMPACT_TAG_LABELS: Record<string, string> = {
  sleep_interpretation: 'Sleep interpretation',
  mood_context: 'Mood context',
  heart_rate_interpretation: 'Heart rate interpretation',
  pain_perception: 'Pain / soreness context',
  fatigue_context: 'Fatigue context',
  appetite_context: 'Appetite context',
  hydration_context: 'Hydration context',
  training_readiness: 'Training readiness',
  recovery_interpretation: 'Recovery interpretation',
  anxiety_interpretation: 'Anxiety interpretation',
  illness_context: 'Illness / recovery context',
};

export function formatEffectTagLabel(tag: string): string {
  const t = tag.trim();
  if (!t) return '';
  return EFFECT_TAG_LABELS[t] ?? t.replace(/_/g, ' ');
}

export function formatStateImpactTagLabel(tag: string): string {
  const t = tag.trim();
  if (!t) return '';
  return STATE_IMPACT_TAG_LABELS[t] ?? t.replace(/_/g, ' ');
}
