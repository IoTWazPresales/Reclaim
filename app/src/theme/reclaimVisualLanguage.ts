/**
 * Shared Reclaim visual tokens aligned with the dashboard direction:
 * soft capsules, calm premium surfaces, subtle depth — not global theme overrides.
 */
import { StyleSheet } from 'react-native';

import type { AppTheme } from '@/theme';

export const RECLAIM_CAPSULE_RADIUS = 9999;

/** Card depth tiers — keep distinct so utility ≠ journey ≠ expressive. */
export type ReclaimCardTier = 'quiet' | 'journey' | 'expressive';

/** Utility / content / journey cards (merged into AppCard `style` on non-dashboard surfaces). */
export function reclaimUtilityCardSurface(theme: AppTheme, tier: ReclaimCardTier = 'quiet'): object {
  const dark = theme.dark;
  const base = {
    borderWidth: 1,
    shadowColor: dark ? '#000000' : theme.colors.primary,
  };

  if (tier === 'expressive') {
    return {
      ...base,
      backgroundColor: dark ? '#172a45' : theme.colors.surface,
      borderColor: dark ? 'rgba(150, 188, 248, 0.22)' : 'rgba(37, 99, 235, 0.11)',
      shadowOffset: { width: 0, height: dark ? 10 : 8 },
      shadowOpacity: dark ? 0.34 : 0.11,
      shadowRadius: dark ? 18 : 13,
      elevation: dark ? 7 : 5,
    };
  }

  if (tier === 'journey') {
    return {
      ...base,
      backgroundColor: dark ? '#152338' : theme.colors.surface,
      borderColor: dark ? 'rgba(132, 168, 228, 0.18)' : 'rgba(37, 99, 235, 0.095)',
      shadowOffset: { width: 0, height: dark ? 8 : 6 },
      shadowOpacity: dark ? 0.28 : 0.09,
      shadowRadius: dark ? 15 : 11,
      elevation: dark ? 5 : 4,
    };
  }

  return {
    ...base,
    backgroundColor: dark ? '#141E30' : theme.colors.surface,
    borderColor: dark ? 'rgba(125, 162, 220, 0.16)' : 'rgba(37, 99, 235, 0.09)',
    shadowOffset: { width: 0, height: dark ? 7 : 5 },
    shadowOpacity: dark ? 0.26 : 0.085,
    shadowRadius: dark ? 13 : 10,
    elevation: dark ? 4 : 3,
  };
}

/** Inset / recessed panel (reasoning, dense metadata) — not a floating pill blob. */
export function reclaimRecessedWell(theme: AppTheme): object {
  const dark = theme.dark;
  return {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: dark ? 'rgba(6, 12, 26, 0.72)' : 'rgba(15, 23, 42, 0.055)',
    borderWidth: 1,
    borderColor: dark ? 'rgba(55, 75, 118, 0.95)' : 'rgba(15, 23, 42, 0.09)',
    borderTopColor: dark ? 'rgba(255, 255, 255, 0.045)' : 'rgba(255, 255, 255, 0.5)',
    borderLeftColor: dark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.35)',
  };
}

/** Primary journey CTA — ~46–48pt, soft-relief lift + faint top luminance (not a flat slab). */
export function reclaimPrimaryCapsuleButton(theme: AppTheme) {
  const dark = theme.dark;
  return {
    style: {
      borderRadius: RECLAIM_CAPSULE_RADIUS,
      borderWidth: 0,
      borderTopWidth: StyleSheet.hairlineWidth * 2,
      borderTopColor: dark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.42)',
      ...(dark
        ? {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.42,
            shadowRadius: 8,
            elevation: 5,
          }
        : {
            shadowColor: theme.colors.primary,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.26,
            shadowRadius: 6,
            elevation: 3,
          }),
    },
    contentStyle: {
      minHeight: 47,
      paddingHorizontal: 20,
      paddingVertical: 1,
    },
    labelStyle: {
      fontSize: 14,
      fontWeight: '600' as const,
      letterSpacing: 0.08,
    },
  };
}

/** Secondary capsule — quieter, slightly recessed (~38–40pt). */
export function reclaimSecondaryCapsuleButton(theme: AppTheme) {
  const dark = theme.dark;
  return {
    style: {
      borderRadius: RECLAIM_CAPSULE_RADIUS,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: dark ? 'rgba(150, 175, 225, 0.2)' : 'rgba(37, 99, 235, 0.17)',
      borderTopColor: dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.55)',
      backgroundColor: dark ? 'rgba(255, 255, 255, 0.032)' : 'rgba(37, 99, 235, 0.052)',
      shadowColor: dark ? '#000' : 'transparent',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: dark ? 0.42 : 0,
      shadowRadius: 3,
      elevation: dark ? 2 : 0,
    },
    contentStyle: {
      minHeight: 40,
      paddingHorizontal: 14,
      paddingVertical: 0,
    },
    labelStyle: {
      fontSize: 13,
      fontWeight: '600' as const,
      letterSpacing: 0.06,
    },
  };
}

