import { Platform } from 'react-native';
import { configureFonts } from 'react-native-paper';

import { RECLAIM_BODY_FONT, RECLAIM_DISPLAY_FONT, RECLAIM_MONO_FONT } from './reclaimFontFamilies';

const monoFamily =
  Platform.OS === 'ios'
    ? RECLAIM_MONO_FONT.ios
    : Platform.OS === 'android'
      ? RECLAIM_MONO_FONT.android
      : RECLAIM_MONO_FONT.default;

/** MD3 typescale — widened display tier; Hanken body; mono labels/values. */
export const reclaimPaperFonts = configureFonts({
  config: {
    displayLarge: {
      fontFamily: RECLAIM_DISPLAY_FONT.extraBold,
      fontSize: 60,
      fontWeight: '400',
      letterSpacing: -0.6,
      lineHeight: 68,
    },
    displayMedium: {
      fontFamily: RECLAIM_DISPLAY_FONT.extraBold,
      fontSize: 48,
      fontWeight: '400',
      letterSpacing: -0.45,
      lineHeight: 56,
    },
    displaySmall: {
      fontFamily: RECLAIM_DISPLAY_FONT.bold,
      fontSize: 38,
      fontWeight: '400',
      letterSpacing: -0.3,
      lineHeight: 46,
    },
    headlineLarge: {
      fontFamily: RECLAIM_DISPLAY_FONT.bold,
      fontSize: 34,
      fontWeight: '400',
      letterSpacing: -0.25,
      lineHeight: 42,
    },
    headlineMedium: {
      fontFamily: RECLAIM_DISPLAY_FONT.bold,
      fontSize: 30,
      fontWeight: '400',
      letterSpacing: -0.2,
      lineHeight: 38,
    },
    headlineSmall: {
      fontFamily: RECLAIM_DISPLAY_FONT.bold,
      fontSize: 26,
      fontWeight: '400',
      letterSpacing: -0.15,
      lineHeight: 34,
    },
    titleLarge: {
      fontFamily: RECLAIM_BODY_FONT.semiBold,
      fontSize: 24,
      fontWeight: '400',
      letterSpacing: -0.1,
      lineHeight: 32,
    },
    titleMedium: {
      fontFamily: RECLAIM_BODY_FONT.semiBold,
      fontSize: 18,
      fontWeight: '400',
      letterSpacing: -0.05,
      lineHeight: 26,
    },
    titleSmall: {
      fontFamily: RECLAIM_BODY_FONT.semiBold,
      fontSize: 16,
      fontWeight: '400',
      letterSpacing: 0,
      lineHeight: 24,
    },
    bodyLarge: {
      fontFamily: RECLAIM_BODY_FONT.regular,
      fontSize: 17,
      fontWeight: '400',
      letterSpacing: 0.1,
      lineHeight: 26,
    },
    bodyMedium: {
      fontFamily: RECLAIM_BODY_FONT.regular,
      fontSize: 15,
      fontWeight: '400',
      letterSpacing: 0.15,
      lineHeight: 22,
    },
    bodySmall: {
      fontFamily: RECLAIM_BODY_FONT.regular,
      fontSize: 13,
      fontWeight: '400',
      letterSpacing: 0.2,
      lineHeight: 18,
    },
    labelLarge: {
      fontFamily: RECLAIM_BODY_FONT.medium,
      fontSize: 15,
      fontWeight: '400',
      letterSpacing: 0.1,
      lineHeight: 20,
    },
    labelMedium: {
      fontFamily: monoFamily,
      fontSize: 12,
      fontWeight: '400',
      letterSpacing: 0.45,
      lineHeight: 16,
    },
    labelSmall: {
      fontFamily: monoFamily,
      fontSize: 11,
      fontWeight: '400',
      letterSpacing: 0.55,
      lineHeight: 14,
    },
  },
});
