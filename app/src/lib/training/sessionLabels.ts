/**
 * Session template display labels - shared across Dashboard, Training, etc.
 */
import type { SessionTemplate } from './types';

const SESSION_TEMPLATE_LABELS: Record<SessionTemplate, string> = {
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  upper: 'Upper',
  lower: 'Lower',
  full_body: 'Full Body',
  conditioning: 'Conditioning',
};

export function getSessionTemplateLabel(template: SessionTemplate | string): string {
  return SESSION_TEMPLATE_LABELS[template as SessionTemplate] ?? formatTemplateKey(template);
}

/** Format training routine template ID (e.g. training_full_body) to display string */
export function formatTrainingRoutineTemplateId(templateId: string): string {
  if (!templateId.startsWith('training_')) return templateId;
  const suffix = templateId.replace('training_', '');
  return getSessionTemplateLabel(suffix);
}

function formatTemplateKey(key: string): string {
  return key
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
