/** Format medication dose strings with units when missing (e.g. `150` → `150 mg`). */
export function formatMedDoseLabel(dose?: string | null, unitHint?: string | null): string {
  const raw = (dose ?? '').trim();
  if (!raw) return '';

  if (/\b(mg|mcg|g|ml|units?|iu|µg)\b/i.test(raw)) return raw;

  const numericOnly = /^\d+(\.\d+)?$/.test(raw);
  if (numericOnly) {
    const unit = (unitHint ?? 'mg').trim() || 'mg';
    return `${raw} ${unit}`;
  }

  return raw;
}
