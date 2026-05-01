/**
 * Standardized card styles based on Material Design 3 best practices
 * Use these constants to ensure consistent card styling across the app
 */

import type { AppTheme } from '@/theme';

export const STANDARD_CARD_STYLES = {
  // Main content cards - elevated with shadow
  elevated: (theme: AppTheme) => ({
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: theme.colors.surface,
  }),
  
  // Empty states and secondary content - outlined
  outlined: (theme: AppTheme) => ({
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: theme.colors.surface,
  }),
  
  // Special highlighted sections - contained-tonal
  containedTonal: (theme: AppTheme) => ({
    borderRadius: 16,
    marginBottom: 16,
  }),
  
  // Cards with margin top (for settings sections)
  withMarginTop: (theme: AppTheme) => ({
    borderRadius: 16,
    marginTop: 16,
    marginBottom: 16,
    backgroundColor: theme.colors.surface,
  }),
  
  // Cards without bottom margin (for last item)
  noBottomMargin: (theme: AppTheme) => ({
    borderRadius: 16,
    marginBottom: 0,
    backgroundColor: theme.colors.surface,
  }),
};

