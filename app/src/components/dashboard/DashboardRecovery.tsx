import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { InformationalCard } from '@/components/ui';
import type { RecoveryActionStep } from '@/lib/dashboard/recoveryCardMeta';
import type { RecoveryStage, RecoveryStageId } from '@/lib/recovery';
import { useAppTheme } from '@/theme';

const STAGE_ORDER: RecoveryStageId[] = ['foundation', 'stabilize', 'optimize', 'thrive'];

/** Primary journey CTA — full pill, aligned with Reclaim’s softer rounded actions */
const CTA_PILL_RADIUS = 999;
const CTA_VERT_PAD = 13;
const CTA_HORIZ_PAD = 22;

export type DashboardRecoveryProps = {
  stage: RecoveryStage;
  currentStageId: RecoveryStageId;
  currentWeek: number | undefined;
  weekInStage: { current: number; total: number } | null;
  steps: RecoveryActionStep[];
  blockerLine: string | null;
  ctaLabel: string;
  onCtaPress: () => void;
  onStepPress: (stepId: string) => void;
};

/** Quiet journey colors — localized to this surface only */
function journeyPalette(theme: MD3Theme, dark: boolean) {
  if (dark) {
    return {
      surface: '#111A2C',
      railWell: 'rgba(108, 142, 205, 0.085)',
      borderSoft: 'rgba(125, 160, 215, 0.13)',
      accent: 'rgba(178, 212, 255, 0.94)',
      accentMuted: 'rgba(156, 198, 250, 0.48)',
      trackLine: 'rgba(115, 155, 210, 0.26)',
      trackLineDim: 'rgba(95, 120, 160, 0.19)',
      /** Editorial focus — no harsh “inset box” */
      focusWash: 'rgba(115, 155, 220, 0.055)',
      focusBorder: 'rgba(145, 185, 235, 0.22)',
      pathDivider: 'rgba(125, 150, 185, 0.11)',
      actionCue: 'rgba(200, 222, 255, 0.9)',
      actionCueWell: 'rgba(255, 255, 255, 0.055)',
      actionCueWellBorder: 'rgba(165, 195, 240, 0.18)',
      done: 'rgba(120, 215, 165, 0.9)',
      doneWell: 'rgba(80, 200, 140, 0.12)',
      doneWellBorder: 'rgba(120, 215, 165, 0.22)',
      /** Warm-soft tonal fill for main CTA (not flat enterprise blue) */
      ctaFill: 'rgba(125, 155, 215, 0.28)',
      ctaPressed: 'rgba(125, 155, 215, 0.38)',
    };
  }
  return {
    surface: theme.colors.surface,
    railWell: 'rgba(37, 99, 235, 0.055)',
    borderSoft: 'rgba(37, 99, 235, 0.11)',
    accent: theme.colors.primary,
    accentMuted: theme.colors.primary,
    trackLine: 'rgba(37, 99, 235, 0.2)',
    trackLineDim: theme.colors.outlineVariant,
    focusWash: 'rgba(37, 99, 235, 0.045)',
    focusBorder: 'rgba(37, 99, 235, 0.16)',
    pathDivider: theme.colors.outlineVariant,
    actionCue: theme.colors.primary,
    actionCueWell: 'rgba(37, 99, 235, 0.07)',
    actionCueWellBorder: 'rgba(37, 99, 235, 0.14)',
    done: theme.colors.tertiary,
    doneWell: 'rgba(34, 197, 94, 0.12)',
    doneWellBorder: 'rgba(34, 197, 94, 0.22)',
    ctaFill: theme.colors.primaryContainer,
    ctaPressed: theme.colors.secondaryContainer,
  };
}

function stageDotColors(j: ReturnType<typeof journeyPalette>, theme: MD3Theme, activeIndex: number) {
  return STAGE_ORDER.map((_, i) => {
    if (i < activeIndex) return j.accentMuted;
    if (i === activeIndex) return j.accent;
    return theme.dark ? 'rgba(148, 163, 184, 0.19)' : 'rgba(148, 163, 184, 0.42)';
  });
}

function connectorColor(j: ReturnType<typeof journeyPalette>, theme: MD3Theme, segmentEndsBeforeIndex: number, activeIndex: number) {
  if (segmentEndsBeforeIndex < activeIndex) return j.trackLine;
  if (segmentEndsBeforeIndex === activeIndex) return j.trackLine;
  return j.trackLineDim;
}

function stepIcon(
  state: RecoveryActionStep['state'],
  theme: MD3Theme,
  j: ReturnType<typeof journeyPalette>,
): { name: keyof typeof MaterialCommunityIcons.glyphMap; color: string; size: number } {
  if (state === 'done') {
    return { name: 'check-circle', color: j.done, size: 19 };
  }
  if (state === 'in_progress') {
    return { name: 'progress-clock', color: j.accent, size: 20 };
  }
  return { name: 'circle-outline', color: theme.dark ? 'rgba(148, 163, 184, 0.36)' : theme.colors.outline, size: 18 };
}

