import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNotifications, requestPermission as requestNotiPermission } from '@/hooks/useNotifications';
import { setHasOnboarded } from '@/state/onboarding';
import { supabase } from '@/lib/supabase';

type OnboardingStackParamList = {
  Goals: undefined;
  Permissions: undefined;
};

type PermissionsScreenNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'Permissions'>;

let requestHealthConnectPermission: null | (() => Promise<boolean>) = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const HC = require('react-native-health-connect');
  requestHealthConnectPermission = async () => {
    try {
      await HC.requestPermission([
        { accessType: 'read', recordType: 'com.google.sleep.session' },
        { accessType: 'read', recordType: 'com.google.sleep.stage' },
      ]);
      return true;
    } catch {
      return false;
    }
  };
} catch {
  // Module not available — stays null
}

export default function PermissionsScreen() {
  const navigation = useNavigation<PermissionsScreenNavigationProp>();
  const [notiGranted, setNotiGranted] = useState(false);
  const [hcGranted, setHcGranted] = useState(false);

  useNotifications(); // ensure channels/categories exist

  async function enableNotifications() {
    const ok = await requestNotiPermission();
    setNotiGranted(!!ok);
    if (!ok) Alert.alert('Notifications', 'Permission was not granted.');
  }

  async function enableHealthConnect() {
    if (Platform.OS !== 'android' || !requestHealthConnectPermission) {
      Alert.alert('Health Connect', 'Not available on this device.');
      return;
    }
    const ok = await requestHealthConnectPermission();
    setHcGranted(!!ok);
    if (!ok) Alert.alert('Health Connect', 'Permission was not granted.');
  }

  async function finish() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles')
          .update({ has_onboarded: true })
          .eq('id', user.id);
      }
    } catch { /* non-fatal */ }

    await setHasOnboarded(true);
    // Navigation will be handled by RootNavigator which checks has_onboarded
    // Force a refresh by logging out and back in, or just wait for auth state change
    // For now, we'll rely on RootNavigator to detect the change
  }

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: '800', marginBottom: 12 }}>Permissions</Text>
      <Text style={{ opacity: 0.7, marginBottom: 20 }}>
        Notifications help with reminders. Health data (Android) enables sleep insights.
      </Text>

      <TouchableOpacity
        onPress={enableNotifications}
        style={{
          backgroundColor: notiGranted ? '#16a34a' : '#0ea5e9',
          padding: 14, borderRadius: 12, marginBottom: 12, alignItems: 'center'
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>
          {notiGranted ? 'Notifications enabled ✓' : 'Enable notifications'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={enableHealthConnect}
        style={{
          backgroundColor: hcGranted ? '#16a34a' : '#0ea5e9',
          padding: 14, borderRadius: 12, marginBottom: 24, alignItems: 'center'
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>
          {hcGranted ? 'Health Connect enabled ✓' : 'Enable Health Connect (Android)'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={finish}
        style={{ backgroundColor: '#111827', padding: 14, borderRadius: 12, alignItems: 'center' }}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>Finish</Text>
      </TouchableOpacity>
    </View>
  );
}
