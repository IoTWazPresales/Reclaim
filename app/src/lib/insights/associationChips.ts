/**
 * Nerd-mode chips for sleep, mood, and a training session.
 * The wording is association only.
 */

export type AssociationDomain = 'sleep' | 'mood' | 'session';

const LABELS: Record<AssociationDomain, string> = {
  sleep: 'Associated with sleep',
  mood: 'Associated with mood',
  session: 'Associated with a training session',
};

const ORDER: readonly AssociationDomain[] = ['sleep', 'mood', 'session'];

function addDomain(domains: Set<AssociationDomain>, value: string): void {
  const text = value.trim().toLowerCase();
  if (!text) return;
  if (text === 'sleep' || text.startsWith('sleep.') || text.startsWith('sleep_')) domains.add('sleep');
  if (text === 'mood' || text.startsWith('mood.') || text.startsWith('mood_')) domains.add('mood');
  if (
    text === 'training' ||
    text.startsWith('training.') ||
    text.startsWith('training_') ||
    text === 'session' ||
    text.startsWith('session.')
  ) {
    domains.add('session');
  }
}

export function associationChipLabels(input: {
  sourceTag?: string | null;
  fields?: readonly string[] | null;
}): string[] {
  const domains = new Set<AssociationDomain>();
  addDomain(domains, input.sourceTag ?? '');
  for (const field of input.fields ?? []) addDomain(domains, field);
  return ORDER.filter((domain) => domains.has(domain)).map((domain) => LABELS[domain]);
}
