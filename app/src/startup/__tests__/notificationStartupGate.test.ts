import { beforeEach, describe, expect, it, vi } from 'vitest';

const hasNotificationPermission = vi.fn();
const ensureNotificationPermission = vi.fn();
const clearBadge = vi.fn();

vi.mock('@/lib/notifications/permission', () => ({
  hasNotificationPermission: (...args: unknown[]) => hasNotificationPermission(...args),
  ensureNotificationPermission: (...args: unknown[]) => ensureNotificationPermission(...args),
}));

vi.mock('@/lib/notifications/BadgeManager', () => ({
  clearBadge: (...args: unknown[]) => clearBadge(...args),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('runStartupNotificationPermissionGate (X-26)', () => {
  beforeEach(() => {
    vi.resetModules();
    hasNotificationPermission.mockReset();
    ensureNotificationPermission.mockReset();
    clearBadge.mockReset();
    hasNotificationPermission.mockResolvedValue(true);
    clearBadge.mockResolvedValue(undefined);
  });

  it('does not request or await notification permission on first render', async () => {
    let resolvePermission: ((value: boolean) => void) | undefined;
    hasNotificationPermission.mockImplementation(
      () => new Promise<boolean>((resolve) => { resolvePermission = resolve; }),
    );
    const { runStartupNotificationPermissionGate } = await import('@/startup/notificationStartupGate');

    const result = runStartupNotificationPermissionGate();

    expect(result).toBeUndefined();
    expect(hasNotificationPermission).toHaveBeenCalledTimes(1);
    expect(ensureNotificationPermission).not.toHaveBeenCalled();
    expect(clearBadge).toHaveBeenCalledTimes(1);
    resolvePermission?.(true);
  });
});
