# Reclaim Reskin — Design Handoff Report (Phases 1–4)

**Branch:** `feat/meds-catalog-governance`  
**Audience:** Claude Design / Binaxis Core review  
**Date:** 2026-06-07  
**Screenshots:** `docs/reskin/final/` (and `docs/reskin/qa-rerun-*.png` from prior passes)

---

## Executive summary

Reclaim’s identity layer was reskinned from default MD3 blue to **Binaxis restorative teal**, with custom typography, theme toggle, dashboard modularisation, performance-safe hero motion, premium paywall pitch, and free-tier insight quota surfacing. Engines, persistence, notifications, and RevenueCat product IDs were **not** changed.

| Phase | Status | Visible outcome |
|-------|--------|-----------------|
| **1** Identity tokens | ✅ Shipped (`4a2a6eb`) | Teal primary/error, `domainAccents`, System/Light/Dark toggle |
| **2** Type & structure | ✅ Shipped (`6d76912`) | Schibsted + Hanken fonts, widened scale, Dashboard split, hero motion gate |
| **3** Premium surface | ✅ This session | Unified chrome, transformation paywall, `10 of 88` counter, premium particles |
| **4** Touch-ups | ✅ Done | Logo teal, light starfield off, splash config, light brain glow |
| **5** Calm motion & depth | ✅ Done (`6f81d99` + close-out) | Tile depth, choreography, haptics, 30-day arc; aurora removed per review |

---

## Phase 5 — Calm premium motion & depth

### Shipped
- Domain-tinted tile glows + brighter data viz (`HomeDashboardTile`, `dashboardHomeTiles.ts`)
- `Reveal` entrances, insight cross-fade, streak ring fill, `useCountUp`
- Haptics on key wins + Settings → Appearance toggle
- `DashboardThirtyDayArc` (read-only, existing data)
- Splash `app.config.ts` → teal mark on `#0b1220`

### Deliberately skipped
- Aurora drift (user feedback — static tiles preferred)
- Hero gyro tilt (5.7 optional)

### Close-out (post Phase 5)
- Light-theme brain region glow opacity tuned in `BrainVisualization.tsx`
- Emulator QA captures: `docs/reskin/final/06–09-closeout-*.png`

---

## Phase 1 — Identity tokens

### What changed (usage)

| Token / behaviour | Before | After |
|-------------------|--------|-------|
| Primary accent | `#2563eb` / `#60a5fa` | `#53c9ca` (light) / `#72d7d8` (dark) |
| Error | `#ef4444` | `#ec5a5e` |
| Domain accents | Per-file hex | `theme.domainAccents` (teal-anchored set) |
| Theme mode | Hardcoded dark | `appearanceMode`: system \| light \| dark in Settings |
| Display / body fonts | Roboto / system | Schibsted Grotesk + Hanken Grotesk (Phase 2 load) |

### Key files

- `app/src/theme/binaxisColors.ts`, `appThemes.ts`, `resolveAppTheme.ts`, `AppThemeProvider.tsx`
- `app/src/screens/SettingsScreen.tsx` — Appearance card
- Component hex → token: `CelebrateRow`, `BrainVisualization`, `TagPills`, `MoodFaces`, etc.

### Screens to review

- Home (dark) — teal CTAs, tab bar, domain glows on brain hero
- Settings → Appearance — System / Light / Dark chips
- Light theme — background `#f8fafc`, surfaces white, teal accents

---

## Phase 2 — Type, structure & performance

### What changed (usage)

| Item | Detail |
|------|--------|
| **Fonts** | `ReclaimFontsProvider` gates splash until `fontsReady`; Paper `fonts` via `reclaimPaperFonts.ts` |
| **Type scale** | `reclaimTypography.ts` + `appThemes.typography` — display vs body tiers widened |
| **Dashboard split** | `Dashboard.tsx` orchestrates; extracted: `DashboardHeroBackdrop`, `DashboardStateTiles`, `DashboardForecastModal`, `DashboardSleepSnapshotModal`, `DashboardPostOnboardingGuide`, `DashboardScheduleOverlayHost`, `DashboardSnackbar` |
| **Motion (2.4)** | `useHeroMotionActive` — pauses `withRepeat` when tab unfocused, hero scrolled away, or reduced motion |

### Screens to review

- Home hero — brain, state node capsules, rotating ring (dark + light)
- State tiles — Prediction (violet/cyan glow), Sleep hypnogram, Mood orb, Training week rail
- Forecast modal — tap Prediction tile

---

