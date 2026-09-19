---
eif: design-experience-record
version: 0.3
status: active
last_updated: 2026-09-19
owner: UX-003
review_after: 90d
provenance: design-direction
not_a_baseline: true
audit_id: N-0030
---

# Design experience record — N-0030

Material design intelligence. **Not** an implementation baseline.

Routed this pass: UX-001 (journey/friction), UX-002 (SHOULD-BE architecture), UX-003 (art direction + rendered competition), UX-005 (targets/contrast), CR-006 (anti-sameness).

## Artifact class

- node id: N-0030
- `target_artifact_class:` high_fidelity
- delivered `design_artifact_class`: high_fidelity (candidates; operator has not selected)
- sequence: follows failed ia_concept sketches (brown token lab; then photocopy of current Home)

## Materiality

- class: redesign / explicit-request (C-D Hearth + “show the current app in a new UI”)
- activation: GATE 1 Hearth; operator rejected khaki; then rejected photocopy

## AS-IS (observed pixels, not docs)

Dark Home: Skia brain, domain nodes, greeting + Daily signal **paragraphs**, hamburger, Home/Analytics/Settings tabs.
Training: Today/History, Next Session card, 7-day columns, 4-week accordion.
Guided session: numeric steppers, RPE essay, Done.
Sleep: insight essay first; hypnogram/rings exist lower.
Analytics (empty-data shot): stacked instruction cards, almost no chart.
Schedule on Home: spine + **text rows** (“Your day, gently orchestrated.”).

## UX-001 journeys (simulated from those pixels)

1. Open app → know what to do today: **weak** — greeting, sync, insight essay, then session.
2. See whether sleep/mood should change the session: **buried** in prose.
3. Start training / log a set: **strong** once on Training, but Home does not show the week or the bar path.
4. Read a graph: **fails** on empty Analytics; Home has no sparkline.

## UX-002 SHOULD-BE architecture (PROPOSAL)

Retain: drawer destinations, tabs, constellation DNA, guided set completion, Health Connect, educational meds.
Redesign Home from stacked essays → **one visual day**.
Surface schedule as **duration geometry**, not paragraphs.
Surface training week + **bar-path diagram** on Training and Session.
Surface 28-day overlay on Analytics even in the prototype (mock populated state — empty-state cards are not the work object).
Park: brown journal; Forge/Signal as palettes; Design Lab chips on the product surface.

## Art direction (PROPOSAL)

- character: Reclaim stays teal-on-navy, illustrative, animated. Hearth = **why today**, not brown paint.
- density: visual channels first; one short line of copy per module.
- DNA without logo: brain + domain hues + teal capsules.

## Divergence (≥3, structural)

| Direction | Philosophy / spatial / hierarchy | Status |
|---|---|---|
| **Lumen** | Constellation kept (compressed). Home = day rail + hypnogram + mood spark + week volume + 8-word why. Training = volume columns + bar-path card. Session = diagram + huge numerals. Analytics = overlay chart. | **candidate (recommended)** |
| **Pulse** | Instruments-first. No constellation. Sleep ribbon / mood spark / load bar are the Home. Graphs dominate. | **candidate (contrast)** |
| **Atlas** | Session board IS Home (Forge structure on Reclaim DNA). Week columns hero; brain as 28px header orb. | **not rendered this pass** — same week object as Lumen Training; diminishing return vs Lumen |
| Brown Hearth (Sep 19 a) | Editorial khaki journal, no chrome | **rejected** operator: “looks like poo” |
| Photocopy (Sep 19 b) | Current Home + extra text card | **rejected** operator: identical, text-heavy, no graphs/schedule/training |

## Design signatures

1. **Day is a picture** — time is length/colour, not a sentence.
2. **Numerals do the talking** — 5h 40m, 60 kg, × 8; captions ≤ 8 words.
3. **Bar path is a diagram** — geometric press, not a swinging-arm stick figure.
4. **Brain stays** (Lumen) as identity, not as a second dashboard of labels.

## Identity tokens (`high_fidelity`)

- direction_name: Lumen (Hearth execution)
- type_pairing: extraBold numerals 22–42pt; 12pt muted captions; no body paragraphs on Home
- numeral_treatment: duration, load, reps as display; times 11pt
- rule_weight: 6px day-rail, 8px sleep stages, 2.2px overlay strokes
- accent_limit: existing domain hues only (teal / sleep cyan / mood pink / training coral / meds mint). No khaki.

## Interaction spec

- drill-down: Home rail → Day map; week column → Session; hamburger → drawer (same destinations)
- named actions: Start Upper Strength; Start; Done; Open navigation menu
- work surface: Session (diagram + load/reps + rest ring + Done)

## State coverage

Populated: rendered. Loading/empty/error: **not rendered this pass** (Analytics empty AS-IS is exactly what we are refusing to prototype as the happy path). Blocked/confirm: N/A for browse mocks.

## Execution decisions

| Slot | Status | Rationale |
|---|---|---|
| responsive_decision | applicable | Phone-first; rail widths from `useWindowDimensions` |
| visualisation_decision | applicable | Sleep/mood/training are the differentiator; charts are causal not decorative |
| consequential_action_decision | applicable | Start / Done are the journeys; no extra confirm in the mock |

## Rendered comparison

artifact_class: high_fidelity. Device shots under `.eif/audit/N-0030/`.

| Criterion | Lumen | Pulse |
|---|---|---|
| task clarity | stronger — Start sits under the week you can see | weaker — no session object |
| operational density | stronger — week + rail + session path | adequate — three instruments, no plan |
| hierarchy | stronger — size of 60kg / 5h40 vs captions | adequate — stacked instruments, similar weight |
| distinctiveness | stronger vs current (rail + diagram) while keeping brain | weaker DNA (brain gone) |
| state handling | populated only | populated only |
| product fit | stronger for rebuilding + training | tracker-adjacent |

**Selected (recommendation):** Lumen. **Rejected this pass:** Pulse as Home; brown; photocopy; Atlas unrendered.

## Operator park (2026-09-19)

Operator: Lumen is the direction, not a ship. Menu is weak. Icon use and card separation are open. **Park C-D / N-0030.** Do not implement production shell this wave. Decision **D-0003** supersedes D-0001.

## CR-006 sameness review

- IA: still hamburger + tabs (justified — operator asked where the menu went; destinations are the product).
- visual-vocabulary: previous lab failed (equal cards + pills + body copy). Lumen replaces that with rail, stage ribbon, stacked volume, overlay paths, geometric lift diagram.
- familiar on purpose: teal capsules, drawer tiles — they are Reclaim, not a SaaS template.

## Prototype voice

- immersive mocks have product copy only.
- picker labels (“Lumen · Today”) live on the lab picker, not on the mock.

## UX-005

- CTAs minHeight 48. Menu labelled. Charts have accessibilityLabel. Contrast: teal on navy (existing product). Session numerals large. Reduced-motion: hero animation off in lab.

## Operational excellence

- repeated task: Start from Home without reading Daily signal.
- scan: colour blocks before words.
- edge: retry still a later N-0005 surface, not this record’s hero.
