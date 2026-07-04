import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Button, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
import { formatAdherenceLine, formatNextDoseLabel } from '@/components/meds/medDetailPresentation';
import MoleculeMotif from '@/components/meds/MoleculeMotif';

type MedInlineDetailPanelProps = {
  medId: string;
};

/**
 * Inline medication detail — composes Phase 1 blocks over useMedDetailContext.
 * Rendered inside MedsScreen accordion; no navigation or fetching here beyond the hook.
 */
export function MedInlineDetailPanel({ medId }: MedInlineDetailPanelProps) {
  const theme = useTheme();
  const appTheme = useAppTheme();
  const { scheduleForMed } = useMedReminderScheduler();
  const [aboutExpanded, setAboutExpanded] = useState(true);

  const {
    med,
    catalogMatch,
    profileMode,
    schedule,
    doseHistory,
    contextNotes,
    medsLoading,
    medNotFound,
    logTaken,
    logTakenPending,
  } = useMedDetailContext(medId);

  if (medsLoading && !med) {
    return (
      <View style={{ paddingVertical: 12, paddingHorizontal: 4 }}>
        <Text style={{ color: theme.colors.onSurfaceVariant }}>Loading details…</Text>
      </View>
    );
  }

  if (medNotFound || !med) {
    return (
      <View style={{ paddingVertical: 12, paddingHorizontal: 4 }}>
        <Text style={{ color: theme.colors.error }}>Medication not found.</Text>
      </View>
    );
  }

  return (
    <View
      style={{
        marginTop: 4,
        marginBottom: 8,
        paddingHorizontal: 4,
        paddingBottom: 12,
        borderTopWidth: 1,
        borderTopColor: theme.colors.outlineVariant,
      }}
    >
      {/* Header: labeled dose, mode chip, next dose, one adherence line */}
      <View style={{ marginBottom: 4, marginTop: 8 }}>
        {!!med.dose && (
          <Text style={{ marginTop: 2, opacity: 0.85, color: theme.colors.onSurfaceVariant }}>
            Dose: {med.dose}
          </Text>
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
        {!schedule.isPrn ? (
          <Text style={{ marginTop: 10, fontWeight: '600', color: theme.colors.onSurface }}>
            {(() => {
              const next = formatNextDoseLabel(med.schedule as { times?: string[]; days?: number[] });
              return next ? `Next dose: ${next}` : 'No fixed schedule yet';
            })()}
          </Text>
        ) : null}
        <Text style={{ marginTop: 4, opacity: 0.85, color: theme.colors.onSurfaceVariant }}>
          {formatAdherenceLine(schedule.isPrn, doseHistory)}
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
      </View>

      {/* 1 — About (open by default) */}
      <View style={{ marginTop: 12 }}>
        <Pressable
          onPress={() => setAboutExpanded((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: aboutExpanded }}
          accessibilityLabel="About this medication"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 12,
            paddingHorizontal: 12,
            borderRadius: 12,
            backgroundColor: theme.colors.surfaceVariant,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <MoleculeMotif
              category={catalogMatch?.category}
              medicationClass={catalogMatch?.medicationClass}
              size={48}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: theme.colors.onSurface }}>About this medication</Text>
              <Text style={{ fontSize: 11, opacity: 0.65, color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
                Class motif — illustrative
              </Text>
            </View>
          </View>
          <MaterialCommunityIcons
            name={aboutExpanded ? 'chevron-up' : 'chevron-down'}
            size={22}
            color={theme.colors.onSurfaceVariant}
          />
        </Pressable>

        {aboutExpanded ? (
          <>
            <Text style={{ marginTop: 10, fontSize: 12, opacity: 0.75, color: theme.colors.onSurfaceVariant }}>
              Educational context only — not a diagnosis and not instructions to change medication. Decisions belong
              with your clinician or pharmacist.
            </Text>

            <MedSectionCard
              title="Active ingredient & classification"
              subtitle="From your entry and our reference catalog when your name matches."
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
                    Reclaim doesn’t yet have a reference educational profile for “{med.name}”.
                  </Text>
                  <Text style={{ marginTop: 8, opacity: 0.85, color: theme.colors.onSurfaceVariant }}>
                    Your tracking here still helps you see timing and consistency over time.
                  </Text>
                </>
              )}
            </MedSectionCard>

            <CatalogEducationBlock catalogMatch={catalogMatch} theme={theme} appTheme={appTheme} />

            <MedSectionCard
              title="Possible state relevance"
              subtitle="How Reclaim may use medication as context — not proof of cause."
              theme={theme}
              appTheme={appTheme}
            >
              {catalogMatch && (catalogMatch.effectTags?.length || catalogMatch.stateImpactTags?.length) ? (
                <>
                  <Text style={{ marginTop: 8, fontSize: 12, opacity: 0.78, color: theme.colors.onSurfaceVariant }}>
                    Tags describe where this medication type might overlap with sleep, mood, energy, or training — as one
                    signal among many.
                  </Text>
                  {!!catalogMatch.effectTags?.length && (
                    <View style={{ marginTop: 10 }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.onSurface }}>Effect tags</Text>
                      <Text style={{ marginTop: 4, opacity: 0.88, color: theme.colors.onSurfaceVariant }}>
                        {catalogMatch.effectTags.map(formatEffectTagLabel).join(' · ')}
                      </Text>
                    </View>
                  )}
                  {!!catalogMatch.stateImpactTags?.length && (
                    <View style={{ marginTop: 10 }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.onSurface }}>State impact</Text>
                      <Text style={{ marginTop: 4, opacity: 0.88, color: theme.colors.onSurfaceVariant }}>
                        {catalogMatch.stateImpactTags.map(formatStateImpactTagLabel).join(' · ')}
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <Text style={{ marginTop: 8, opacity: 0.85, color: theme.colors.onSurfaceVariant }}>
                  No state-relevance tags for this catalog entry yet.
                </Text>
              )}
            </MedSectionCard>
          </>
        ) : null}
      </View>

      {/* 2 — Schedule & reminders */}
      <MedScheduleBlock
        schedule={schedule}
        theme={theme}
        appTheme={appTheme}
        onScheduleReminders={() => scheduleForMed(med)}
        onCancelReminders={() => cancelRemindersForMed(med.id!)}
      />

      {/* 3 — Recent doses */}
      <MedDoseHistoryBlock schedule={schedule} doseHistory={doseHistory} theme={theme} appTheme={appTheme} />

      {/* 4 — Context notes (collapsed by default) */}
      <MedContextNotesBlock contextNotes={contextNotes} theme={theme} appTheme={appTheme} defaultExpanded={false} />
    </View>
  );
}
