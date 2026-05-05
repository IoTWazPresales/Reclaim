// C:\Reclaim\app\src\lib\medCatalog.ts

import catalogData from '@/data/medCatalog.v1.json';

/**
 * Curated static knowledge for a medication. All extended fields are optional in JSON
 * for forward compatibility; required fields are normalized in `loadMedCatalog()`.
 */
export type MedCatalogItem = {
  id: string;
  genericName: string;
  brandNames?: string[];
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
 * Load the medication catalog (static JSON).
 */
export function loadMedCatalog(): MedCatalogItem[] {
  return (catalogData as MedCatalogItem[]).map(normalizeCatalogEntry);
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

// Precomputed index for fast lookup
let catalogIndex: Map<string, MedCatalogItem> | null = null;

function buildCatalogIndex(): Map<string, MedCatalogItem> {
  if (catalogIndex) return catalogIndex;
  
  const catalog = loadMedCatalog();
  const index = new Map<string, MedCatalogItem>();
  
  for (const item of catalog) {
    // Index by normalized generic name
    const genericKey = normalizeMedName(item.genericName);
    if (genericKey) {
      index.set(genericKey, item);
    }
    
    // Index by normalized brand names
    if (item.brandNames) {
      for (const brand of item.brandNames) {
        const brandKey = normalizeMedName(brand);
        if (brandKey && brandKey !== genericKey) {
          index.set(brandKey, item);
        }
      }
    }
  }
  
  catalogIndex = index;
  return index;
}

/**
 * Find a medication catalog item by name (generic or brand).
 * Returns null if no match found.
 */
export function findMedCatalogItemByName(name: string): MedCatalogItem | null {
  if (!name) return null;
  
  const normalized = normalizeMedName(name);
  if (!normalized) return null;
  
  const index = buildCatalogIndex();
  return index.get(normalized) ?? null;
}

/**
 * Get human-friendly category label.
 */
export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    ssri: 'SSRI',
    snri: 'SNRI',
    anxiolytic: 'Anxiolytic',
    antidepressant: 'Antidepressant',
    mood_stabilizer: 'Mood Stabilizer',
    anticonvulsant: 'Anticonvulsant',
    supplement: 'Supplement',
  };
  return labels[category] ?? category;
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
