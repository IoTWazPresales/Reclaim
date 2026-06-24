# Medication catalogue → user med → detail surface — wiring audit

**Date:** 2026-06-06  
**Mode:** Read-only audit (no code changes)  
**Target architecture (stated goal):** Catalogue = silent knowledge DB; detail = inline under each user-added med, tied to user data.

---

## Executive summary

Reclaim already has a **212-row static MedicationKnowledge catalogue** bundled in the app and a **separate Supabase `meds` table** for user entries. There is **no `catalog_id`** on user records — matching is **name-only at read time** via `findMedCatalogItemByName()`.

Today, **catalogue knowledge is surfaced on a separate stack screen** (`MedDetailsScreen`) reached by tapping a list row. The **insight engine** consumes medication data as **aggregate adherence %** and optional **PRN footnote strings**; catalogue `mechanism` / tags barely influence insights. **Half of a two-way loop exists on the detail screen:** mood/sleep/adherence → `computeMedContextNotes()` — but **catalog tags are not fused with user state**, and **training is not included**.

---

## PART 1 — The catalogue (knowledge layer)

### 1. Where the catalogue lives

| Layer | Path | Role |
|-------|------|------|
| Core seed (12 rows) | `app/src/data/medCatalog.v1.json` | Hand-curated exemplars (SSRIs, lithium, etc.) |
| Batch 1 (100 rows) | `app/src/data/medCatalog.batch1.json` | Generated governed batch |
| Batch 2 (100 rows) | `app/src/data/medCatalog.batch2.json` | Generated governed batch |
| Loader + lookup | `app/src/lib/medCatalog.ts` | `loadMedCatalog()`, `findMedCatalogItemByName()`, tag label formatters |
| Governance | `app/src/lib/medCatalogGovernance.ts` | `validateMedCatalog()`, controlled vocab, banned phrases |
| QA summary | `app/src/lib/medCatalogQa.ts` | Dev/CI catalog health report |
| Generators | `app/scripts/generateMedCatalogBatch1.mjs`, `generateMedCatalogBatch2.mjs` | Batch seed generation |
| Tests | `app/src/lib/__tests__/medCatalog.test.ts`, `medCatalogGovernance.test.ts`, `medCatalogQa.test.ts` | Matching + governance |

**Row count:** 12 + 100 + 100 = **212** merged rows (`loadMedCatalog()` concatenates all three JSON files).

**Storage model:** Static JSON shipped with the app bundle. **Not** Supabase, not fetched at runtime, not user-editable.

**Type:** `MedCatalogItem` in `app/src/lib/medCatalog.ts` (mirrored as `MedCatalogRow` in governance).

### Fields per catalogue row

| Field | Required | Purpose |
|-------|----------|---------|
| `id` | Yes | Stable slug (e.g. `sertraline`) |
| `genericName` | Yes | Primary display name + index key |
| `brandNames` | Optional | Brand index keys (e.g. Zoloft) |
| `matchAliases` | Optional | Extra exact-match strings |
| `category` | Yes | Taxonomy slug (`ssri`, `nsaid`, `sleep_aid`, …) |
| `medicationClass` | Optional | Human pharmacologic label |
| `activeIngredients` | Optional | Index key when **exactly one** ingredient |
| `mechanism` | Yes | Educational mechanism text |
| `plainEnglishMechanism` | Optional | Shorter plain-language mechanism |
| `commonUses` | Optional | String array |
| `whatYouMightNotice` | Optional | String array (default `[]`) |
| `mentalHealthLinks` | Optional | String array (default `[]`) |
| `onsetWindow` | Optional | General onset timing |
| `durationWindow` | Optional | General duration timing |
| `effectTags` | Optional | Coarse interpretation tags (12 allowed values) |
| `stateImpactTags` | Optional | Where med may act as context (11 allowed values) |
| `confidence` | Yes | 0–1 curation confidence |
| `safetyNote` | Yes | Educational disclaimer |
| `sourceNote` | Optional (required by governance validator) | Provenance / curation note |

**Controlled vocabularies** (`medCatalogGovernance.ts`):

- `ALLOWED_EFFECT_TAGS`: `sleep_relevant`, `mood_relevant`, `pain_masking_relevant`, `training_readiness_relevant`, … (12 total)
- `ALLOWED_STATE_IMPACT_TAGS`: `sleep_interpretation`, `mood_context`, `training_readiness`, `illness_context`, … (11 total)

