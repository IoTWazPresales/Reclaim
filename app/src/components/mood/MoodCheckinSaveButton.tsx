import React, { useRef, useState } from 'react';
import { ReclaimButton } from '@/components/ui/ReclaimButton';

/** The ref closes the same-frame gap before the disabled state has rendered. */
export function MoodCheckinSaveButton({ onSave }: { onSave: () => Promise<void> }) {
  const inFlight = useRef(false);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    try {
      await onSave();
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  return (
    <ReclaimButton variant="primary" onPress={save} disabled={saving} loading={saving}
      style={{ alignSelf: 'flex-start', marginTop: 16 }}
      accessibilityLabel={saving ? 'Saving check-in' : 'Log a quick check-in'}
      accessibilityState={{ disabled: saving, busy: saving }}>
      {saving ? 'Saving…' : 'Save check-in'}
    </ReclaimButton>
  );
}
