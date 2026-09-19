/**
 * __DEV__-only Design Lab. Renders four key surfaces per IA direction
 * with mock data. Production channel must never register this route.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  DESIGN_LAB_DIRECTIONS,
  DESIGN_LAB_RECOMMENDATION,
  DESIGN_LAB_RECOMMENDATION_REASON,
  type DesignLabId,
  type DesignLabTokens,
} from '@/theme/designLab/directions';

const SCREENS = ['home', 'training', 'insights', 'meds'] as const;
type LabScreen = (typeof SCREENS)[number];

const MOCK = {
  homeSignal: 'Sleep ran short. Keep today’s session to the first four lifts.',
  sessionLabel: 'Upper Strength',
  exercise: 'Barbell Bench Press',
  setLine: 'Set 2 of 4 · 8 reps · 60 kg',
  insight: 'Low mood on short-sleep nights is associated with skipped sessions the next day.',
  med: 'Sertraline',
  medNote: 'Educational reference matched — not a curated clinical profile.',
};

function LabCard({ t, children }: { t: DesignLabTokens; children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: t.colour.surface,
        borderRadius: t.radius.card,
        borderWidth: t.elevation === 0 ? 1 : 0,
        borderColor: t.colour.border,
        padding: t.space.cardPad,
        marginBottom: t.space.section,
        shadowColor: '#000',
        shadowOpacity: t.elevation > 0 ? 0.35 : 0,
        shadowRadius: t.elevation,
        elevation: t.elevation,
      }}
    >
      {children}
    </View>
  );
}

function Display({ t, children }: { t: DesignLabTokens; children: string }) {
  return (
    <Text
      style={{
        color: t.colour.text,
        fontSize: t.type.displaySize,
        fontWeight: t.type.displayWeight,
        letterSpacing: t.type.letterSpacing,
        lineHeight: t.type.displaySize * t.type.lineHeightMult,
        marginBottom: t.space.section,
      }}
    >
      {children}
    </Text>
  );
}

function Body({ t, children, muted }: { t: DesignLabTokens; children: string; muted?: boolean }) {
  return (
    <Text
      style={{
        color: muted ? t.colour.textMuted : t.colour.text,
        fontSize: t.type.bodySize,
        lineHeight: t.type.bodySize * t.type.lineHeightMult,
        letterSpacing: t.type.letterSpacing / 2,
      }}
    >
      {children}
    </Text>
  );
}

function Meta({ t, children, color }: { t: DesignLabTokens; children: string; color?: string }) {
  return (
    <Text
      style={{
        color: color ?? t.colour.textMuted,
        fontSize: t.type.metaSize,
        letterSpacing: t.type.letterSpacing,
        marginBottom: 6,
        textTransform: t.id === 'signal' ? 'uppercase' : 'none',
      }}
    >
      {children}
    </Text>
  );
}

function Cta({ t, label }: { t: DesignLabTokens; label: string }) {
  return (
    <View
      style={{
        marginTop: t.space.section,
        backgroundColor: t.colour.accent,
        borderRadius: t.radius.button,
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={{ color: t.colour.onAccent, fontWeight: '700', fontSize: t.type.titleSize }}>{label}</Text>
    </View>
  );
}

function HomeMock({ t }: { t: DesignLabTokens }) {
  if (t.id === 'forge') {
    return (
      <>
        <Meta t={t} color={t.colour.domain.training}>
          TODAY’S WORK
        </Meta>
        <Display t={t}>{MOCK.sessionLabel}</Display>
        <Body t={t}>{MOCK.homeSignal}</Body>
        <Cta t={t} label="Start guided" />
      </>
    );
  }
  if (t.id === 'signal') {
    return (
      <>
        <Meta t={t}>SIGNAL BOARD</Meta>
        <Display t={t}>3 flags</Display>
        <LabCard t={t}>
          <Meta t={t} color={t.colour.domain.sleep}>
            SLEEP
          </Meta>
          <Body t={t}>5h 40m · −92 min vs 14d</Body>
        </LabCard>
        <LabCard t={t}>
          <Meta t={t} color={t.colour.domain.mood}>
            MOOD
          </Meta>
          <Body t={t}>3.1 / 5 · 2 check-ins</Body>
        </LabCard>
        <LabCard t={t}>
          <Meta t={t} color={t.colour.domain.training}>
            SESSION
          </Meta>
          <Body t={t}>{`${MOCK.sessionLabel} · cap first four lifts`}</Body>
        </LabCard>
      </>
    );
  }
  return (
    <>
      <Meta t={t}>Saturday · rebuilding</Meta>
      <Display t={t}>Keep it small.</Display>
      <LabCard t={t}>
        <Body t={t}>{MOCK.homeSignal}</Body>
      </LabCard>
      <LabCard t={t}>
        <Meta t={t} color={t.colour.domain.training}>
          Today’s chapter
        </Meta>
        <Body t={t}>{`${MOCK.sessionLabel} — start when you are ready.`}</Body>
        <Cta t={t} label="Open session" />
      </LabCard>
    </>
  );
}

function TrainingMock({ t }: { t: DesignLabTokens }) {
  return (
    <>
      <Meta t={t} color={t.colour.domain.training}>
        {t.id === 'signal' ? 'PROTOCOL' : t.id === 'forge' ? 'GUIDED' : 'Session'}
      </Meta>
      <Display t={t}>{MOCK.exercise}</Display>
      <LabCard t={t}>
        <Body t={t}>{MOCK.setLine}</Body>
        <Body t={t} muted>
          Rest 90s · RIR target not modelled in current engine
        </Body>
        <Cta t={t} label={t.id === 'forge' ? 'DONE' : 'Mark set done'} />
      </LabCard>
      <LabCard t={t}>
        <Meta t={t}>Up next</Meta>
        <Body t={t}>Overhead press · 3 × 6</Body>
      </LabCard>
    </>
  );
}

function InsightsMock({ t }: { t: DesignLabTokens }) {
  return (
    <>
      <Meta t={t} color={t.colour.domain.insights}>
        {t.id === 'hearth' ? 'Why this showed up' : t.id === 'signal' ? 'ASSOCIATION' : 'INSIGHT'}
      </Meta>
      <Display t={t}>{t.id === 'signal' ? 'sleep × mood' : 'A pattern, not a cause.'}</Display>
      <LabCard t={t}>
        <Body t={t}>{MOCK.insight}</Body>
      </LabCard>
      <Body t={t} muted>
        Copy rule: “associated with”, never “causes”.
      </Body>
    </>
  );
}

function MedsMock({ t }: { t: DesignLabTokens }) {
  return (
    <>
      <Meta t={t} color={t.colour.domain.meds}>
        {t.id === 'signal' ? 'SERIES' : 'Medication'}
      </Meta>
      <Display t={t}>{MOCK.med}</Display>
      <LabCard t={t}>
        <Body t={t}>{MOCK.medNote}</Body>
      </LabCard>
      <Cta t={t} label="Log taken" />
    </>
  );
}

export default function DesignLabScreen() {
  const insets = useSafeAreaInsets();
  const [direction, setDirection] = useState<DesignLabId>(DESIGN_LAB_RECOMMENDATION);
  const [screen, setScreen] = useState<LabScreen>('home');
  const t = DESIGN_LAB_DIRECTIONS[direction];

  const body = useMemo(() => {
    if (screen === 'home') return <HomeMock t={t} />;
    if (screen === 'training') return <TrainingMock t={t} />;
    if (screen === 'insights') return <InsightsMock t={t} />;
    return <MedsMock t={t} />;
  }, [screen, t]);

  return (
    <View style={[styles.root, { backgroundColor: t.colour.page }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: t.space.screen,
        }}
      >
        <Text style={{ color: t.colour.textMuted, fontSize: 11, marginBottom: 8 }}>
          __DEV__ Design Lab · not production chrome
        </Text>
        <View style={styles.row}>
          {(Object.keys(DESIGN_LAB_DIRECTIONS) as DesignLabId[]).map((id) => {
            const active = id === direction;
            const tok = DESIGN_LAB_DIRECTIONS[id];
            return (
              <Pressable
                key={id}
                onPress={() => setDirection(id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Direction ${tok.name}`}
                style={{
                  minHeight: 48,
                  paddingHorizontal: 12,
                  marginRight: 8,
                  marginBottom: 8,
                  borderRadius: tok.radius.chip,
                  justifyContent: 'center',
                  backgroundColor: active ? tok.colour.accent : tok.colour.surface,
                }}
              >
                <Text style={{ color: active ? tok.colour.onAccent : tok.colour.text, fontWeight: '700' }}>
                  {tok.name}
                  {id === DESIGN_LAB_RECOMMENDATION ? ' · rec' : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.row}>
          {SCREENS.map((id) => {
            const active = id === screen;
            return (
              <Pressable
                key={id}
                onPress={() => setScreen(id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Screen ${id}`}
                style={{
                  minHeight: 48,
                  paddingHorizontal: 12,
                  marginRight: 8,
                  marginBottom: 12,
                  borderRadius: t.radius.chip,
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: active ? t.colour.accent : t.colour.border,
                }}
              >
                <Text style={{ color: active ? t.colour.accent : t.colour.textMuted }}>{id}</Text>
              </Pressable>
            );
          })}
        </View>
        <LabCard t={t}>
          <Meta t={t}>Who it serves</Meta>
          <Body t={t}>{t.serves}</Body>
        </LabCard>
        <LabCard t={t}>
          <Meta t={t}>IA</Meta>
          <Body t={t}>{t.iaHome}</Body>
        </LabCard>
        {direction === DESIGN_LAB_RECOMMENDATION ? (
          <LabCard t={t}>
            <Meta t={t}>Recommendation</Meta>
            <Body t={t}>{DESIGN_LAB_RECOMMENDATION_REASON}</Body>
          </LabCard>
        ) : null}
        {body}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  row: { flexDirection: 'row', flexWrap: 'wrap' },
});
