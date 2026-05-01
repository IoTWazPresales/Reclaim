# Reclaim — export backfill queue

**Purpose:** When a **full ChatGPT** (and/or other) export lands in `docs/memory/raw/chatgpt/`, use this checklist so import work is **targeted** and **provenance-complete**.  
**Rule:** Each answered item should become at least one row in `reclaim_source_provenance_matrix.md` and, if product-shaping, a row or note in `reclaim_discussion_recon.md`.

**Current gap:** Repo has **one** reconstructed pack (`2026-04-19_*`) plus **no** Oct 2025+ verbatim thread dump. `raw/policies/` is empty.

---

## Earliest Reclaim product vision

- [ ] First articulation of **problem**, **user**, and **non-goals**
- [ ] Relationship to **Welltory** / other apps (pack mentions **2026-03-22** title only — seek full thread)
- [ ] **Recovery assistant** vs **dashboard** vs **coach** framing over time

## First feature set

- [ ] MVP or “v1” feature list as **first** discussed vs what **actually** shipped
- [ ] **Meds / mood / sleep / training** ordering of priority in early chats
- [ ] Anything **promised** in chat that was **never** built (abandoned)

## Earliest home / dashboard concept

- [ ] First **home** layout ideas (tiles, scores, rails, “command center”)
- [ ] **Readiness** / **today score** language — when introduced
- [ ] **Skia** / motion / brand on home — early intent vs Phase 5–6 exports

## Earliest notification philosophy

- [ ] First rules for **when** to notify vs stay silent
- [ ] **Training** notifications design vs **wellness** / **calendar** nudges
- [ ] **Orphan notification** / “naked metric” concerns — exact origin phrasing
- [ ] **iOS** vs **Android** parity discussions predating Phase 6 doc

## Earliest Health Connect / Google Fit discussions

- [ ] When **Fit** was chosen, **deprecated**, or **removed** in conversation (align with Phase 0 + grep)
- [ ] First **HC** scope proposals vs **Play minimum scope** lesson
- [ ] **Streaming** vs **polling** triggers; **stress** auto-push suspension rationale timeline
- [ ] “**All HC fields**” or breadth asks — who said it **when** (cursor export has Mar 2026 — seek earlier if any)

## Earliest Play / privacy / declaration concerns

- [ ] Pre-rejection **warnings** or expectations in chat
- [ ] **Data safety** / **health declaration** drafting discussion (if any) — compare to **OQ-1**
- [ ] **Enrichment-only reads** vs **visible features** — first explicit statement

## Removed ideas that may have been forgotten

- [ ] Features **cut** before export snapshots (e.g. broad HC submit, Fit-era stress)
- [ ] **Wearables** native app vs **notification-mirrored** watch — decision trail
- [ ] **Splash / logo** analytic ellipse narrative vs **ContourMeasureIter** (**Conflict** in inventory)

## Early architecture direction later reversed

- [ ] Strangler JSON phases — which were **seriously planned** vs **aspirational**
- [ ] Repository-layer / sync cutover — dates and **blockers**
- [ ] **Intent store** full cutover vs partial implementation

## Early monetization / launch / retention thinking

- [ ] Subscription, **FREE_RULE_LIMIT**, or pricing chats (if any)
- [ ] **Launch** criteria, **alpha** / **TestFlight**, store **timing**
- [ ] **Retention** loops, notifications cadence, re-engagement — early stance

## Policy artifacts (not only ChatGPT)

- [ ] Import **privacy policy** URL history, **support** contact, **terms** into `raw/policies/` with date
- [ ] Screenshots or text exports of **Play Console** forms (redact secrets)

## Catch-all

- [ ] Any **commit SHAs** or **branch names** only mentioned in old chats
- [ ] **Naming**: “Reclaim” collision, **R-** alternatives — legal/brand follow-up
- [ ] **User** corrections to assistant wrong summaries (high signal for recon)

---

*After a backfill session: update `reclaim_memory_merge_notes.md`, `reclaim_canonical_memory_status.md` (missing sources), and `reclaim_open_questions.md` (close only with evidence).*
