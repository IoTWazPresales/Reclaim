import { describe, it, expect } from 'vitest';
import { findMedCatalogItemByName } from '@/lib/medCatalog';
import { computeMedContextNotes } from '@/lib/medIntelligence';
import {
  EMPTY_CONTEXT_NOTES_COPY,
  GENERAL_PROFILE_EDUCATION_COPY,
  resolveCatalogEducationMode,
  resolveMedScheduleMode,
  resolveRecentDosesEmptyCopy,
} from '../medDetailPresentation';

describe('CatalogEducationBlock presentation', () => {
  it('uses curated mode when catalogue matches', () => {
    const catalog = findMedCatalogItemByName('sertraline');
    expect(catalog).not.toBeNull();
    expect(resolveCatalogEducationMode(catalog)).toBe('curated');
  });

  it('uses general profile mode when catalogue does not match', () => {
    expect(resolveCatalogEducationMode(null)).toBe('general');
    expect(GENERAL_PROFILE_EDUCATION_COPY).toContain('Without a curated entry');
  });

  it('curated catalogue row includes mechanism text (read-only source)', () => {
    const catalog = findMedCatalogItemByName('sertraline');
    expect(catalog).not.toBeNull();
    expect(catalog!.mechanism.length).toBeGreaterThan(10);
    expect(catalog!.sourceNote?.length).toBeGreaterThan(0);
  });
});

describe('MedContextNotesBlock presentation', () => {
  it('exposes empty-state copy for general profile', () => {
    expect(EMPTY_CONTEXT_NOTES_COPY).toContain('No personalized notes right now');
  });

  it('produces notes when mood signals warrant', () => {
    const notes = computeMedContextNotes({ medName: 'Sertraline', mood: { latest: 2 } });
    expect(notes.length).toBeGreaterThan(0);
  });
});

describe('MedScheduleBlock presentation', () => {
  it('resolves PRN schedule mode', () => {
    expect(
      resolveMedScheduleMode({ isPrn: true, hasSchedule: false, timesLabel: '—', daysLabel: '—' }),
    ).toBe('prn');
  });

  it('resolves scheduled mode for fixed schedules', () => {
    expect(
      resolveMedScheduleMode({ isPrn: false, hasSchedule: true, timesLabel: '08:00', daysLabel: '1,2,3' }),
    ).toBe('scheduled');
  });
});

describe('MedDoseHistoryBlock presentation', () => {
  it('uses PRN-specific empty copy', () => {
    expect(resolveRecentDosesEmptyCopy(true)).toContain('As-needed medications');
  });

  it('uses scheduled empty copy for general profile', () => {
    expect(resolveRecentDosesEmptyCopy(false)).toBe('No doses logged in the last 30 days.');
  });
});
