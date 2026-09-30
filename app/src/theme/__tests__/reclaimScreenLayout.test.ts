import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { reclaimLiveTabBarScrollInset, RECLAIM_SCROLL_ABOVE_TAB_GAP, RECLAIM_TAB_BAR_BODY_HEIGHT } from '@/theme/reclaimScreenLayout';

const SRC = path.resolve(__dirname, '../..');

const TAB_SCREENS = [
  'screens/Dashboard.tsx',
  'screens/SettingsScreen.tsx',
  'screens/TrainingScreen.tsx',
  'screens/MedsScreen.tsx',
  'screens/MoodScreen.tsx',
  'screens/SleepScreen.tsx',
  'screens/MindfulnessScreen.tsx',
  'screens/MeditationScreen.tsx',
  'screens/IntegrationsScreen.tsx',
  'screens/NotificationsScreen.tsx',
  'screens/DataPrivacyScreen.tsx',
  'screens/AboutScreen.tsx',
  'screens/training/TrainingAnalyticsScreen.tsx',
  'screens/SignalGraphScreen.tsx',
  'screens/EvidenceNotesScreen.tsx',
];

describe('live tab scroll inset', () => {
  it('adds the tab body, the system inset, and one section gap', () => {
    expect(reclaimLiveTabBarScrollInset(0)).toBe(RECLAIM_TAB_BAR_BODY_HEIGHT + RECLAIM_SCROLL_ABOVE_TAB_GAP);
    expect(reclaimLiveTabBarScrollInset(48)).toBe(64 + 48 + 16);
  });

  it('keeps the listed tab screens off the 140 fudge', () => {
    for (const rel of TAB_SCREENS) {
      const text = fs.readFileSync(path.join(SRC, rel), 'utf8');
      expect(text, rel).toContain('useReclaimTabScreenScroll');
      expect(text, rel).not.toContain('RECLAIM_SCREEN_TAB_BAR_INSET');
      expect(text, rel).not.toContain('reclaimStandardScreenScroll');
      expect(text, rel).not.toContain('reclaimHeroBleedScroll');
      expect(text, rel).not.toMatch(/paddingBottom:\s*140/);
      expect(text, rel).not.toMatch(/paddingBottom:\s*120/);
    }
  });

  it('clears the session footer once and keeps auth and the meds sheet on the live inset', () => {
    const session = fs.readFileSync(path.join(SRC, 'components/training/TrainingSessionView.tsx'), 'utf8');
    const auth = fs.readFileSync(path.join(SRC, 'screens/AuthScreen.tsx'), 'utf8');
    const meds = fs.readFileSync(path.join(SRC, 'screens/MedsScreen.tsx'), 'utf8');
    expect(session).not.toContain('RECLAIM_SCREEN_TAB_BAR_INSET');
    expect(session).toContain('footerSafePad');
    expect(auth).toContain('insets.bottom');
    expect(meds).toContain('insets.bottom + 16');
    expect(meds).not.toContain('paddingBottom: 32');
  });
});