---

### 2. How a user-added med is matched to a catalogue entry

**When:** At **read/display time only** — not at add/save time.

**Entry point:** `findMedCatalogItemByName(name: string)` in `app/src/lib/medCatalog.ts`

**Normalization** (`normalizeMedName`):

1. Lowercase, trim
2. Hyphens → spaces
3. Strip punctuation
4. Collapse whitespace
5. Strip trailing dosage tokens (`50mg`, `100 mg tablet`, etc.)

**Salt retry** (`stripMedicationSaltSuffix`): second lookup after removing suffixes like `hydrochloride`, `oxalate`, `hcl`, …

**Index keys** (built once, memoized in `buildCatalogIndex()`):

| Key source | Example |
|------------|---------|
| `genericName` | `sertraline` |
| Each `brandNames[]` | `zoloft` |
| Each `matchAliases[]` | `lithium carbonate` |
| `activeIngredients[0]` **only if length === 1** | `ibuprofen` |

**Match types supported:**

| Type | Example input → hit |
|------|---------------------|
| Exact generic | `sertraline` |
| Brand (normalized) | `Zoloft`, `ZOLOFT`, `Zoloft® 50mg` |
| Alias | `Lithium carbonate` → lithium row |
| Salt form | `Escitalopram oxalate` → escitalopram |
| Single active ingredient | Same as generic when one ingredient listed |

**Explicitly NOT supported** (tested + documented):

- Fuzzy / partial match (`Sertra`, `dvil` → `null`)
- Multi-ingredient active-ingredient index (combo products)
- Substring brand fragments

**Consumers of matching today:**

| File | Usage |
|------|-------|
| `app/src/screens/MedDetailsScreen.tsx` | `findMedCatalogItemByName(med.name)` → education UI |
| `app/src/lib/insights/medicationInsightHints.ts` | `catalogLooksPainAdjacent(name)` for PRN pain footnote |

---

### 3. Unknown med (no catalogue match) — fallback

When `findMedCatalogItemByName` returns `null`:

**MedDetailsScreen** (`General profile mode` badge):

| Section | Fallback behavior |
|---------|-------------------|
| Active ingredient & classification | Copy: no curated profile for `"{med.name}"`; tracking still useful; confirm spelling with pharmacist |
| How it works | Generic copy — schedule/reminders/logging still shown; not proof of medication or effect |
| Possible state relevance | Generic context copy (no tags) |
| Education boundary | Static disclaimer only (no `sourceNote` / `safetyNote` from catalogue) |
| Schedule, doses, adherence | **Fully functional** from user record + `meds_log` |

**Insight hints:** `catalogLooksPainAdjacent()` → `false`; generic PRN/scheduled hints still apply from log data without catalogue enrichment.

**No:** autocomplete, external drug API, fuzzy guess, or user-facing catalogue picker at add time.

---

## PART 2 — The user's meds and the detail surface

### 4. User record vs catalogue boundary

**User record** — Supabase table `meds`, type `Med` in `app/src/lib/api.ts`:

```typescript
{ id?, user_id?, name, dose?, schedule?, created_at? }
```

`schedule` is JSON: `{ prn: true }` **or** `{ times: string[], days: number[] }` (1=Mon…7=Sun).

**Dose logs** — `meds_log` / local merge via `MedDoseLog`: `med_id`, `status` (taken|skipped|missed), `scheduled_for`, `taken_at`, `note`.

**Add paths** (catalogue **never consulted**):

| Path | File | Writes |
|------|------|--------|
| Main meds screen | `app/src/screens/MedsScreen.tsx` → `addMut` → `upsertMed()` | `name`, `dose`, `schedule` only |
| Onboarding | `app/src/screens/onboarding/MedsStepScreen.tsx` | Same shape |

**Not stored on user record:** `catalog_id`, `mechanism`, `effectTags`, `category`, or any curated field.

**Boundary rule:**

| Layer | Owns |
|-------|------|
| **User `meds` + `meds_log`** | Identity (`name`), dose text, schedule, adherence history — **source of truth for tracking** |
| **Catalogue JSON** | Educational overlay keyed by **normalized `med.name` string** at display time — **read-only knowledge** |

