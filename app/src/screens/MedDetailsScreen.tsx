import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useTheme, Button } from 'react-native-paper';
import { useMedReminderScheduler } from '@/hooks/useMedReminderScheduler';
import { cancelRemindersForMed } from '@/hooks/useNotifications';
import { useMedDetailContext } from '@/hooks/useMedDetailContext';
import {
  getCategoryLabel,
  formatEffectTagLabel,
  formatStateImpactTagLabel,
} from '@/lib/medCatalog';
import { useAppTheme } from '@/theme';
import { medProfileModeLabel } from '@/components/meds/medProfileMode';
import { MedSectionCard } from '@/components/meds/MedSectionCard';
import { MedScheduleBlock } from '@/components/meds/MedScheduleBlock';
import { CatalogEducationBlock } from '@/components/meds/CatalogEducationBlock';
import { MedContextNotesBlock } from '@/components/meds/MedContextNotesBlock';
import { MedDoseHistoryBlock } from '@/components/meds/MedDoseHistoryBlock';

type RouteParams = { id: string };

export default function MedDetailsScreen() {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const route = useRoute();
  const nav = useNavigation();
  const { scheduleForMed } = useMedReminderScheduler();

  const { id } = (route.params as RouteParams) ?? { id: '' };

  const {
    med,
    catalogMatch,
    profileMode,
    schedule,
    doseHistory,
    contextNotes,
    medNotFound,
    logTaken,
    logTakenPending,
  } = useMedDetailContext(id);

  if (medNotFound || !med) {
    return (
      <View style={{ flex: 1, padding: 16, backgroundColor: theme.colors.background }}>
        <Text style={{ fontWeight: '700', fontSize: 18, color: theme.colors.onSurface }}>Medication</Text>
        <Text style={{ marginTop: 8, color: theme.colors.error }}>Not found.</Text>
        <TouchableOpacity onPress={() => (nav as { goBack: () => void }).goBack()} style={{ marginTop: 12 }}>
          <Text style={{ color: theme.colors.primary }}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, backgroundColor: theme.colors.background }}>
      <View style={{ marginBottom: 4 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: theme.colors.onSurface }}>{med.name}</Text>
        {!!med.dose && (
          <Text style={{ marginTop: 2, opacity: 0.85, color: theme.colors.onSurfaceVariant }}>{med.dose}</Text>
        )}
        <Text
          style={{
            marginTop: 8,
            alignSelf: 'flex-start',
            fontSize: 12,
            fontWeight: '600',
            overflow: 'hidden',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: theme.colors.surfaceVariant,
            color: theme.colors.onSurfaceVariant,
          }}
        >
          {medProfileModeLabel(profileMode)}
        </Text>
        {schedule.isPrn ? (
          <Button
            mode="contained-tonal"
            style={{ marginTop: 12, alignSelf: 'flex-start' }}
            onPress={logTaken}
            loading={logTakenPending}
            accessibilityLabel="Log this medication as taken now"
          >
            Log taken now
          </Button>
        ) : null}
        <Text style={{ marginTop: 8, fontSize: 12, opacity: 0.75, color: theme.colors.onSurfaceVariant }}>
          Educational context only — not a diagnosis and not instructions to change medication. Decisions belong with
          your clinician or pharmacist.
        </Text>
      </View>

      <MedScheduleBlock
        schedule={schedule}
        theme={theme}
        appTheme={appTheme}
        onScheduleReminders={() => scheduleForMed(med)}
        onCancelReminders={() => cancelRemindersForMed(med.id!)}
      />

      <MedSectionCard
        title="Active ingredient & classification"
        subtitle="From your entry and our small curated catalog when available."
        theme={theme}
        appTheme={appTheme}
      >
        {catalogMatch ? (
          <>
            {!!catalogMatch.activeIngredients?.length && (
              <Text style={{ marginTop: 8, opacity: 0.9, color: theme.colors.onSurface }}>
                Active ingredient(s): {catalogMatch.activeIngredients.join(', ')}
              </Text>
            )}
            <Text style={{ marginTop: 6, opacity: 0.88, color: theme.colors.onSurfaceVariant }}>
              Class: {catalogMatch.medicationClass ?? getCategoryLabel(catalogMatch.category)}
            </Text>
            <Text style={{ marginTop: 6, fontSize: 12, opacity: 0.72, color: theme.colors.onSurfaceVariant }}>
              Catalog match uses your medication name; spelling or formulation differences can affect matching.
            </Text>
          </>
        ) : (
          <>
            <Text style={{ marginTop: 8, opacity: 0.9, color: theme.colors.onSurface }}>
              Reclaim doesn’t yet have a curated educational profile for “{med.name}”.
            </Text>
            <Text style={{ marginTop: 8, opacity: 0.85, color: theme.colors.onSurfaceVariant }}>
              Your tracking here still helps you see timing and consistency over time. If the name doesn’t look right,
              consider confirming the exact spelling with your pharmacist or clinician — Reclaim can’t verify your
              prescription label.
            </Text>
          </>
        )}
      </MedSectionCard>

      <CatalogEducationBlock catalogMatch={catalogMatch} theme={theme} appTheme={appTheme} />

      <MedContextNotesBlock contextNotes={contextNotes} theme={theme} appTheme={appTheme} />

      <MedSectionCard
        title="Possible state relevance"
        subtitle="How Reclaim may use medication as context — not proof of cause."
        theme={theme}
        appTheme={appTheme}
      >
        {catalogMatch && (catalogMatch.effectTags?.length || catalogMatch.stateImpactTags?.length) ? (
          <>
            <Text style={{ marginTop: 8, fontSize: 12, opacity: 0.78, color: theme.colors.onSurfaceVariant }}>
              Tags describe where this medication type might overlap with how you interpret sleep, mood, energy, pain,
              or training — as one signal among many. They are not predictions about you personally.
            </Text>
            {!!catalogMatch.effectTags?.length && (
              <View style={{ marginTop: 10 }}>
                <Text style={{ fontWeight: '600', color: theme.colors.onSurface }}>May affect interpretation</Text>
                {catalogMatch.effectTags.map((tag) => (
                  <Text key={tag} style={{ marginTop: 4, opacity: 0.88, color: theme.colors.onSurfaceVariant }}>
                    • {formatEffectTagLabel(tag)}
                  </Text>
                ))}
              </View>
            )}
            {!!catalogMatch.stateImpactTags?.length && (
              <View style={{ marginTop: 10 }}>
                <Text style={{ fontWeight: '600', color: theme.colors.onSurface }}>Where context might show up</Text>
                {catalogMatch.stateImpactTags.map((tag) => (
                  <Text key={tag} style={{ marginTop: 4, opacity: 0.88, color: theme.colors.onSurfaceVariant }}>
                    • {formatStateImpactTagLabel(tag)}
                  </Text>
                ))}
              </View>
            )}
          </>
        ) : (
          <Text style={{ marginTop: 8, opacity: 0.88, color: theme.colors.onSurfaceVariant }}>
            When a medication is part of your routine, it can be one context signal alongside sleep, mood, soreness, and
            training — never the whole story. Without curated tags for this name, stick to your logs and care-team
            guidance.
          </Text>
        )}
      </MedSectionCard>

      <MedDoseHistoryBlock schedule={schedule} doseHistory={doseHistory} theme={theme} appTheme={appTheme} />

      <MedSectionCard title="Education boundary" theme={theme} appTheme={appTheme}>
        <Text style={{ marginTop: 6, opacity: 0.88, color: theme.colors.onSurfaceVariant }}>
          Reclaim explains context so your patterns make more sense. It does not tell you to start, stop, combine,
          avoid, or change dose. If something feels off with your medication plan, that conversation belongs with a
          qualified professional.
        </Text>
        {catalogMatch?.sourceNote ? (
          <Text
            style={{ marginTop: 10, fontSize: 12, opacity: 0.72, fontStyle: 'italic', color: theme.colors.onSurfaceVariant }}
          >
            {catalogMatch.sourceNote}
          </Text>
        ) : null}
        {catalogMatch ? (
          <Text
            style={{ marginTop: 10, fontSize: 12, opacity: 0.72, fontStyle: 'italic', color: theme.colors.onSurfaceVariant }}
          >
            {catalogMatch.safetyNote}
          </Text>
        ) : null}
      </MedSectionCard>

      <TouchableOpacity onPress={() => (nav as { goBack: () => void }).goBack()} style={{ alignSelf: 'flex-start', marginTop: 14 }}>
        <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>Open in Meds to edit</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
