import React from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LifecycleHero } from '@/components/dashboard/LifecycleHero';
import { RECLAIM_TAB_BAR_BODY_HEIGHT } from '@/theme/reclaimScreenLayout';
import { LUMEN } from './labTokens';
import { BenchDiagram, ConvergenceChart, DayRail, MoodSpark, SleepRibbon, VolumeWeek } from './LabViz';

const NODES = { mood: 'steady', sleep: 'ok', training: 'today', meds: 'ok', insights: 'ready' };

export function ProductChrome({
  title,
  children,
  tab,
  onMenu,
  onTab,
  onLabExit,
}: {
  title: string;
  children: React.ReactNode;
  tab: 'home' | 'analytics' | 'settings';
  onMenu: () => void;
  onTab: (t: 'home' | 'analytics' | 'settings') => void;
  onLabExit: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: LUMEN.page }}>
      <View
        style={{
          paddingTop: insets.top,
          minHeight: 56 + insets.top,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: LUMEN.surface,
        }}
      >
        <IconButton icon="menu" size={24} iconColor={LUMEN.text} onPress={onMenu} accessibilityLabel="Open navigation menu" />
        <Text style={{ color: LUMEN.text, fontSize: 20, fontWeight: '600', flex: 1 }}>{title}</Text>
        <IconButton icon="close" size={22} iconColor={LUMEN.muted} onPress={onLabExit} accessibilityLabel="Lab picker" />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: RECLAIM_TAB_BAR_BODY_HEIGHT + insets.bottom + 20 }}>
        {children}
      </ScrollView>
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: LUMEN.surface,
          paddingBottom: insets.bottom,
          height: RECLAIM_TAB_BAR_BODY_HEIGHT + insets.bottom,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: LUMEN.line,
        }}
      >
        {(
          [
            { id: 'home' as const, on: 'home', off: 'home-outline', label: 'Home' },
            { id: 'analytics' as const, on: 'stats-chart', off: 'stats-chart-outline', label: 'Analytics' },
            { id: 'settings' as const, on: 'settings', off: 'settings-outline', label: 'Settings' },
          ] as const
        ).map((t) => {
          const active = t.id === tab;
          return (
            <Pressable key={t.id} onPress={() => onTab(t.id)} style={{ flex: 1, alignItems: 'center' }} accessibilityLabel={t.label}>
              <Ionicons name={active ? t.on : t.off} size={22} color={active ? LUMEN.teal : LUMEN.muted} />
              <Text style={{ color: active ? LUMEN.teal : LUMEN.muted, fontSize: 11, marginTop: 2 }}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Caption({ children }: { children: string }) {
  return <Text style={{ color: LUMEN.muted, fontSize: 12, letterSpacing: 0.3 }}>{children}</Text>;
}

export function LumenToday() {
  const { width } = useWindowDimensions();
  const rail = width - 32;
  return (
    <>
      <View style={{ height: 228, overflow: 'hidden' }}>
        <LifecycleHero nodeStatuses={NODES} animationActive={false} />
      </View>
      <View style={{ paddingHorizontal: 16, marginTop: -8 }}>
        <Caption>TODAY</Caption>
        <DayRail width={rail} />
        <View style={{ flexDirection: 'row', marginTop: 16, justifyContent: 'space-between' }}>
          <View>
            <Caption>SLEEP</Caption>
            <SleepRibbon width={rail * 0.55} />
            <Text style={{ color: LUMEN.text, fontSize: 22, fontWeight: '800', marginTop: 4 }}>5h 40m</Text>
          </View>
          <View>
            <Caption>MOOD</Caption>
            <MoodSpark width={rail * 0.38} />
            <Text style={{ color: LUMEN.mood, fontSize: 22, fontWeight: '800', marginTop: 4 }}>3.1</Text>
          </View>
        </View>
        <View style={{ marginTop: 18 }}>
          <Caption>THIS WEEK</Caption>
          <VolumeWeek width={rail} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10 }}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <Text key={`${d}-${i}`} style={{ color: i === 2 ? LUMEN.teal : LUMEN.muted, fontWeight: i === 2 ? '800' : '600', width: rail / 7 - 4, textAlign: 'center' }}>
                {d}
              </Text>
            ))}
          </View>
        </View>
        <Text style={{ color: LUMEN.text, fontSize: 16, fontWeight: '700', marginTop: 18 }}>Short night · first four lifts</Text>
        <View
          accessibilityRole="button"
          accessibilityLabel="Start Upper Strength"
          style={{
            marginTop: 12,
            backgroundColor: LUMEN.teal,
            borderRadius: 999,
            minHeight: 48,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: LUMEN.onTeal, fontWeight: '700', fontSize: 16 }}>Start Upper Strength</Text>
        </View>
      </View>
    </>
  );
}

