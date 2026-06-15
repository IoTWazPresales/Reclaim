# Phase 4 · Visual touch-ups (post Phase 2)

Tracked items found during emulator QA and light/system theme pass.

## Splash & boot

| Item | Status | Notes |
|------|--------|-------|
| Blue square behind logo on splash | **Fixed** | `ReclaimLogo` drew hardcoded `#0b1220` Rect; now transparent so parent `theme.colors.background` shows through |
| Splash loading bar legacy blue `#66AEFF` | **Fixed** | Uses `theme.colors.primary` (teal) in both themes |
| Native `app.config.ts` splash `backgroundColor: '#0b1220'` | Open | Shows before JS; align to teal/neutral when regenerating `splash.png` |
| `ReclaimLogo` still uses legacy blue R fill `#2274C9` | Open | Re-tint logo Skia strokes to Binaxis teal in a dedicated art pass |

## Light theme — Dashboard hero

| Item | Status | Notes |
|------|--------|-------|
| State tile capsules unreadable on light bg | **Partial** | `LifecycleHero` capsule/ring colours now theme-aware |
| `PremiumStarfield` white stars on light bg | Open | Hide starfield or switch to subtle slate specks in light mode |
| Brain region glows on light | **Partial** | Brain fill lightened; glow pulse still tuned for dark |

## Motion & accessibility

| Item | Status | Notes |
|------|--------|-------|
| Hero `withRepeat` loops when tab unfocused / scrolled away | **Fixed** (2.4) | Gated via `useHeroMotionActive` + scroll in-view |
| Reduced motion disables hero loops | **Fixed** | Same gate; static glows/orbs remain visible |
| `uiautomator dump` idle failures | Mitigated | Continuous hero animation paused when off-screen |

## Phase 2 compliance checklist

- [x] 2.1 Custom fonts behind splash (`ReclaimFontsProvider`, `fontsReady` gate)
- [x] 2.2 Widened type scale (`reclaimTypography`, Paper fonts)
- [x] 2.3 Dashboard extraction (`Dashboard*Tiles`, modals, backdrop)
- [x] 2.4 Hero loop gating (focus + scroll + reduced motion)
- [ ] 2.5 Profile hero FPS on mid Android (manual; run Android Studio profiler)

## Tile tokens

`dashboardHomeTiles.ts` — surfaces, borders, per-accent glows and chevrons are theme-split (`dark` boolean). Forecast line animation respects `reduceMotion` in `Dashboard.tsx`.
