import React from 'react';
import { View, Text } from 'react-native';
import type { MD3Theme } from 'react-native-paper';
import { useAppTheme } from '@/theme';
import {
  getCategoryLabel,
  type MedCatalogItem,
} from '@/lib/medCatalog';
import { confidenceLabel } from '@/lib/medIntelligence';
import { MedSectionCard } from './MedSectionCard';
import { GENERAL_PROFILE_EDUCATION_COPY } from './medDetailPresentation';

export type CatalogEducationBlockProps = {
  catalogMatch: MedCatalogItem | null;
  theme: MD3Theme;
  appTheme: ReturnType<typeof useAppTheme>;
};

export function CatalogEducationContent({
  catalog,
  theme,
}: {
  catalog: MedCatalogItem;
  theme: MD3Theme;
}) {
  return (
    <>
      <Text style={{ marginTop: 8, fontSize: 12, opacity: 0.72, color: theme.colors.onSurfaceVariant }}>
        {getCategoryLabel(catalog.category)}
        {catalog.medicationClass ? ` • ${catalog.medicationClass}` : ''} • Confidence:{' '}
        {confidenceLabel(catalog.confidence)}
      </Text>
      <Text style={{ marginTop: 10, opacity: 0.92, color: theme.colors.onSurface }}>{catalog.mechanism}</Text>
      {!!catalog.plainEnglishMechanism && (
        <Text style={{ marginTop: 8, opacity: 0.88, color: theme.colors.onSurfaceVariant }}>
          {catalog.plainEnglishMechanism}
        </Text>
      )}
      {!!catalog.commonUses?.length && (
        <View style={{ marginTop: 10 }}>
          <Text style={{ fontWeight: '600', color: theme.colors.onSurface }}>Common uses (general)</Text>
          {catalog.commonUses.map((u, idx) => (
            <Text key={idx} style={{ marginTop: 4, opacity: 0.85, color: theme.colors.onSurfaceVariant }}>
              • {u}
            </Text>
          ))}
        </View>
      )}
      {(catalog.onsetWindow || catalog.durationWindow) && (
        <View style={{ marginTop: 10 }}>
          <Text style={{ fontWeight: '600', color: theme.colors.onSurface }}>Timing (general, not personalized)</Text>
          {!!catalog.onsetWindow && (
            <Text style={{ marginTop: 4, opacity: 0.85, color: theme.colors.onSurfaceVariant }}>
              Onset: {catalog.onsetWindow}
            </Text>
          )}
          {!!catalog.durationWindow && (
            <Text style={{ marginTop: 4, opacity: 0.85, color: theme.colors.onSurfaceVariant }}>
              Duration: {catalog.durationWindow}
            </Text>
          )}
        </View>
      )}
      {!!catalog.whatYouMightNotice?.length && (
        <View style={{ marginTop: 10 }}>
          <Text style={{ fontWeight: '600', marginBottom: 4, color: theme.colors.onSurface }}>
            What some people notice
          </Text>
          {(catalog.whatYouMightNotice ?? []).map((item, idx) => (
            <Text key={idx} style={{ marginTop: 2, opacity: 0.85, color: theme.colors.onSurfaceVariant }}>
              • {item}
            </Text>
          ))}
        </View>
      )}
      {!!catalog.mentalHealthLinks?.length && (
        <View style={{ marginTop: 10 }}>
          <Text style={{ fontWeight: '600', marginBottom: 4, color: theme.colors.onSurface }}>Related context</Text>
          {(catalog.mentalHealthLinks ?? []).map((item, idx) => (
            <Text key={idx} style={{ marginTop: 2, opacity: 0.85, color: theme.colors.onSurfaceVariant }}>
              • {item}
            </Text>
          ))}
        </View>
      )}
    </>
  );
}

export function CatalogEducationBlock({ catalogMatch, theme, appTheme }: CatalogEducationBlockProps) {
  return (
    <MedSectionCard
      title="How it works"
      subtitle="High-level education — individual responses vary."
      theme={theme}
      appTheme={appTheme}
    >
      {catalogMatch ? (
        <CatalogEducationContent catalog={catalogMatch} theme={theme} />
      ) : (
        <Text style={{ marginTop: 8, opacity: 0.88, color: theme.colors.onSurfaceVariant }}>
          {GENERAL_PROFILE_EDUCATION_COPY}
        </Text>
      )}
    </MedSectionCard>
  );
}