export function DashboardRecovery(dashboardRecoveryProps: DashboardRecoveryProps) {
  const { stage, currentStageId, currentWeek, weekInStage, steps, blockerLine, ctaLabel, onCtaPress, onStepPress } =
    dashboardRecoveryProps;
  const theme = useTheme<MD3Theme>();
  const appTheme = useAppTheme();
  const j = journeyPalette(theme, theme.dark);
  const stageIndex = Math.max(0, STAGE_ORDER.indexOf(currentStageId));
  const dotColors = stageDotColors(j, theme, stageIndex);

  const unlockParts: string[] = [];
  if (weekInStage) {
    unlockParts.push(`Week ${weekInStage.current} of ${weekInStage.total} in this stage`);
  }
  if (currentStageId === 'foundation' || currentStageId === 'stabilize') {
    const done = steps.filter((s) => s.state === 'done').length;
    if (steps.length) unlockParts.push(`${done} of ${steps.length} moves complete`);
  }
  const unlockLine = unlockParts.join(' · ');

  return (
    <InformationalCard
      feedbackScope={{ componentKey: 'dashboard-recovery', componentTitle: 'Recovery', tags: ['dashboard', 'recovery'] }}
      style={{
        backgroundColor: j.surface,
        borderLeftWidth: 0,
        borderWidth: 1,
        borderColor: j.borderSoft,
      }}
      contentContainerStyle={{
        paddingVertical: appTheme.spacing.lg + 2,
        paddingHorizontal: appTheme.spacing.lg,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
        <View
          style={{
            marginRight: 15,
            paddingVertical: 10,
            paddingHorizontal: 8,
            borderRadius: 18,
            backgroundColor: j.railWell,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: j.borderSoft,
            justifyContent: 'flex-start',
          }}
          accessibilityRole="none"
          accessibilityLabel={`Recovery stage ${stageIndex + 1} of ${STAGE_ORDER.length}`}
        >
          {STAGE_ORDER.map((id, i) => (
            <View key={id} style={{ alignItems: 'center' }}>
              <View
                style={{
                  width: i === stageIndex ? 10 : 7,
                  height: i === stageIndex ? 10 : 7,
                  borderRadius: 999,
                  backgroundColor: dotColors[i],
                  borderWidth: i > stageIndex ? StyleSheet.hairlineWidth : 0,
                  borderColor: i > stageIndex ? j.trackLineDim : 'transparent',
                  opacity: i === stageIndex ? 1 : i < stageIndex ? 0.9 : 1,
                }}
              />
              {i < STAGE_ORDER.length - 1 ? (
                <View
                  style={{
                    width: 2,
                    height: 11,
                    marginVertical: 3,
                    borderRadius: 1,
                    backgroundColor: connectorColor(j, theme, i, stageIndex),
                  }}
                />
              ) : null}
            </View>
          ))}
        </View>

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            variant="titleLarge"
            style={{
              fontWeight: '700',
              color: theme.colors.onSurface,
              letterSpacing: -0.35,
            }}
          >
            Recovery
          </Text>

          <Text
            variant="titleMedium"
            style={{
              marginTop: 7,
              fontWeight: '700',
              color: theme.colors.onSurface,
              letterSpacing: -0.15,
            }}
          >
            {stage.title}
            {currentWeek ? (
              <Text style={{ fontWeight: '500', color: j.accentMuted }}>{` · Week ${currentWeek}`}</Text>
            ) : null}
          </Text>

          <Text
            variant="bodyMedium"
            style={{
              marginTop: 5,
              color: theme.colors.onSurfaceVariant,
              lineHeight: 21,
              opacity: 0.9,
            }}
          >
            {stage.summary}
          </Text>

          {unlockLine ? (
            <Text
              style={{
                marginTop: 9,
                fontSize: 12,
                fontWeight: '500',
                letterSpacing: 0.12,
                color: theme.colors.onSurfaceVariant,
                opacity: 0.82,
              }}
            >
              <Text style={{ color: j.accentMuted, fontWeight: '600' }}>Next unlock </Text>
              {unlockLine}
            </Text>
          ) : null}

          {blockerLine ? (
            <View
              style={{
                marginTop: 15,
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 18,
                backgroundColor: j.focusWash,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: j.focusBorder,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '700',
                  letterSpacing: 0.85,
                  color: j.accentMuted,
                  textTransform: 'uppercase',
                  opacity: 0.95,
                }}
              >
                Current focus
              </Text>
              <Text
                variant="bodySmall"
                style={{ marginTop: 6, color: theme.colors.onSurface, lineHeight: 20, opacity: 0.94, fontWeight: '400' }}
              >
                {blockerLine}
              </Text>
            </View>
          ) : null}

          <View
            style={{
              marginTop: 17,
              paddingTop: 13,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: j.pathDivider,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: '700',
                letterSpacing: 0.95,
                color: theme.colors.onSurfaceVariant,
                textTransform: 'uppercase',
                opacity: 0.52,
              }}
            >
              Your path
            </Text>

            <View style={{ marginTop: 6 }}>
              {steps.map((step, index) => {
                const { name: iconName, color: iconColor, size: iconSize } = stepIcon(step.state, theme, j);
                const pressable = step.state !== 'done';
                const rowInner = (
                  <>
                    <View style={{ width: 28, alignItems: 'center', paddingTop: 2 }}>
                      <MaterialCommunityIcons name={iconName} size={iconSize} color={iconColor} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
                      <Text
                        variant="titleSmall"
                        style={{
                          fontWeight: '600',
                          color: theme.colors.onSurface,
                          letterSpacing: -0.1,
                          lineHeight: 20,
                        }}
                      >
                        {step.title}
                      </Text>
                      <Text
                        variant="bodySmall"
                        style={{
                          marginTop: 3,
                          color: theme.colors.onSurfaceVariant,
                          lineHeight: 19,
                          opacity: 0.84,
                          fontWeight: '400',
                        }}
                      >
                        {step.statusLine}
                      </Text>
                    </View>
                    {pressable ? (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          alignSelf: 'flex-start',
                          marginTop: 1,
                          paddingLeft: 12,
                          paddingRight: 9,
                          paddingVertical: 7,
                          borderRadius: 999,
                          backgroundColor: j.actionCueWell,
                          borderWidth: StyleSheet.hairlineWidth,
                          borderColor: j.actionCueWellBorder,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '600',
                            letterSpacing: 0.15,
                            color: j.actionCue,
                          }}
                        >
                          {step.actionCue}
                        </Text>
                        <MaterialCommunityIcons name="chevron-right" size={16} color={j.actionCue} style={{ opacity: 0.72, marginLeft: 2 }} />
                      </View>
                    ) : (
                      <View
                        style={{
                          alignSelf: 'flex-start',
                          marginTop: 1,
                          paddingHorizontal: 11,
                          paddingVertical: 6,
                          borderRadius: 999,
                          backgroundColor: j.doneWell,
                          borderWidth: StyleSheet.hairlineWidth,
                          borderColor: j.doneWellBorder,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '700',
                            letterSpacing: 0.35,
                            color: j.done,
                            textTransform: 'uppercase',
                          }}
                        >
                          Done
                        </Text>
                      </View>
                    )}
                  </>
                );

                return (
                  <View key={step.id}>
                    {index === 0 ? null : (
                      <View
                        style={{
                          height: StyleSheet.hairlineWidth,
                          backgroundColor: j.pathDivider,
                          marginLeft: 26,
                          marginVertical: 3,
                          opacity: 0.85,
                        }}
                      />
                    )}
                    {pressable ? (
                      <Pressable
                        onPress={() => onStepPress(step.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`${step.title}. ${step.statusLine}. ${step.actionCue}`}
                        android_ripple={{
                          color: theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(37, 99, 235, 0.07)',
                          borderless: false,
                        }}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'flex-start',
                          paddingVertical: 12,
                          marginHorizontal: -6,
                          paddingHorizontal: 6,
                          borderRadius: 16,
                          backgroundColor: pressed ? (theme.dark ? 'rgba(255,255,255,0.035)' : 'rgba(37, 99, 235, 0.045)') : 'transparent',
                        })}
                      >
                        {rowInner}
                      </Pressable>
                    ) : (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'flex-start',
                          paddingVertical: 12,
                          marginHorizontal: -6,
                          paddingHorizontal: 6,
                          borderRadius: 16,
                          opacity: theme.dark ? 0.8 : 0.87,
                        }}
                        accessibilityRole="text"
                        accessibilityLabel={`${step.title}. ${step.statusLine}. Complete`}
                      >
                        {rowInner}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          <Button
            mode="contained-tonal"
            buttonColor={j.ctaFill}
            textColor={theme.colors.onSurface}
            onPress={onCtaPress}
            style={{
              marginTop: 20,
              borderRadius: CTA_PILL_RADIUS,
              alignSelf: 'stretch',
            }}
            contentStyle={{
              paddingVertical: CTA_VERT_PAD,
              paddingHorizontal: CTA_HORIZ_PAD,
            }}
            labelStyle={{
              fontSize: 15,
              fontWeight: '600',
              letterSpacing: 0.08,
            }}
            accessibilityHint={
              ctaLabel.includes('plan') || ctaLabel.includes('unlock')
                ? 'Opens your recovery plan in Settings'
                : 'Opens the best screen to continue this stage'
            }
          >
            {ctaLabel}
          </Button>
        </View>
      </View>
    </InformationalCard>
  );
}
