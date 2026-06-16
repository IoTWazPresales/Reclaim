# Medication catalogue — Phase 0 reconciliation

**Date:** 2026-06-06  
**Branch:** `feat/meds-catalog-governance`  
**Status:** Frozen baseline — no catalogue row edits in this phase.

---

## Authoritative merged row count

Computed via `loadMedCatalog()` in `app/src/lib/medCatalog.ts`:

| Source file | Rows (`id` count) |
|-------------|-------------------|
| `app/src/data/medCatalog.v1.json` | 12 |
| `app/src/data/medCatalog.batch1.json` | 100 |
| `app/src/data/medCatalog.batch2.json` | **103** |
| **Merged total** | **215** |

Prior docs cited 112 (v1+batch1 only) or 212 (assuming batch2=100). **Repo truth is 215.**

`loadMedCatalog()` concatenates all three JSON files with no deduplication. Duplicate `id` values would still appear as separate array entries; governance duplicate-key check covers normalized **match keys**, not `id` slugs.

---

## Governance validation (`validateMedCatalog`)

**Result:** 0 issues (215 rows)

Checks per row:

- `sourceNote` required (non-empty)
- `confidence` required, in `[0, 1]`
- `effectTags` ⊆ `ALLOWED_EFFECT_TAGS` (12 tags)
- `stateImpactTags` ⊆ `ALLOWED_STATE_IMPACT_TAGS` (11 tags)
- Banned instructional/causal phrase patterns on concatenated copy fields
- No duplicate normalized match keys across `genericName`, `brandNames`, `matchAliases`, `activeIngredients`

Module: `app/src/lib/medCatalogGovernance.ts`

---

## QA summary (`buildMedCatalogQaSummary`)

**Governance validation issues:** 0

**Confidence bands:**

| Band | Count |
|------|-------|
| &lt; 0.6 | 0 |
| 0.6–0.8 | 192 |
| ≥ 0.8 | 23 |

**Optional field gaps (informational — not governance failures):**

| Field | Missing count |
|-------|---------------|
| `plainEnglishMechanism` | 209 |
| `commonUses` | 209 |
| `onsetWindow` | 214 |
| `durationWindow` | 214 |

Core v1 exemplars are enriched; batch seeds are mechanism + tags + safety/source heavy. Thin rows are a **curation task**, out of rebuild scope.

**Top categories (by row count):** antipsychotic (23), sleep_aid (13), tricyclic (10), nsaid (10), reflux_acid (10), …

**State-impact tag usage (rows may carry multiple):** fatigue_context (145), sleep_interpretation (96), mood_context (76), …

Module: `app/src/lib/medCatalogQa.ts`

---

## Tests (Phase 0 exit)

```
npx vitest run src/lib/__tests__/medCatalog.test.ts \
               src/lib/__tests__/medCatalogGovernance.test.ts \
               src/lib/__tests__/medCatalogQa.test.ts
→ 32/32 passed

npm run typecheck → pass
```

---

## Frozen invariants (carry forward)

- Catalogue is **static bundled JSON** — not Supabase, not user-editable at runtime.
- Matching is **exact normalized key only** (`findMedCatalogItemByName`) — no fuzzy match.
- User `meds` table has **no `catalog_id`** yet (Phase 5).
- Governance lint applies to **catalogue rows today**; generated fusion copy must use the same lint in Phase 4+.

---

## Phase 0 actions taken

- [x] Computed actual merged row count: **215**
- [x] Ran `validateMedCatalog()` — 0 issues
- [x] Ran QA summary — 0 governance issues
- [x] Catalogue tests + typecheck green
- [x] **No catalogue row edits**

**Next:** Phase 1 — extract detail components + `useMedDetailContext` (no behavior change).