export function LumenDay() {
  const { width } = useWindowDimensions();
  const rows = [
    { t: '00–06', c: LUMEN.sleep, h: 72, label: 'Sleep' },
    { t: '08:00', c: LUMEN.meds, h: 28, label: 'Sertraline' },
    { t: '12:00', c: LUMEN.mood, h: 28, label: 'Check-in' },
    { t: '16:00', c: LUMEN.training, h: 88, label: 'Upper Strength' },
    { t: '22:00', c: LUMEN.sleep, h: 36, label: 'Wind down' },
  ];
  return (
    <View style={{ padding: 16 }}>
      <Caption>SATURDAY</Caption>
      <Text style={{ color: LUMEN.text, fontSize: 28, fontWeight: '800', marginBottom: 12 }}>Day map</Text>
      {rows.map((r) => (
        <View key={r.t} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ color: LUMEN.muted, width: 52, fontSize: 11 }}>{r.t}</Text>
          <View style={{ flex: 1, height: r.h, borderRadius: 12, backgroundColor: r.c, opacity: 0.85, justifyContent: 'center', paddingHorizontal: 12 }}>
            <Text style={{ color: LUMEN.onTeal, fontWeight: '700' }}>{r.label}</Text>
          </View>
        </View>
      ))}
      <DayRail width={width - 32} />
    </View>
  );
}

export function LumenTraining() {
  const { width } = useWindowDimensions();
  return (
    <View style={{ padding: 16 }}>
      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
        <View style={{ backgroundColor: LUMEN.teal, borderRadius: 999, paddingHorizontal: 16, minHeight: 36, justifyContent: 'center' }}>
          <Text style={{ color: LUMEN.onTeal, fontWeight: '700' }}>Today</Text>
        </View>
      </View>
      <Caption>WEEK 3</Caption>
      <VolumeWeek width={width - 32} height={140} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6, marginBottom: 16 }}>
        {['13', '14', '15', '16', '17', '18', '19'].map((n, i) => (
          <Text key={n} style={{ color: i === 2 ? LUMEN.teal : LUMEN.muted, fontWeight: '800', fontSize: i === 2 ? 18 : 13 }}>
            {n}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: LUMEN.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: LUMEN.line }}>
        <BenchDiagram size={96} />
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={{ color: LUMEN.training, fontSize: 12, fontWeight: '700' }}>BAR PATH</Text>
          <Text style={{ color: LUMEN.text, fontSize: 20, fontWeight: '800' }}>Bench press</Text>
          <Text style={{ color: LUMEN.muted, marginTop: 4 }}>4 × 8 · 60 kg</Text>
        </View>
      </View>
      <View
        accessibilityRole="button"
        accessibilityLabel="Start session"
        style={{ marginTop: 16, backgroundColor: LUMEN.teal, borderRadius: 999, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ color: LUMEN.onTeal, fontWeight: '700', fontSize: 16 }}>Start</Text>
      </View>
    </View>
  );
}

export function LumenSession() {
  return (
    <View style={{ padding: 16, alignItems: 'center' }}>
      <Caption>SET 2 OF 4</Caption>
      <BenchDiagram size={200} />
      <Text style={{ color: LUMEN.text, fontSize: 42, fontWeight: '800', letterSpacing: -1 }}>60 kg</Text>
      <Text style={{ color: LUMEN.teal, fontSize: 28, fontWeight: '700', marginTop: 4 }}>× 8</Text>
      <View style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: LUMEN.teal, alignItems: 'center', justifyContent: 'center', marginTop: 20 }}>
        <Text style={{ color: LUMEN.teal, fontWeight: '800' }}>1:12</Text>
      </View>
      <View
        accessibilityRole="button"
        accessibilityLabel="Mark set done"
        style={{ marginTop: 24, alignSelf: 'stretch', backgroundColor: LUMEN.teal, borderRadius: 999, minHeight: 52, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ color: LUMEN.onTeal, fontWeight: '800', fontSize: 18 }}>Done</Text>
      </View>
    </View>
  );
}

