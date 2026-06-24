---
description: Reclaim premium re-skin — standing guardrails for all UI work
alwaysApply: true
---

# RECLAIM — PREMIUM RE-SKIN · STANDING BRIEF

You are re-skinning **Reclaim** (Expo / React Native, react-native-paper MD3).
The app is already deep, animated, and well-built. You are changing the
**identity layer only** — colour, type, surface chrome, and the paywall pitch.
Do **not** add features, animations, or retention mechanics; they already exist.

Audit baseline: **6.8 / 10 (B)**. Target after this work: **A−**.
The single biggest lever is brand identity (currently 4.5/10): default-blue
accent + zero custom fonts make a sophisticated app read as a generic template.

---

## SCOPE — you may touch ONLY

- `app/src/theme/*` — tokens, MD3 theme config
- Component **style props** and the hex → token swap
- `PaywallModal.tsx` and premium presentation
- `fonts/` + `expo-font` loading
- Pure **extraction** of `Dashboard.tsx` tiles (move markup, never logic)

## NEVER touch

- `lib/training`, `lib/insights` — the engines
- `lib/notifications` — scheduler & intents
- `providers/`, persistence, AsyncStorage keys
- Hook **behaviour** (only their styled output)
- RevenueCat entitlement / product IDs

If a step would touch anything in NEVER, it is the wrong step. Stop and ask.

---

## TARGET TOKENS (exact — from the Binaxis Core design system)

| Token            | Today (in repo)              | Target                                                    |
|------------------|------------------------------|-----------------------------------------------------------|
| Primary accent   | `#2563eb` / `#60a5fa`         | `oklch(0.770 0.105 196)` — restorative teal               |
| Critical / error | `#ef4444` (stock neon)        | `oklch(0.660 0.180 22)` — calm, desaturated               |
| Domain accents   | hardcoded hex, per-file       | `theme.domainAccents` — one tokenised, teal-anchored set  |
| Display font     | Roboto / system (none loaded) | **Schibsted Grotesk** 700/800 via `expo-font`             |
| Body / UI font   | Roboto / system (none loaded) | **Hanken Grotesk** 400/500/600 via `expo-font`            |
| Type scale       | MD3 default (compressed)      | widened display tier; mono captions for labels/values     |
| Radius           | mixed MD3 defaults            | one scale — `14px` cards / `20px` sheets                  |
| Elevation        | stock MD3 shadow tiers        | one soft, low-opacity glow — hairline + diffuse           |

Known hex to centralize (real, verified):
- `CelebrateRow.tsx` → `DOMAIN_ACCENT = { mood: '#60a5fa', sleep: '#818cf8', meds: '#34d399' }`
- `theme/index.ts` → `tertiary: '#34d399'`

---

## REGRESSION GATE — after every step, must be green

```
tsc --noEmit  &&  npm test     # + smoke-test light AND dark themes
```

- One commit per step. One phase per branch.
- A re-skin commit's snapshot diff must show **colour / type only** — nothing
  structural. If layout moved, you changed too much.
- The repo already has a Jest suite (e.g. `InsightCard.test.tsx`, notification
  parity tests). Green tests + clean types = no regression.

---

## PHASES — work in order

### Phase 0 · Safety net (~½ day)
- 0.1 Confirm green baseline: run `tsc --noEmit` + `npm test`, record what passes.
- 0.2 Snapshot Dashboard, a hero, paywall, streaks — in **light and dark**.
- 0.3 **Baseline capture path (decided):** use **native dev client** (Android/iOS) or
      **Maestro** for pixel-accurate PNGs; keep `docs/reskin/phase-0/` token HTML
      baselines for colour-only diffing in CI. **Do not block Phase 1 on Expo web** —
      web currently crashes on Skia `Path` at boot; fix web separately if browser QA
      is needed.

### Phase 1 · Identity tokens (~3–4 days) — the main lever
- 1.0 **Theme toggle:** stop hardcoding `appDarkTheme` in `App.tsx`. Add
      `appearanceMode: 'system' | 'light' | 'dark'` (persist via `userSettings` or
      dedicated key), resolve with `useColorScheme()` when `system`, and expose a
      Settings control (System / Light / Dark). Gate: both themes smoke-testable on
      device without rebuild; default stays **system**.
- 1.1 Swap accent in `theme/index.ts`: `primary`/`secondary` → restorative teal.
- 1.2 Add `theme.domainAccents` + semantic map; replace `DOMAIN_ACCENT` and
      `*Hero` hex literals with token refs. Grep for `#`-hex in `components/` after.
- 1.3 Replace `#ef4444` and other stock semantics with calm, desaturated tokens.
- 1.4 Gate: `tsc` + `jest` green; snapshot diff = colour only.

### Phase 2 · Type, structure & performance (~4–5 days)
- 2.1 Add `expo-font` (Schibsted Grotesk + Hanken Grotesk); set Paper theme
      `fonts` so all `<Text>` inherits. Gate behind splash — no fallback flash.
- 2.2 Widen the type scale so titles / values / captions are distinct tiers.
- 2.3 Split `Dashboard.tsx` (2,748 lines → ~10 tiles). Pure extraction, props
      unchanged, no logic moved. Behaviour snapshot must be identical.
- 2.4 Gate infinite `withRepeat` hero loops on `useIsFocused` / viewability +
      `prefers-reduced-motion`. Recover frames without removing animation.
- 2.5 Gate: `tsc` + `jest` green; profile a hero-heavy screen on mid Android.

### Phase 3 · Premium surface & pitch (~3–4 days)
- 3.1 Unify chrome: one radius + one elevation/glass language, theme-level.
- 3.2 Rewrite `PaywallModal`: transformation headline (not a feature list),
      trial + annual-anchor from RevenueCat offerings, quiet trust/privacy line.
- 3.3 Surface the gate that already exists — add an in-context
      "10 of 84 insights" counter so users feel the ceiling.
- 3.4 Reserve the richest motion (confetti / hero polish) for premium surfaces.
- 3.5 Gate: sandbox purchase + restore smoke test; `tsc` + `jest` green.

---

## DEFINITION OF DONE

A phase is finished only when its outcomes are **visible and measurable**, not
when code merges.

- **Phase 1:** appearance toggle works (system/light/dark); zero `#`-hex colour
  literals in `components/`; every accent resolves from one theme source; no stock
  `#ef4444`; snapshot diff colour-only.
- **Phase 2:** custom fonts load behind splash (no flash); distinct type tiers;
  `Dashboard.tsx` is ~10 tiles with identical behaviour; hero screen holds FPS.
- **Phase 3:** paywall leads with transformation; trial + annual anchor render
  live; locked-insight counter present; sandbox purchase AND restore pass.
- **Always:** `tsc --noEmit` + `jest` green at every commit; engine, data,
  notification & entitlement layers byte-identical; light and dark smoke-tested.

---

**Work the phases in order. Stop and ask before any change outside SCOPE.**
**If a step would touch the engine, it is the wrong step.**