/**
 * Tertiary / utility pair (e.g. Open schedule, Sync health) — full capsule, outlined, soft relief.
 */
export function reclaimTertiaryOutlineCapsuleButton(theme: AppTheme) {
  const dark = theme.dark;
  return {
    style: {
      borderRadius: RECLAIM_CAPSULE_RADIUS,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: dark ? 'rgba(155, 182, 228, 0.24)' : 'rgba(37, 99, 235, 0.2)',
      borderTopColor: dark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(255, 255, 255, 0.65)',
      backgroundColor: dark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(37, 99, 235, 0.045)',
      shadowColor: dark ? '#000' : theme.colors.primary,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: dark ? 0.32 : 0.08,
      shadowRadius: 4,
      elevation: dark ? 2 : 1,
    },
    contentStyle: {
      minHeight: 36,
      paddingHorizontal: 14,
      paddingVertical: 0,
    },
    labelStyle: {
      fontSize: 12,
      fontWeight: '600' as const,
      letterSpacing: 0.06,
    },
  };
}

/** Text / ghost actions in a capsule row (Adjust, Not today) — same family, minimal fill. */
export function reclaimGhostCapsuleButton(_theme: AppTheme) {
  return {
    style: {
      borderRadius: RECLAIM_CAPSULE_RADIUS,
    },
    contentStyle: {
      minHeight: 32,
      paddingHorizontal: 10,
      paddingVertical: 0,
    },
    labelStyle: {
      fontSize: 12,
      fontWeight: '600' as const,
      letterSpacing: 0.06,
    },
  };
}

/** Inline actions (e.g. Today row) — compact capsule. */
export function reclaimCompactCapsuleButton(_theme: AppTheme, minHeight = 32) {
  return {
    style: {
      borderRadius: RECLAIM_CAPSULE_RADIUS,
    },
    contentStyle: {
      minHeight,
      paddingHorizontal: 12,
      paddingVertical: 0,
    },
    labelStyle: {
      fontSize: 12,
      fontWeight: '600' as const,
      letterSpacing: 0.08,
    },
  };
}

/** System insight / interpretation module shell (distinct from generic utility cards). */
export function reclaimInsightModuleSurface(theme: AppTheme): object {
  const dark = theme.dark;
  return {
    overflow: 'hidden' as const,
    borderRadius: 22,
    marginBottom: 16,
    backgroundColor: dark ? '#111a2e' : theme.colors.surface,
    borderWidth: 1,
    borderColor: dark ? 'rgba(118, 158, 228, 0.3)' : 'rgba(59, 91, 180, 0.14)',
    shadowColor: dark ? '#000000' : '#1e3a8a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: dark ? 0.36 : 0.09,
    shadowRadius: 18,
    elevation: dark ? 8 : 4,
  };
}

/** Vertical gap between major sections on scroll screens (Sleep, Settings-style layouts). */
export const RECLAIM_SCREEN_SECTION_GAP = 12;

/** Vertical rhythm inside action / module cards (header → chips → body → wells). */
export const RECLAIM_CARD_BLOCK_GAP = 10;

/** Inner content padding for dense module layouts (e.g. System Insight). */
export const RECLAIM_CARD_MODULE_CONTENT_PADDING = { vertical: 14, horizontal: 16 } as const;

/**
 * Outer section `Card` shell — Reclaim utility tier + explicit surface fill + app corner radius.
 * Keeps Sleep/Settings section blocks visually related to dashboard utility cards without changing Insight/tiles.
 */
export function reclaimSectionCardShell(theme: AppTheme): object {
  return {
    ...reclaimUtilityCardSurface(theme, 'quiet'),
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
  };
}

/**
 * Guided action card shell — same DNA as section cards, slightly more “journey” presence than quiet utility.
 * Use for Circadian, reminders (`SchedulingCard`), Mood check-in / cause-links shells, etc.
 */
export function reclaimGuidedActionCardShell(theme: AppTheme): object {
  return {
    ...reclaimUtilityCardSurface(theme, 'journey'),
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
  };
}

/**
 * Icon tile for guided cards + feature headers — aligns with System Insight header tile (not MD3 primaryContainer).
 */
export function reclaimGuidedIconWell(theme: AppTheme): object {
  const dark = theme.dark;
  return {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: 12,
    backgroundColor: dark ? 'rgba(100, 140, 210, 0.12)' : 'rgba(37, 99, 235, 0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dark ? 'rgba(140, 175, 235, 0.2)' : 'rgba(37, 99, 235, 0.12)',
  };
}