Fragility: catalogue link depends entirely on user-typed name spelling; renaming a med changes or breaks the match with no migration.

---

### 5. Tap-a-med → detail flow

**Navigation stack:**

```
Drawer "Meds" → MedsStack (app/src/routing/MedsStack.tsx)
  ├── MedsHome  → MedsScreen
  └── MedDetails → MedDetailsScreen  { id: string }
```

Registered in `app/src/routing/AppNavigator.tsx` (drawer). Deep link: `reclaim://meds/:id` → `MedDetails` (`RootNavigator.tsx`).

**Tap on MedsScreen** (`List.Item`):

```typescript
onPress={() => navigation.navigate('MedDetails', { id: m.id! })}
```

- **Row tap** → push `MedDetails` with med `id`
- **Pencil** → inline edit on `MedsScreen` (does **not** open detail)
- **PRN check icon** → `logMedDose` inline on list

**Other entry points:**

| Entry | Behavior |
|-------|----------|
| `navigateToMeds(focusMedId)` (`app/src/navigation/nav.ts`) | `App → Meds → MedDetails { id }` |
| `navigateToMeds()` | Lands on `MedsHome` only |
| Notification `dest === 'Meds'` | `MedsHome` only (no auto-detail) |
| `MedsHome` params `focusMedId` | Highlights row; **does not** auto-open detail |

**MedDetailsScreen** (`headerBackVisible: false`). Footer link **"Open in Meds to edit"** calls `goBack()` — edit remains on list screen form.

**Screen structure today:** Full-page `ScrollView` with ~10 sections (not inline under list item).

---

### 6. Does detail pull mechanism / "why" from the catalogue?

**Yes — for mechanism/education; partially for "why today".**

**Catalogue lookup** (detail only):

```typescript
const catalogMatch = useMemo(() => (med ? findMedCatalogItemByName(med.name) : null), [med]);
```

Badge: **"Curated profile available"** vs **"General profile mode"**.

| Section | Data source | Catalogue fields used |
|---------|-------------|----------------------|
| Header | User `med` | — |
| Schedule & reminders | User `med.schedule` + `SchedulingCard` | — |
| Active ingredient & classification | Catalogue if match | `activeIngredients`, `medicationClass`, `category` |
| **How it works** | Catalogue (`CatalogEducationBlock`) | `mechanism`, `plainEnglishMechanism`, `commonUses`, `onsetWindow`, `durationWindow`, `whatYouMightNotice`, `mentalHealthLinks`, `confidence` |
| **Why this may matter today** | `computeMedContextNotes()` | **Catalogue passed in input but unused in rules** |
| Possible state relevance | Catalogue (static list) | `effectTags`, `stateImpactTags` — **not cross-checked with user state** |
| Recent doses / 30-day summary | User `meds_log` | — |
| Education boundary | Static + catalogue | `sourceNote`, `safetyNote` |

**"How" vs "Why" distinction:**

- **How (mechanism):** catalogue-driven in `CatalogEducationBlock` (`app/src/screens/MedDetailsScreen.tsx` ~674–727)
- **Why today:** pattern rules in `app/src/lib/medIntelligence.ts` from **mood, sleep, adherence** — **not** catalogue-driven

`MedContextInput.catalog` is typed and populated but **never read** inside `computeMedContextNotes()`.

---

## PART 3 — The insight engine connection (the loop)

### 7. Does the insight engine read medication data?

**Yes — behavioral/schedule telemetry only.**

| Step | File | Function | Reads |
|------|------|----------|-------|
| Orchestration | `app/src/providers/InsightsProvider.tsx` | `refresh()` → `fetchInsightContext()` → `engine.evaluateAll()` | Full `InsightContext` |
| Context build | `app/src/lib/insights/contextBuilder.ts` | `medsContext()` | `listMedDoseLogsForInsights(7)`, `listMeds()` |
| Adherence | `app/src/lib/medicationSchedulePolicy.ts` | `computeAdherenceFromSchedule()` | Scheduled meds + taken logs (7d) |
| Hints | `app/src/lib/insights/medicationInsightHints.ts` | `buildMedicationInsightHints()` | Today's `taken` logs + PRN/scheduled classification |

**Output on `InsightContext.meds`** (`app/src/lib/insights/InsightEngine.ts`):

