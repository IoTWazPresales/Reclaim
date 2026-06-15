# Phase 4 · Visual touch-ups (post Phase 2)

Tracked items found during emulator QA and light/system theme pass.

## Splash & boot

| Item | Status | Notes |
|------|--------|-------|
| Blue square behind logo on splash | **Fixed** | `ReclaimLogo` transparent canvas |
| Splash loading bar legacy blue `#66AEFF` | **Fixed** | Uses `theme.colors.primary` |
| Native `app.config.ts` splash `backgroundColor: '#0b1220'` | Open | Regenerate `splash.png` when art pass lands |
| `ReclaimLogo` legacy blue R fill | **Fixed** | Skia strokes retinted to Binaxis teal (`#53c9ca` family) |

## Light theme — Dashboard hero

| Item | Status | Notes |
|------|--------|-------|
| State tile capsules unreadable on light bg | **Fixed** | `LifecycleHero` theme-aware palette |
| `PremiumStarfield` white stars on light bg | **Fixed** | Starfield hidden when `!theme.dark` |
| Brain region glows on light | **Partial** | Brain fill lightened; glow pulse still tuned for dark |

## Motion & accessibility

| Item | Status | Notes |
|------|--------|-------|
| Hero `withRepeat` loops when tab unfocused / scrolled away | **Fixed** (2.4) | `useHeroMotionActive` |
| Reduced motion disables hero loops | **Fixed** | Same gate |
| Milestone confetti + reduced motion | **Fixed** | Confetti skipped when OS reduce motion on |
| Paywall particles | **Added** (3.4) | Premium surface only; respects reduced motion |

## Phase 2 compliance checklist

- [x] 2.1–2.4 (see design-handoff-report.md)
- [ ] 2.5 Profile hero FPS on mid Android (manual)

## Design handoff

Full phase 1–4 report for design review: `docs/reskin/design-handoff-report.md`
