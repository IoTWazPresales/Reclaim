import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, TextInput, ScrollView, Platform } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  loadSleepSettings,
  saveSleepSettings,
  type SleepSettings,
} from '@/lib/sleepSettings';

import {
  ensureNotificationPermission,
  scheduleMoodCheckinReminders,
  cancelMoodCheckinReminders,
  scheduleBedtimeSuggestion,
  scheduleMorningConfirm,
  cancelAllReminders,
} from '@/hooks/useNotifications';

import { useMedReminderScheduler } from '@/hooks/useMedReminderScheduler';
import { listMeds, type Med } from '@/lib/api';

function Row({ children }: { children: React.ReactNode }) {
  return <View style={{ marginTop: 10 }}>{children}</View>;
}

export default function SettingsScreen() {
  const qc = useQueryClient();

  // Sleep settings
  const settingsQ = useQuery<SleepSettings>({
    queryKey: ['sleep:settings'],
    queryFn: loadSleepSettings,
  });

  // Local form state
  const [desiredWake, setDesiredWake] = useState('');
  const [typicalWake, setTypicalWake] = useState('');
  const [targetSleep, setTargetSleep] = useState('480'); // minutes

  useEffect(() => {
    if (!settingsQ.data) return;
    setDesiredWake(settingsQ.data.desiredWakeHHMM ?? '');
    setTypicalWake(settingsQ.data.typicalWakeHHMM ?? '07:00');
    setTargetSleep(String(settingsQ.data.targetSleepMinutes ?? 480));
  }, [settingsQ.data?.desiredWakeHHMM, settingsQ.data?.typicalWakeHHMM, settingsQ.data?.targetSleepMinutes]);

  // Meds (for bulk reschedule)
  const medsQ = useQuery({
    queryKey: ['meds'],
    queryFn: () => listMeds(),
  });
  const { scheduleForMed } = useMedReminderScheduler();

  // Save sleep settings
  const saveMut = useMutation({
    mutationFn: async () => {
      const next = await saveSleepSettings({
        desiredWakeHHMM: desiredWake?.trim() || undefined,
        typicalWakeHHMM: typicalWake?.trim() || '07:00',
        targetSleepMinutes: Math.max(60, Math.min(720, parseInt(targetSleep || '480', 10) || 480)),
      });
      return next;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['sleep:settings'] });
      Alert.alert('Saved', 'Sleep settings updated.');
    },
    onError: (e: any) => Alert.alert('Error', e?.message ?? 'Failed to save settings'),
  });

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>Settings</Text>

      {/* Notifications */}
      <View style={{ marginTop: 14, padding: 14, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16 }}>
        <Text style={{ fontWeight: '700' }}>Notifications</Text>
        <Row>
          <TouchableOpacity
            onPress={async () => {
              const ok = await ensureNotificationPermission();
              Alert.alert('Permissions', ok ? 'Granted' : 'Not granted');
            }}
            style={{ backgroundColor: '#111827', padding: 12, borderRadius: 12, alignItems: 'center' }}
          >
            <Text style={{ color: 'white', fontWeight: '700' }}>Request permission</Text>
          </TouchableOpacity>
        </Row>

        <Row>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <TouchableOpacity
              onPress={async () => {
                try {
                  await scheduleMoodCheckinReminders();
                  Alert.alert('Scheduled', 'Mood check-ins at 08:00 and 20:00.');
                } catch (e: any) {
                  Alert.alert('Error', e?.message ?? 'Failed to schedule mood check-ins');
                }
              }}
              style={{ backgroundColor: '#111827', padding: 10, borderRadius: 10, marginRight: 10, marginBottom: 8 }}
            >
              <Text style={{ color: 'white', fontWeight: '700' }}>Enable mood check-ins</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async () => {
                try {
                  await cancelMoodCheckinReminders();
                  Alert.alert('Canceled', 'Mood check-ins disabled.');
                } catch (e: any) {
                  Alert.alert('Error', e?.message ?? 'Failed to cancel mood check-ins');
                }
              }}
              style={{ padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 }}
            >
              <Text style={{ fontWeight: '700' }}>Disable mood check-ins</Text>
            </TouchableOpacity>
          </View>
        </Row>
      </View>

      {/* Sleep planning */}
      <View style={{ marginTop: 14, padding: 14, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16 }}>
        <Text style={{ fontWeight: '700' }}>Sleep</Text>

        <Row>
          <Text style={{ marginBottom: 6, fontWeight: '600' }}>Desired wake (HH:MM)</Text>
          <TextInput
            value={desiredWake}
            onChangeText={setDesiredWake}
            placeholder="07:00"
            inputMode="numeric"
            style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 10 }}
          />
        </Row>

        <Row>
          <Text style={{ marginBottom: 6, fontWeight: '600' }}>Typical wake (HH:MM)</Text>
          <TextInput
            value={typicalWake}
            onChangeText={setTypicalWake}
            placeholder="07:00"
            inputMode="numeric"
            style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 10 }}
          />
        </Row>

        <Row>
          <Text style={{ marginBottom: 6, fontWeight: '600' }}>Target sleep window (minutes)</Text>
          <TextInput
            value={targetSleep}
            onChangeText={setTargetSleep}
            placeholder="480"
            inputMode="numeric"
            style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 10 }}
          />
        </Row>

        <Row>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <TouchableOpacity
              onPress={() => saveMut.mutate()}
              style={{ backgroundColor: '#111827', padding: 12, borderRadius: 12, alignItems: 'center', marginRight: 10, marginBottom: 8 }}
            >
              <Text style={{ color: 'white', fontWeight: '700' }}>Save sleep settings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={async () => {
                try {
                  const s = settingsQ.data;
                  const wake = s?.typicalWakeHHMM ?? '07:00';
                  const mins = s?.targetSleepMinutes ?? 480;
                  await scheduleBedtimeSuggestion(wake, mins);
                  Alert.alert('Scheduled', `Bedtime suggestion based on wake ${wake} and ${(mins/60).toFixed(1)}h target.`);
                } catch (e: any) {
                  Alert.alert('Error', e?.message ?? 'Failed to schedule bedtime');
                }
              }}
              style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 }}
            >
              <Text style={{ fontWeight: '700' }}>Schedule bedtime</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={async () => {
                try {
                  const s = settingsQ.data;
                  const wake = s?.typicalWakeHHMM ?? '07:00';
                  await scheduleMorningConfirm(wake);
                  Alert.alert('Scheduled', `Morning confirm at ${wake}.`);
                } catch (e: any) {
                  Alert.alert('Error', e?.message ?? 'Failed to schedule morning confirm');
                }
              }}
              style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8, marginLeft: 10 }}
            >
              <Text style={{ fontWeight: '700' }}>Schedule morning confirm</Text>
            </TouchableOpacity>
          </View>
        </Row>
      </View>

      {/* Med reminders maintenance */}
      <View style={{ marginTop: 14, padding: 14, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16 }}>
        <Text style={{ fontWeight: '700' }}>Med Reminders</Text>
        <Row>
          <TouchableOpacity
            onPress={async () => {
              try {
                const meds = (medsQ.data as Med[] | undefined) ?? [];
                if (!meds.length) {
                  Alert.alert('No meds', 'Add a medication first.');
                  return;
                }
                let count = 0;
                for (const m of meds) {
                  await scheduleForMed(m);
                  count++;
                }
                Alert.alert('Scheduled', `Refreshed next 24h reminders for ${count} med${count===1?'':'s'}.`);
              } catch (e: any) {
                Alert.alert('Error', e?.message ?? 'Failed to schedule med reminders');
              }
            }}
            style={{ backgroundColor: '#111827', padding: 12, borderRadius: 12, alignItems: 'center' }}
          >
            <Text style={{ color: 'white', fontWeight: '700' }}>Reschedule next 24h</Text>
          </TouchableOpacity>
        </Row>

        <Row>
          <TouchableOpacity
            onPress={async () => {
              await cancelAllReminders();
              Alert.alert('Cleared', 'All scheduled notifications canceled.');
            }}
            style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' }}
          >
            <Text style={{ fontWeight: '700' }}>Cancel all notifications</Text>
          </TouchableOpacity>
        </Row>
      </View>

      {/* Platform blurb */}
      <View style={{ marginTop: 14, padding: 14, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16 }}>
        <Text style={{ fontWeight: '700' }}>Platform</Text>
        <Text style={{ opacity: 0.85, marginTop: 6 }}>
          {Platform.OS === 'android'
            ? 'Android with Google Fit sleep support.'
            : 'iOS — Apple HealthKit sleep import.'}
        </Text>
      </View>
    </ScrollView>
  );
}
