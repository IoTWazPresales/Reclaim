/**
 * Canonical screen spacing — one rhythm for every scrollable surface.
 *
 * Horizontal inset: 16 · section gap: 16 · tab-bar clearance: 140
 * Hero screens: full-bleed hero, then `reclaimBelowHeroContent` for the stack.
 */
import type { ViewStyle } from 'react-native';

/** Matches theme.spacing.lg — single horizontal inset for screen content. */
export const RECLAIM_SCREEN_HORIZONTAL = 16;

/** Vertical gap between stacked sections on a screen. */
export const RECLAIM_SCREEN_SECTION_GAP = 16;

/** Bottom inset so content clears the tab bar. */
export const RECLAIM_SCREEN_TAB_BAR_INSET = 140;

/** Top inset for screens without a full-bleed hero. */
export const RECLAIM_SCREEN_TOP_INSET = 16;

/** Top inset for the first block below a full-bleed hero. */
export const RECLAIM_BELOW_HERO_TOP = 16;

/** Scroll content for hero-led screens (hero is full width; content is inset below). */
export const reclaimHeroBleedScroll: ViewStyle = {
  paddingBottom: RECLAIM_SCREEN_TAB_BAR_INSET,
};

/** Scroll content for standard screens (no full-bleed hero). */
export const reclaimStandardScreenScroll: ViewStyle = {
  paddingHorizontal: RECLAIM_SCREEN_HORIZONTAL,
  paddingTop: RECLAIM_SCREEN_TOP_INSET,
  paddingBottom: RECLAIM_SCREEN_TAB_BAR_INSET,
};

/** Inset wrapper for content below a full-bleed hero. */
export const reclaimBelowHeroContent: ViewStyle = {
  paddingHorizontal: RECLAIM_SCREEN_HORIZONTAL,
  paddingTop: RECLAIM_BELOW_HERO_TOP,
};

/** Spacing between major vertical sections — use on section wrappers only. */
export const reclaimSectionSpacing: ViewStyle = {
  marginBottom: RECLAIM_SCREEN_SECTION_GAP,
};