```typescript
meds?: {
  adherencePct7d?: number;
  contextHints?: string[];  // educational footnotes only — not scored
}
```

**Not consumed by context builder:** `dose`, per-med identity, `mechanism`, `effectTags`, `stateImpactTags`, `category`, `catalog_id`.

**Insight rules** (`app/src/data/insights.json`): all med-conditioned rules use **`meds.adherencePct7d`** only (e.g. `meds-high-consistency`, `meds-rebuild`, `cross-meds-mood-drop`, `cross-stress-sleep-meds`).

**Display of hints (not scored):**

- `app/src/screens/Dashboard.tsx` → `DashboardInsight`
- `app/src/screens/MedsScreen.tsx` → `MedicationContextFootnotes`

---

### 8. Existing paths: catalogue → insight, user data → med detail

#### Catalogue mechanism / tags → insights

**Minimal — one narrow hook:**

`app/src/lib/insights/medicationInsightHints.ts`:

- `catalogLooksPainAdjacent(name)` → `findMedCatalogItemByName()` → regex on joined `effectTags` + `stateImpactTags` for pain/analgesic/nsaid/inflamm
- Used **only** when a **PRN med was logged `taken` today** → adds one extra cautious footnote
- **`mechanism` / `plainEnglishMechanism`:** never used in insight pipeline
- Hints are **UI footnotes**, not rule inputs — engine does not rank insights from catalogue

#### User tracked data → med detail

**Yes — separate pipeline via `medIntelligence`:**

`MedDetailsScreen` queries directly (not `fetchInsightContext`):

- `listMoodCheckins(30)` → mood latest, 3d trend, tags
- `listSleepSessions(14)` → last night hours, 7d average
- Dose logs → adherence %, missed doses (3d), unknown status

Feeds **`computeMedContextNotes()`** → section **"Why this may matter today"**

| Rule | Triggers | Reason codes |
|------|----------|----------------|
| Stress/mood | stress flag, mood tags, latest ≤ 2, trend ≤ -10% | `stress_flag`, `mood_latest_low`, … |
| Sleep | last night < 6h, 7d avg < 6.5h | `sleep_lastNight_low`, `sleep_avg7d_low` |
| Adherence | adherence < 70%, missed doses ≥ 1 | `adherence_low`, `missed_doses_recent` |

**Training:** not consumed on med detail (only mentioned in static "Possible state relevance" copy).

**Catalogue tags on detail:** displayed as static labels — **no fusion** with user's actual sleep/mood/training state.

**Adjacent (not med detail):** `MoodScreen.tsx` — `medsCauseHint` correlates med adherence by day with mood (separate from `MedDetailsScreen`).

---

### 9. What's MISSING for a two-way loop

#### Med mechanism / tags → insight context

| Gap | Detail |
|-----|--------|
| No catalog on `InsightContext` | Tags/mechanism/class never enter `fetchInsightContext` |
| Single scored field | Only `meds.adherencePct7d`; no per-med tags, PRN flags, pain-adjacent signal in rules |
| Hints ≠ rules | `contextHints` are display-only; engine cannot select/boost insights from catalogue |
| Crude tag use | Tags only drive pain-regex for one PRN hint line |
| `mechanism` unused | Rich text never influences rule matching or message copy |
| Aggregate adherence | No per-med or per-class adherence in context |
| No tag→domain routing | e.g. `sleep_relevant` does not boost sleep-scoped insights |

#### User data → med detail (personalized + catalogue-aware)

| Gap | Detail |
|-----|--------|
| `catalog` ignored in `computeMedContextNotes` | Tags/mechanism don't shape which notes fire or note wording |
| No training slice | `training.*` from insight context not on med detail |
| Duplicate pipelines | Detail re-fetches mood/sleep; doesn't reuse `InsightsProvider.lastContext` |
| Tags not matched to user state | No "your sleep was low + this med is `sleep_relevant`" fusion |
| PRN adherence omitted from notes input | Scheduled-only adherence passed; PRN gets mood/sleep rules only |
| No insight feedback loop | Insight match reasons don't flow back into med detail |
| Separate screen | Detail is stack push, not inline expansion under list item |
| No catalogue link at add time | Name-only matching is fragile; no `catalog_id` persistence |

---

