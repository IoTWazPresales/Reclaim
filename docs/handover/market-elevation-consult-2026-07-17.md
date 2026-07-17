# Market elevation consult — 2026-07-17

**Mode:** Dual-agent CONSULT (Fable)  
**Branch at consult:** `fix/training-confident-ux` @ `e9a02d0` (docs commit after: `d42567d`)  
**Artifacts:** `.tmp/market_elevation_consult_fable_seed.md`, `.tmp/market_elevation_consult_fable_response.md` (local only)

**Verdict:** `CONSULT: READY`

---

## Operator experience (locked direction)

Reclaim stops being five trackers under one roof and becomes the app that **explains** you — every morning it tells you why today’s signal is what it is, what to do about it in today’s training, and lets you test whether a change actually works.

---

## Fable’s architectural read (accepted)

Market is converging on integrated “readiness-in-software” (Whoop-alternative apps) and correlation apps (Bearable / Exist) that **display** “why” but don’t close the loop into guided action. Reclaim already has the ingredients: multi-domain signal → insights → guided strength → notification SSOT. **Nobody owns: multi-domain signal → lagged explanation → readiness-adjusted guided training → self-experiment verification.**

Promote Daily signal from display → **Signal Engine** (observe → explain → act → verify). Reuse existing grains: insight quota surface, progression reason-strings, `setIntent→reconcile`, derive-at-fire-time discipline.

**Play alignment:** a visible readiness feature that honestly consumes steps + active calories turns the fragile HC declaration from a compliance chore into the product narrative.

---

## Ranked ideas (Fable) + Cursor notes

| Rank | Idea | Cursor take |
|------|------|-------------|
| 1 | Lagged cross-domain signal explanations | Strongest DNA fit; zero new permissions; builds on InsightEngine. Guardrails: observational copy only; meds never as correlation inputs. |
| 2 | Readiness → adaptive session planning | High market demand; inject at preview/`suggestLoading` with reason strings; **do not** touch `applySetCompletion`. Best place to resolve Play OQ-1 with feature truth. |
| 3 | N-of-1 experiments (behavioral only) | Premium natural; reminders via existing intent pipeline; never “test your medication.” |
| 4 | Home widget + Wear tile (glanceable signal) | Unblocks deferred widgets with a reason; Wear equity without live workout. |
| 5 | Weekly signal narrative | Cheap once engine exists; retention adjunct. |
| 6 | Clinician-shareable export | Trust + educational boundary; PDF/CSV “for discussion with your professional.” |
| 7 | Live Wear workout companion | Real demand; sequence **after** engine + tiles; touches protected machinery. |

### Rejected (agree)

Chrome-as-strategy · generic AI companion · clinical claims · another siloed tracker · streak/gamification bloat.

---

## Recommended roadmap (4 units)

1. **Signal Ledger + Explanations** — read-side adapters + lagged correlations + insight surface; no schema; no notifs; no protected training functions.  
2. **Readiness + adaptive planning + Play listing** — feature and Console story together.  
3. **Experiments** — intent-based reminders; premium.  
4. **Glanceable surfaces** — widget + Wear tile consuming ledger.

**Human decision before Unit 2:** readiness consumes HC steps/calories by default vs feature-path opt-in (crux of Play resubmit narrative).

---

## Sequencing vs current P0 backlog

Do **not** start Unit 1 until: EAS preview smoke (B-01–B-03) lands, and Play path is chosen (declare+justify vs strip steps/calories). Then Unit 1 is the elevation track; Unit 2 doubles as Play resubmit vehicle.
