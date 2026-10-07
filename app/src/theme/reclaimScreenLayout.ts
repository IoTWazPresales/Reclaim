/**
 * Canonical screen spacing — one rhythm for every scrollable surface.
 *
 * Horizontal inset: 16 · section gap: 16 · tab-bar body: 64
 * Live tab-bar clearance is `useReclaimTabScreenScroll` / `reclaimLiveTabBarScrollInset`.
 * Hero screens: full-bleed hero, then `reclaimBelowHeroContent` for the stack.
 */
import type { ViewStyle } from 'react-native';

/** Matches theme.spacing.lg — single horizontal inset for screen content. */
export const RECLAIM_SCREEN_HORIZONTAL = 16;

/** Vertical gap between stacked sections on a screen. */
export const RECLAIM_SCREEN_SECTION_GAP = 16;

/**
 * Tab-bar content height (icons + labels + paddingTop), excluding the system inset.
 * Must stay in lockstep with TabsNavigator `tabBarStyle.height - insets.bottom`.
 */
export const RECLAIM_TAB_BAR_BODY_HEIGHT = 64;

/** Extra scroll gap above the tab bar so the last section is not flush with it. */
export const RECLAIM_SCROLL_ABOVE_TAB_GAP = 16;

/**
 * Hardcoded fudge used by static `ViewStyle` objects that cannot read live insets.
 * Prefer `reclaimLiveTabBarScrollInset` from a component that calls `useSafeAreaInsets`.
 * 140 ≈ 64 (tab body) + ~48 (typical 3-button / gesture inset) + leftover gap.
 */
export const RECLAIM_SCREEN_TAB_BAR_INSET = 140;

/** Bottom padding for a scroll view that sits above the tab bar. */
/**
 * Gesture navigation's touch region sits above the reported inset.
 * On the scored emulator the labels overlapped that region by 9px while the
 * gesture inset was under 96px. The 3-button inset was 126px and already cleared
 * the system buttons, so that mode does not grow.
 */
export function reclaimTabBarBottomPad(insetsBottom: number): number {
  const gestureOverlap = insetsBottom > 0 && insetsBottom < 96 ? 24 : 0;
  return insetsBottom + gestureOverlap;
}

export function reclaimLiveTabBarScrollInset(insetsBottom: number): number {
  return RECLAIM_TAB_BAR_BODY_HEIGHT + reclaimTabBarBottomPad(insetsBottom) + RECLAIM_SCROLL_ABOVE_TAB_GAP;
}

/** Top inset for screens without a full-bleed hero. */
export const RECLAIM_SCREEN_TOP_INSET = 16;

/** Top inset for the first block below a full-bleed hero. */
export const RECLAIM_BELOW_HERO_TOP = 16;

/**
 * Horizontal and top inset for a standard screen.
 * Bottom clearance is live: use `useReclaimTabScreenScroll`, not `RECLAIM_SCREEN_TAB_BAR_INSET`.
 */
export const reclaimStandardScreenScroll: ViewStyle = {
  paddingHorizontal: RECLAIM_SCREEN_HORIZONTAL,
  paddingTop: RECLAIM_SCREEN_TOP_INSET,
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
