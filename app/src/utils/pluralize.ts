/** English count + noun: `pluralize(1, 'exercise')` → `"1 exercise"`. */
export function pluralize(count: number, singular: string, plural?: string): string {
  const noun = count === 1 ? singular : (plural ?? `${singular}s`);
  return `${count} ${noun}`;
}
