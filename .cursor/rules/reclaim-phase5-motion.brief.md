---
description: Reclaim Phase 5 — calm premium motion, tile depth, the long-term arc
alwaysApply: false
---

# RECLAIM — PHASE 5 · CALM PREMIUM MOTION & DEPTH

Builds on the completed re-skin (Phases 1–4). This phase closes the gap between
"impressive" and "I trust this with my recovery." It does **presentation only** —
no engine, data, notification, or entitlement changes.

**Design principle for this phase: calm, not stimulating.** This is a
mental-health / recovery app. The audience skews toward anxiety, sensory
sensitivity, and ADHD. Every motion must read as *soothing and alive*, never
*busy or attention-grabbing*. When in doubt, make it slower and smaller.

**Deliberately NOT doing:** full gyroscope/device-motion parallax as a headline
effect (wrong for this audience; invisible when the phone is still; trope-y).
A 3px tilt on the hero only is the maximum, optional, and reduced-motion gated.

---

## SCOPE — touch ONLY
- `app/src/theme/*` and the chrome tokens from Phase 3
- Dashboard tile components (`components/dashboard/*`) — style + motion wrappers
- A new ambient-background component + a reusable entrance/press wrapper
- Haptics calls at existing success callsites (no new logic, just feedback)
- A new read-only "trend" presentation component fed by EXISTING insight data
- `app.config.ts` + `assets/splash*` for the splash regen

## NEVER touch
- `lib/training`, `lib/insights`, `lib/notifications` — engines & scheduler
- `providers/`, persistence, AsyncStorage keys, RevenueCat IDs/entitlements
- Hook **behaviour** — only styled output and where feedback fires
- Any data shape. The trend view READS existing history; it computes nothing new.

## DEPENDENCIES
- `react-native-reanimated` (4.1) and `@shopify/react-native-skia` (2.2) are
  already installed and in use. Reduced-motion: use Reanimated's `useReducedMotion()`.
- `expo-haptics` is ALREADY installed AND there is already a `haptics.ts` util in
  the repo — usage is just limited. Step 5.4 WIRES that existing util into more
  callsites; do NOT add the dep or a second haptics layer.
- `expo-blur` is NOT installed — do the aurora with **Skia** (already present),
  not blurred native views. Don't add expo-blur.
- `expo-sensors` is NOT installed — only add it if you do the optional hero tilt (5.7).
- Fonts (`@expo-google-fonts/hanken-grotesk` + `schibsted-grotesk`) are already
  installed from Phase 2 — don't touch font setup here.

## GLOBAL MOTION GUARDS — apply to everything in this phase
- Respect `useReducedMotion()` (Reanimated) — when true, render the calm
  END STATE with NO animation. Never ship a pre-animation hidden state to
  reduced-motion, print, or first paint.
- Pause all ambient loops when the screen is unfocused (`useIsFocused`) and when
  `AppState` is background. No animation runs off-screen.
- Ambient motion budget: sub-perceptual. Periods ≥ 4s, travel ≤ 8px, opacity
  swings ≤ 0.15. If a reviewer can tell it's "animating" at a glance, it's too much.

## REGRESSION GATE — after every step, must be green
```
npm run typecheck  &&  npm test     # typecheck = tsc --noEmit; test = vitest run
```
Also smoke light AND dark, + reduced-motion ON.
One commit per step. One branch for the phase. Snapshot diffs should show
surface/motion only — no layout or data changes.

---

## STEPS

### 5.1 · Tile depth — kill the four black voids  [low risk]
The 2×2 tiles (Prediction / Last Night / Mood / Training) read flat because
they're near-black on near-black.
- Add a faint **domain-tinted radial glow** behind each tile's content, pulled
  from `theme.domainAccents` (sleep → teal/indigo, training → teal, mood → soft
  warm, prediction → violet). Low opacity (~0.10–0.16), large soft radius.
- Make the **data viz the hero**: brighten and enlarge the hypnogram / sparkline;
  raise its contrast against the tile. The number/graph should be the focal point.
- One radius + one border treatment from the Phase 3 chrome tokens. No new colours.
- DoD: the four tiles are visually distinct by domain; data viz is the brightest
  element in each; snapshot diff is surface-only.

### 5.2 · Ambient aurora drift — the always-on calm layer  [watch]
This is the headline premium effect (replaces parallax).
- A single reusable background component: 2–3 large, soft, blurred colour blobs
  (teal + indigo + a faint warm) that drift on independent slow loops
  (periods 8–16s, eased, looping). Think "aurora behind frosted glass," not water.
