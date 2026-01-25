// C:\Reclaim\app\src\lib\medCatalog.ts

import catalogData from '@/data/medCatalog.v1.json';

export type MedCatalogItem = {
  id: string;
  genericName: string;
  brandNames?: string[];
  category: string;
  mechanism: string;
  whatYouMightNotice: string[];
  mentalHealthLinks: string[];
  confidence: number;
  safetyNote: string;
};

/**
 * Load the medication catalog (static JSON).
 */
export function loadMedCatalog(): MedCatalogItem[] {
  return catalogData as MedCatalogItem[];
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
