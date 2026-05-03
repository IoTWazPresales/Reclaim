import { describe, it, expect } from 'vitest';
import { guidedNotificationOverlayChoice } from '@/lib/training/guidedNotificationRoute';

describe('guidedNotificationOverlayChoice', () => {
  it('opens edit for edit_set', () => {
    expect(
      guidedNotificationOverlayChoice({
        action: 'edit_set',
        isPerformed: false,
      }),
    ).toBe('edit');
  });

  it('opens focus for REST Next set even if stale performed says done', () => {
    expect(
      guidedNotificationOverlayChoice({
        action: 'set_done',
        fromRestNextSet: true,
        isPerformed: true,
      }),
    ).toBe('focus');
  });

  it('opens edit when set already performed and not from REST Next', () => {
    expect(
      guidedNotificationOverlayChoice({
        action: 'set_done',
        isPerformed: true,
      }),
    ).toBe('edit');
  });

  it('opens focus for pending set_done', () => {
    expect(
      guidedNotificationOverlayChoice({
        action: 'set_done',
        isPerformed: false,
      }),
    ).toBe('focus');
  });
});
