import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ Text: 'Text', View: 'View' }));
vi.mock('@/theme', () => ({ useAppTheme: () => ({}) }));
vi.mock('../MedSectionCard', () => ({ MedSectionCard: 'MedSectionCard' }));
vi.mock('@/lib/medIntelligence', () => ({ confidenceLabel: (value: number) => String(value) }));
import { CatalogEducationContent } from '../CatalogEducationBlock';
import { findMedCatalogItemByName } from '@/lib/medCatalog';

let renderer: ReactTestRenderer;
afterEach(async () => { await act(async () => renderer?.unmount()); });
it.each([false, true])('renders truthful education review status (reviewed=%s), retaining catalogue content', async reviewed => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const catalog = { ...findMedCatalogItemByName('sertraline')! };
  if (reviewed) catalog.curation = { tier: 'reviewed', review: {
    reviewer: 'synthetic-test-only', reviewedOn: '2026-09-01', evidenceRef: 'test-fixture-only',
  } };
  await act(async () => { renderer = create(<CatalogEducationContent catalog={catalog}
    theme={{ colors: { onSurface: '#000', onSurfaceVariant: '#333' } } as any} />); });
  const output = JSON.stringify(renderer.toJSON());
  expect(output).toContain(reviewed ? 'Reviewed educational reference' : 'Catalogue reference (not reviewed)');
  expect(output).toContain(catalog.mechanism);
  if (!reviewed) expect(output).not.toContain('Reviewed educational reference');
});
