import { beforeEach, describe, expect, it, vi } from 'vitest';

const themes = vi.hoisted(() => ({
  appLightTheme: { name: 'light' as const },
  appDarkTheme: { name: 'dark' as const },
}));

vi.mock('./appThemes', () => themes);

import { resolveAppTheme } from './resolveAppTheme';

describe('resolveAppTheme', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forces light theme when appearanceMode is light', () => {
    expect(resolveAppTheme('light', 'dark')).toBe(themes.appLightTheme);
  });

  it('forces dark theme when appearanceMode is dark', () => {
    expect(resolveAppTheme('dark', 'light')).toBe(themes.appDarkTheme);
  });

  it('follows system when appearanceMode is system', () => {
    expect(resolveAppTheme('system', 'light')).toBe(themes.appLightTheme);
    expect(resolveAppTheme('system', 'dark')).toBe(themes.appDarkTheme);
  });

  it('defaults to system when appearanceMode is undefined', () => {
    expect(resolveAppTheme(undefined, 'light')).toBe(themes.appLightTheme);
    expect(resolveAppTheme(undefined, 'dark')).toBe(themes.appDarkTheme);
  });
});