## Phase 3 — Premium surface & pitch

### 3.1 Unified chrome

**New:** `app/src/theme/reclaimChrome.ts`

- Card radius **14px**, sheet/modal radius **20px**
- `reclaimChromeElevation()` — hairline border + soft teal-tinted glow
- `reclaimGlassWash()` — frosted overlay for paywall
- `reclaimVisualLanguage.ts` updated to consume chrome tokens (cards, insight module, section shells)

### 3.2 Paywall rewrite

**File:** `app/src/components/premium/PaywallModal.tsx`

| Before | After |
|--------|-------|
| Feature bullet list (5 items) | Transformation headline + single outcome paragraph |
| Static “Unlock Premium” | CTA from RevenueCat (`Start free trial` when intro price exists) |
| No pricing anchor | `trialLine`, `anchorLine`, `priceLine` from live offerings |
| Generic footer | Quiet trust: “Cancel anytime. Your health data stays on your device…” |
| Stock overlay | `PaywallPremiumBackdrop` — teal particle wash (premium-only motion) |

**`usePremium.ts`** — prefers annual package for purchase; hydrates offering copy without changing entitlement IDs.

### 3.3 Insight quota counter

**New:** `app/src/components/premium/InsightQuotaBadge.tsx`

- Copy: **`10 of 88 insights`** (`FREE_RULE_LIMIT` / `TOTAL_INSIGHT_RULE_COUNT`)
- Surfaces on **Dashboard** daily signal block and **Integrations → Export**
- Tappable → opens paywall

### 3.4 Motion reservation

- **Paywall:** `PaywallPremiumBackdrop` + entrance animations (respects reduced motion)
- **Dashboard hero:** loops gated (Phase 2.4)
- **Milestone celebration:** confetti skipped when reduced motion enabled
- **Starfield:** dark mode only (Phase 4)

### 3.5 Gate

- `tsc --noEmit` ✅
- `npm test` 563/563 ✅
- Sandbox purchase/restore: **manual** — requires RevenueCat sandbox account on device (not automated in CI)

---

## Phase 4 — Touch-ups

| Item | Status |
|------|--------|
| Splash logo dark square (`ReclaimLogo` hardcoded `#0b1220` rect) | ✅ Fixed (transparent canvas) |
| Splash loading bar legacy blue | ✅ Teal `theme.colors.primary` |
| Logo Skia strokes legacy blue | ✅ Retinted to `#53c9ca` family |
| `PremiumStarfield` on light background | ✅ Hidden when `!theme.dark` |
| `LifecycleHero` capsules on light | ✅ Theme-aware palette (Phase 2 session) |
| Native `splash.png` / `app.config.ts` boot colour | ✅ | Teal mark via `icon-fg-transparent-1024.png`; native asset refresh on next prebuild |
| Android FPS profile (2.5) | ⏳ | Manual profiler pass (non-blocking) |

---

## Screenshot index (`docs/reskin/final/`)

| File | Screen |
|------|--------|
| `01-home-dark.png` | Home — hero + greeting |
| `02-home-tiles.png` | State tiles + Today |
| `03-settings.png` | Settings (scroll for Appearance) |
| `04-paywall.png` | Paywall modal (if captured) |
| `05-integrations.png` | Integrations + quota + export |

Prior QA: `docs/reskin/qa-rerun-09-in-app.png` (tiles), `qa-rerun-15-home-light-top.png` (hero)

---

## What was explicitly NOT changed

- Insight engine rules / evaluation logic (`lib/insights`)
- Training engine, notifications scheduler
- Providers, AsyncStorage keys, Supabase contracts
- RevenueCat `RC_ENTITLEMENT_ID`, product identifiers

---

## Suggested design review checklist

1. Teal primary on dark navy — contrast on primary buttons and tab bar
2. Light theme — hero capsules, tile surfaces (`dashboardHomeTiles.ts`), quota badge
3. Paywall — headline tone, trial/annual hierarchy, trust line weight
4. Typography — Schibsted display vs Hanken body on Dashboard greeting + Daily signal
5. Motion — hero idle when scrolled away; paywall particles; reduced-motion path

---

## Commits (reference)

| Hash | Message |
|------|---------|
| `4a2a6eb` | feat(reskin): phase 1 Binaxis teal tokens and theme toggle |
| `6d76912` | feat(reskin): phase 2 fonts, dashboard split, and hero motion gating |
| `6f81d99` | feat(reskin): phase 5 tile depth, motion choreography, haptics, and 30-day arc |
