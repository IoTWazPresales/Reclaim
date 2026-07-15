import { beforeEach, describe, expect, it, vi } from 'vitest';

const reconcileNotifications = vi.fn();
const ensureNotificationPermission = vi.fn();
const clearBadge = vi.fn();

vi.mock('@/lib/notifications/NotificationScheduler', () => ({
  reconcileNotifications: (...args: unknown[]) => reconcileNotifications(...args),
}));

vi.mock('@/lib/notifications/permission', () => ({
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
    reconcileNotifications.mockReset();
    ensureNotificationPermission.mockReset();
    clearBadge.mockReset();
    ensureNotificationPermission.mockResolvedValue(true);
    clearBadge.mockResolvedValue(undefined);
  });

  it('awaits permission but does not await reconcileNotifications', async () => {
    let resolveReconcile: (() => void) | undefined;
    reconcileNotifications.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveReconcile = resolve;
        }),
    );

    const { runStartupNotificationPermissionGate, resetNotificationStartupGate } =
      await import('@/startup/notificationStartupGate');
    resetNotificationStartupGate();

    const granted = await Promise.race([
      runStartupNotificationPermissionGate(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('gate awaited reconcile')), 50),
      ),
    ]);

    expect(granted).toBe(true);
    expect(ensureNotificationPermission).toHaveBeenCalledTimes(1);
    expect(clearBadge).toHaveBeenCalledTimes(1);
    expect(reconcileNotifications).toHaveBeenCalledTimes(1);
    // Unblock hanging promise so the test process can exit cleanly
    resolveReconcile?.();
  });
});
