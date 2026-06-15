import type { TextStyle } from 'react-native';

import { RECLAIM_BODY_FONT, RECLAIM_DISPLAY_FONT } from '@/theme/reclaimFontFamilies';

/**
 * Premium-calm typography roles (sizes/weights/letter-spacing only).
 * Apply `color` at the call site from theme — keeps roles independent of light/dark.
 */
export const reclaimTextRoles = {
  screenTitle: {
    fontFamily: RECLAIM_DISPLAY_FONT.bold,
    fontSize: 26,
    fontWeight: '400' as const,
    letterSpacing: -0.2,
    lineHeight: 34,
  },
  cardTitle: {
    fontFamily: RECLAIM_BODY_FONT.semiBold,
    fontSize: 17,
    fontWeight: '400' as const,
    letterSpacing: -0.1,
    lineHeight: 24,
  },
  sectionTitle: {
    fontFamily: RECLAIM_BODY_FONT.semiBold,
    fontSize: 15,
    fontWeight: '400' as const,
    letterSpacing: -0.05,
    lineHeight: 21,
  },
  body: {
    fontFamily: RECLAIM_BODY_FONT.regular,
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  bodyStrong: {
    fontFamily: RECLAIM_BODY_FONT.semiBold,
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  meta: {
    fontFamily: RECLAIM_BODY_FONT.medium,
    fontSize: 12,
    fontWeight: '400' as const,
    letterSpacing: 0.35,
    lineHeight: 16,
  },
  insightStatement: {
    fontFamily: RECLAIM_DISPLAY_FONT.bold,
    fontSize: 22,
    fontWeight: '400' as const,
    letterSpacing: -0.28,
    lineHeight: 30,
  },
  interpretationLead: {
    fontFamily: RECLAIM_DISPLAY_FONT.bold,
    fontSize: 26,
    fontWeight: '400' as const,
    letterSpacing: -0.22,
    lineHeight: 34,
  },
  inlineLink: {
    fontFamily: RECLAIM_BODY_FONT.semiBold,
    fontSize: 13,
    fontWeight: '400' as const,
    letterSpacing: 0.1,
    lineHeight: 18,
  },
  calloutOverline: {
    fontFamily: RECLAIM_BODY_FONT.medium,
    fontSize: 11,
    fontWeight: '400' as const,
    letterSpacing: 0.75,
    lineHeight: 14,
  },
} satisfies Record<string, TextStyle>;