- Place behind the brain hero and as the base layer of the tile grid. It plays
  while the phone is STILL — that's the point.
- Implement with Skia (preferred, GPU-cheap) or Reanimated transforms on blurred
  views. Single shared clock; do not spawn a timer per blob.
- Hard-gate on reduced-motion (static gradient fallback) + focus + AppState.
- DoD: visible "alive" feel on a still phone; flat gradient under reduced-motion;
  profiled — no FPS regression on the hero screen on a mid Android device.

### 5.3 · Meaningful entrance & transition choreography  [low risk]
Motion tied to MEANING, not decoration.
- A reusable `<Reveal>` wrapper: fade + 8–12px rise, 60–80ms stagger, on mount /
  on focus. Apply to the tile grid and signal card.
- Streak rings **fill** on load (animate from 0 to current). Numbers (streak days,
  insight counts) **count up** once on first appearance.
- When the daily signal updates, **cross-fade / morph** rather than hard-swap.
- Base style = visible end state; animate FROM hidden, gated on reduced-motion.
- DoD: opening Home feels composed, not popped-in; reduced-motion shows final
  state instantly; no infinite loops added.

### 5.4 · Haptics on key wins  [low risk]
Cheapest, most universal "premium" upgrade; works phone-still. The repo's own
alpha audit already flags this (`haptics.ts` exists, usage limited).
- Use the EXISTING `haptics.ts` util at EXISTING success callsites only — do not
  change logic, do not add a second haptics path:
  - Mark meds taken → success haptic
  - Streak level up / badge earned → success (pair with the existing confetti)
  - Mood logged / "Do it" completed → light impact
  - Primary button presses → selection (subtle)
- Add a global "haptics" toggle in Settings → Appearance, default ON, persisted
  with the existing settings pattern, read by `haptics.ts`. Respect it everywhere.
- DoD: feedback fires on the four wins above; toggling it off silences all;
  no behavioural/logic change at any callsite.

### 5.5 · The long-term arc — the "missing" emotional payoff  [watch]
The app is all present-tense; recovery's payoff is seeing the line climb.
- A read-only **"Your last 30 days"** moment on Home (below the signal, or as a
  surfaced tile): one or two clean sparklines (mood / sleep / streak consistency)
  trending over time, with a short human line ("7 more consistent days than last
  month").
- It READS existing insight/history data. It computes NO new metrics and adds NO
  storage. If a needed series doesn't already exist, stub the component behind a
  feature flag and flag it for me — do not invent data or touch the engines.
- Warm, plain-language copy. This is the trust moment, not a stats dump.
- DoD: trend renders from existing data; empty/low-data state is gentle, not
  barren; zero new data writes; flagged clearly if any series is missing.

### 5.6 · Splash regen — first thing every user sees  [low risk]
- Replace the dev-client blue React atom with the teal Reclaim mark.
- Regenerate `splash.png` / icon and wire `app.config.ts` so boot is on-brand
  (no dark square patch, no blue atom). Match the teal + dark token background.
- DoD: cold boot shows the teal Reclaim splash on iOS and Android.

### 5.7 · (OPTIONAL) 3px hero tilt  [watch]
Only if you still want a touch of device-motion after seeing 5.2.
- `expo-sensors` DeviceMotion → Reanimated shared value → ≤3px, spring-damped
  shift on the brain hero ONLY. Not on tiles, not on text.
- Hard-gate on reduced-motion (off entirely) + focus. Cap travel tightly.
- DoD: barely-there depth on the hero; completely off under reduced-motion;
  cut it without hesitation if it reads as a gimmick.

---

## DEFINITION OF DONE (phase)
- Tiles distinct by domain, data viz is the focal point (5.1).
- Home feels alive on a still phone via slow aurora drift; flat under
  reduced-motion (5.2).
- Entrances/updates are choreographed and meaning-tied, not decorative (5.3).
- Haptics fire on the four key wins and honour a Settings toggle (5.4).
- A warm, read-only 30-day arc renders from existing data (5.5).
- Cold boot shows the teal Reclaim splash (5.6).
- ALWAYS: reduced-motion + focus + AppState guards on every loop; `npm run
  typecheck` + `npm test` (vitest) green at each commit; engines, data,
  notifications, entitlements byte-identical.

**If any step would touch the engine, data shape, or entitlements, it is the
wrong step — stop and ask.**
