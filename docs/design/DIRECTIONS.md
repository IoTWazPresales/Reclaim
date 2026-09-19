# Three UI directions (A6) — proposals only

**Date:** 2026-09-19  
**Production screens:** not changed.  
**Harness:** `__DEV__` drawer route **Design Lab** (`app/src/screens/dev/DesignLabScreen.tsx`) with tokens in `app/src/theme/designLab/directions.ts`.  
**Screenshots:** Design Lab is behind login. A2 installed 1.0.5/vc15 debug + Metro, but the AVD has **no session** after uninstall of the signature-mismatched Play APK. Direction mock captures under `docs/design/directions/<forge|hearth|signal>/` are **UNABLE_TO_VERIFY** until an authenticated session can open the `__DEV__` drawer. Auth-only A2 shots: `docs/design/screenshots/`.

Tokens (colour, type, spacing, radius, elevation, motion) and IA copy are in `directions.ts` — source of truth for the lab.

## Forge

- **Who:** people who need the next set more than another chart.
- **IA:** Home = today’s session + Start guided.
- **Shape:** sharp 4dp, ember on steel, display 32/800, motion 120ms, elevation 8.
- **Risk:** looks like a gym logger; collides with Fitbod/Hevy.

## Hearth (recommended)

- **Who:** people rebuilding a life, not a PR.
- **IA:** Home = today’s rebuilding narrative; training is a chapter; insights answer why.
- **Shape:** 20dp radius, warm paper, display 28/600, motion 280ms, elevation 2.
- **Why recommend:** only direction that puts Reclaim’s differentiators on Home without pretending we are Bearable or Fitbod.

## Signal

- **Who:** n-of-1 trackers who want an instrument panel.
- **IA:** Home = ranked signals; Insights is the primary tab.
- **Shape:** 2dp hairline, cyan, tabular 13/500, motion 0.
- **Risk:** clinical chill; collides with Bearable/Welltory; worse for burnout.

## Key screens mocked in Design Lab

Home · Training day + Guided session · Insights · Meds — switchable per direction with mock data. Real `AppCard` is ink-locked (`#1A2742`) so the lab paints local surfaces from direction tokens.

## GATE 1 question

Which direction should Stage C implement via tokens first? Recommendation: **Hearth**.