## Diagram (a) — Current flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ KNOWLEDGE LAYER (static, bundled)                                           │
│ medCatalog.v1.json + batch1 + batch2  (212 rows)                            │
│ app/src/lib/medCatalog.ts — loadMedCatalog(), findMedCatalogItemByName()    │
│ Fields: mechanism, effectTags, stateImpactTags, sourceNote, confidence, …   │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │ read-time name match only (no catalog_id)
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ USER LAYER (Supabase + local)                                               │
│ meds: { id, name, dose?, schedule? }  — upsertMed() on add/edit             │
│ meds_log: { med_id, status, scheduled_for, taken_at }                       │
│ Add: MedsScreen / MedsStepScreen — catalogue NOT consulted                  │
└───────────────┬─────────────────────────────┬───────────────────────────────┘
                │                             │
                │ tap row                     │ dose logs + schedule
                ▼                             ▼
┌───────────────────────────────┐   ┌─────────────────────────────────────────┐
│ DETAIL SURFACE                │   │ INSIGHT ENGINE                          │
│ MedDetailsScreen (stack push) │   │ contextBuilder.medsContext()            │
│                               │   │   → adherencePct7d (7d, scheduled)    │
│ FROM CATALOGUE:               │   │   → contextHints (PRN/scheduled text)   │
│  • How it works (mechanism)   │   │ medicationInsightHints:                 │
│  • Tags (static labels)       │   │   catalogLooksPainAdjacent() ──► 1 hint │
│  • sourceNote, safetyNote     │   │ InsightEngine + insights.json:          │
│                               │   │   rules use meds.adherencePct7d ONLY    │
│ FROM USER DATA:               │   │                                         │
│  • Schedule, dose logs        │   │ Display hints on:                       │
│  • computeMedContextNotes()   │   │  Dashboard, MedsScreen footnotes        │
│    (mood, sleep, adherence)   │   │                                         │
│  • catalog field UNUSED ──X   │   │ mechanism/effectTags NOT in rules ──X   │
└───────────────────────────────┘   └─────────────────────────────────────────┘
                │
                │ goBack → edit on MedsScreen
                ▼
         MedsScreen (list + inline add/edit form)
