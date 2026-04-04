import type { TextStyle } from 'react-native';

/**
 * Premium-calm typography roles (sizes/weights/letter-spacing only).
 * Apply `color` at the call site from theme — keeps roles independent of light/dark.
 *
 * Use these on Settings, Sleep, and other product screens to avoid ad hoc 800/900 headings.
 */
export const reclaimTextRoles = {
  /** Top-of-screen title (e.g. section headers that are not Paper variants). */
  screenTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.25,
    lineHeight: 28,
  },
  /** Expandable card titles, modal titles, strong in-card headings. */
  cardTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: -0.15,
    lineHeight: 22,
  },
  /** Subsections inside a card (e.g. "Quiet hours", "Stage roadmap"). */
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    letterSpacing: -0.08,
    lineHeight: 20,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  bodyStrong: {
    fontSize: 15,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  meta: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  /** Strong interpretive headline (e.g. insight statement) — use only where a single hero line is intended. */
  insightStatement: {
    fontSize: 19,
    fontWeight: '700' as const,
    letterSpacing: -0.35,
    lineHeight: 26,
  },
  /**
   * System Insight hero line — calmer than `insightStatement` (600, slightly roomier).
   * Prefer this for the main interpretation message inside the expressive module.
   */
  interpretationLead: {
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.22,
    lineHeight: 28,
  },
  /** Uppercase-style label above a callout well (“Suggested next step”). */
  calloutOverline: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.65,
    lineHeight: 14,
  },
} satisfies Record<string, TextStyle>;
