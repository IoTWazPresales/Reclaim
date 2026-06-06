import { describe, it, expect } from 'vitest';
import { guidedNotificationOverlayChoice } from '@/lib/training/guidedNotificationRoute';

describe('guidedNotificationOverlayChoice', () => {
  it('opens edit for edit_set', () => {
    expect(
      guidedNotificationOverlayChoice({
        action: 'edit_set',
        isActiveSetAlreadyPerformed: false,
      }),
    ).toBe('edit');
  });

  it('suppresses overlay when active work set is already performed', () => {
    expect(
      guidedNotificationOverlayChoice({
        action: 'set_done',
        isActiveSetAlreadyPerformed: true,
      }),
    ).toBe('none');
  });

  it('opens focus for pending set_done', () => {
    expect(
      guidedNotificationOverlayChoice({
        action: 'set_done',
        isActiveSetAlreadyPerformed: false,
      }),
    ).toBe('focus');
  });
});