```

---

## Diagram (b) — Files to change for inline detail under selected med

Target: detail renders **inline** under the tapped med row; mechanism from catalogue; hook for user data (mood/sleep/training/adherence).

### Screens & navigation

| File | Why |
|------|-----|
| `app/src/screens/MedsScreen.tsx` | Replace stack navigation with expand/collapse or accordion per med; host inline detail panel |
| `app/src/screens/MedDetailsScreen.tsx` | Extract presentational sections into reusable components OR deprecate as standalone screen |
| `app/src/routing/MedsStack.tsx` | Remove or demote `MedDetails` route if detail becomes inline-only |
| `app/src/routing/AppNavigator.tsx` | Update deep link `meds/:id` strategy (scroll-to + expand vs push) |
| `app/src/routing/RootNavigator.tsx` | Same deep-link mapping |
| `app/src/navigation/nav.ts` | `navigateToMeds(focusMedId)` → expand inline instead of `MedDetails` push |

### New / extracted UI components

| File | Why |
|------|-----|
| `app/src/components/meds/MedInlineDetailPanel.tsx` *(new)* | Inline container: header, schedule, education, context notes, logs |
| `app/src/components/meds/CatalogEducationBlock.tsx` *(extract from MedDetailsScreen)* | Mechanism / uses / timing from catalogue |
| `app/src/components/meds/MedContextNotesBlock.tsx` *(new)* | "Why this may matter today" from `computeMedContextNotes` |
| `app/src/components/meds/MedDoseHistoryBlock.tsx` *(extract)* | Recent doses + 30-day summary |
| `app/src/components/meds/MedScheduleBlock.tsx` *(extract)* | Schedule + `SchedulingCard` |
| `app/src/components/MedicationContextFootnotes.tsx` | May move or duplicate hints inline if desired |

### Catalogue & matching (optional hardening)

| File | Why |
|------|-----|
| `app/src/lib/medCatalog.ts` | Possibly expose `findMedCatalogItemByName` + stable `catalog.id` for persistence |
| `app/src/lib/api.ts` | Optional: add `catalog_id?` or `catalog_match_key?` on `Med` type + `upsertMed` |
| `app/src/screens/MedsScreen.tsx` | Optional: catalogue autocomplete on add; persist match key |
| `app/src/screens/onboarding/MedsStepScreen.tsx` | Same if onboarding should link to catalogue |

### Intelligence & two-way loop

| File | Why |
|------|-----|
| `app/src/lib/medIntelligence.ts` | **Use `catalog` in rules** — fuse tags with mood/sleep/training signals; personalized copy |
| `app/src/lib/insights/contextBuilder.ts` | Add per-med or tag-summary fields to `InsightContext.meds` if insights should use mechanism/tags |
| `app/src/lib/insights/InsightEngine.ts` | Extend `InsightContext.meds` type |
| `app/src/lib/insights/medicationInsightHints.ts` | Broaden tag→hint mapping beyond pain-regex |
| `app/src/data/insights.json` | New rules referencing med tags or per-domain context (if product wants scored insights) |
| `app/src/providers/InsightsProvider.tsx` | Optional: shared context hook for inline detail (avoid duplicate fetches) |

### Data fetching / hooks

| File | Why |
|------|-----|
| `app/src/hooks/useMedDetailContext.ts` *(new)* | Single hook: med + catalog match + mood/sleep/logs + `computeMedContextNotes` |
| `app/src/lib/api.ts` | Already has list/query helpers; may add focused fetch by `med_id` |

### Tests

| File | Why |
|------|-----|
| `app/src/lib/__tests__/medIntelligence.test.ts` | Cover catalogue-aware note rules |
| `app/src/lib/__tests__/medCatalog.test.ts` | Unchanged unless matching changes |
| `app/src/screens/__tests__/MedsScreen*.test.tsx` *(new if missing)* | Inline expand, catalogue block visibility |

### Notifications & dashboard (entry points)

| File | Why |
|------|-----|
| `app/src/hooks/useNotifications.ts` | Med notification → expand inline med vs stack push |
| `app/src/screens/Dashboard.tsx` | Links to meds may need `focusMedId` + expand behavior |

### Documentation / governance (non-runtime)

| File | Why |
|------|-----|
| `docs/audits/med-catalogue-detail-wiring-audit.md` | This document (baseline) |
| `app/src/lib/medCatalogGovernance.ts` | If new tags needed for training/insight fusion |

---

## File index (existing, read during audit)

| Path | Role |
|------|------|
| `app/src/data/medCatalog.v1.json` | Core catalogue seed |
| `app/src/data/medCatalog.batch1.json` | Batch 1 seed |
| `app/src/data/medCatalog.batch2.json` | Batch 2 seed |
| `app/src/lib/medCatalog.ts` | Catalogue types, load, match |
| `app/src/lib/medCatalogGovernance.ts` | Validation, tag vocab |
| `app/src/lib/medCatalogQa.ts` | QA summary |
| `app/src/lib/api.ts` | `Med`, `upsertMed`, dose logs |
| `app/src/lib/medicationSchedulePolicy.ts` | PRN/scheduled, adherence |
| `app/src/lib/medIntelligence.ts` | `computeMedContextNotes` |
| `app/src/lib/insights/contextBuilder.ts` | `medsContext` |
| `app/src/lib/insights/medicationInsightHints.ts` | Insight footnotes |
| `app/src/lib/insights/InsightEngine.ts` | `InsightContext.meds` |
| `app/src/data/insights.json` | Med adherence rules |
| `app/src/screens/MedsScreen.tsx` | List, add, tap → detail |
| `app/src/screens/MedDetailsScreen.tsx` | Full detail surface |
| `app/src/routing/MedsStack.tsx` | Stack routes |
| `app/src/navigation/nav.ts` | `navigateToMeds` |
| `app/src/components/MedicationContextFootnotes.tsx` | Insight hints on meds list |
| `app/src/providers/InsightsProvider.tsx` | Insight orchestration |

---

## Bottom line

The catalogue is a **mature static knowledge layer** (212 rows, governed tags, exact-name matching) but is **wired only to a separate detail screen** and **one pain-adjacent insight hint**. User meds are **tracking-only records** with **no persisted catalogue link**. The planned move to **inline detail under each med** requires primarily **`MedsScreen` + extracted components + navigation/deep-link updates**; closing the **two-way loop** requires **`medIntelligence` to consume catalogue tags** and optionally **`contextBuilder` / `insights.json` to expose tag-aware insight context**.