export function LumenGraphs() {
  const { width } = useWindowDimensions();
  const w = width - 32;
  return (
    <View style={{ padding: 16 }}>
      <Caption>28 DAYS</Caption>
      <Text style={{ color: LUMEN.text, fontSize: 22, fontWeight: '800', marginBottom: 8 }}>Together</Text>
      <ConvergenceChart width={w} height={170} />
      <View style={{ flexDirection: 'row', marginTop: 8, marginBottom: 20 }}>
        <Caption>mood</Caption>
        <Text style={{ color: LUMEN.mood, marginLeft: 6, marginRight: 12 }}>●</Text>
        <Caption>sleep</Caption>
        <Text style={{ color: LUMEN.sleep, marginLeft: 6, marginRight: 12 }}>●</Text>
        <Caption>training</Caption>
        <Text style={{ color: LUMEN.training, marginLeft: 6 }}>●</Text>
      </View>
      <Caption>LAST NIGHT</Caption>
      <SleepRibbon width={w} height={48} />
      <View style={{ flexDirection: 'row', marginTop: 20, justifyContent: 'space-between' }}>
        <View>
          <Caption>MOOD 7D</Caption>
          <MoodSpark width={w * 0.45} height={48} />
        </View>
        <View>
          <Caption>VOLUME</Caption>
          <VolumeWeek width={w * 0.48} height={72} />
        </View>
      </View>
    </View>
  );
}

export function LumenDrawer({ onClose }: { onClose: () => void }) {
  const tiles: { label: string; active?: boolean }[] = [
    { label: 'Home', active: true },
    { label: 'Sleep' },
    { label: 'Mood' },
    { label: 'Meds' },
    { label: 'Training' },
    { label: 'Mindfulness' },
    { label: 'Meditation' },
    { label: 'Settings' },
    { label: 'Integrations' },
    { label: 'Notifications' },
  ];
  return (
    <View style={{ flex: 1, backgroundColor: LUMEN.surface, paddingTop: 48, paddingHorizontal: 18 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: LUMEN.text, fontSize: 24, fontWeight: '900' }}>Reclaim</Text>
        <IconButton icon="close" iconColor={LUMEN.text} onPress={onClose} accessibilityLabel="Close menu" />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 16 }}>
        {tiles.map((t) => (
          <View
            key={t.label}
            style={{
              width: '48%',
              marginBottom: 12,
              borderRadius: 16,
              padding: 14,
              borderWidth: 1,
              borderColor: t.active ? LUMEN.teal : LUMEN.line,
              backgroundColor: t.active ? LUMEN.raised : LUMEN.page,
            }}
          >
            <Text style={{ color: LUMEN.text, fontWeight: '700' }}>{t.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function PulseToday() {
  const { width } = useWindowDimensions();
  const w = width - 32;
  return (
    <View style={{ padding: 16 }}>
      <Caption>INSTRUMENTS</Caption>
      <Text style={{ color: LUMEN.text, fontSize: 28, fontWeight: '800', marginBottom: 8 }}>Now</Text>
      <SleepRibbon width={w} height={64} />
      <Text style={{ color: LUMEN.sleep, fontSize: 36, fontWeight: '800', marginVertical: 8 }}>5h 40m</Text>
      <MoodSpark width={w} height={56} />
      <Text style={{ color: LUMEN.mood, fontSize: 36, fontWeight: '800', marginVertical: 8 }}>3.1</Text>
      <VolumeWeek width={w} height={80} />
      <View
        style={{
          marginTop: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: LUMEN.raised,
          overflow: 'hidden',
        }}
      >
        <View style={{ width: '42%', height: '100%', backgroundColor: LUMEN.training }} />
      </View>
      <Caption>SESSION LOAD 42%</Caption>
    </View>
  );
}
