import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from 'react-native-paper';
import { useNotifications, requestPermission as requestNotiPermission } from '@/hooks/useNotifications';
import { setHasOnboarded } from '@/state/onboarding';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import {
  getGoogleFitProvider,
  googleFitHasPermissions,
  googleFitRequestPermissions,
} from '@/lib/health/googleFitService';

type OnboardingStackParamList = {
  Goals: undefined;
  Permissions: undefined;
};

type PermissionsScreenNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'Permissions'>;

export default function PermissionsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<PermissionsScreenNavigationProp>();
  const [notiGranted, setNotiGranted] = useState(false);
  const [healthGranted, setHealthGranted] = useState(false);
  const [availablePlatform, setAvailablePlatform] = useState<string>('');

  useNotifications(); // ensure channels/categories exist

  useEffect(() => {
    (async () => {
      const provider = getGoogleFitProvider();
      const available = await provider.isAvailable();
      if (!available) {
        setAvailablePlatform('Unavailable');
        return;
      }
      setAvailablePlatform('Google Fit');
      try {
        const hasPerms = await googleFitHasPermissions();
        setHealthGranted(hasPerms);
      } catch {
        setHealthGranted(false);
      }
    })();
  }, []);

  async function enableNotifications() {
    const ok = await requestNotiPermission();
    setNotiGranted(!!ok);
    if (!ok) Alert.alert('Notifications', 'Permission was not granted.');
  }

  async function enableHealthData() {
    try {
      const provider = getGoogleFitProvider();
      const available = await provider.isAvailable();
      if (!available) {
        Alert.alert('Health Data', 'Google Fit is not available on this device.');
        return;
      }

      const ok = await googleFitRequestPermissions();
      await new Promise((resolve) => setTimeout(resolve, 500));
      const verified = await googleFitHasPermissions();
      const actuallyGranted = ok || verified;
      setHealthGranted(actuallyGranted);

      if (actuallyGranted) {
        Alert.alert(
          'Health Data Enabled',
          'Connected to Google Fit. Your health data will help trigger personalized mindfulness reminders.'
        );
      } else {
        Alert.alert('Health Data', 'Permission was not granted. You can enable this later in settings.');
      }
    } catch (e: any) {
      logger.error('Error requesting health permissions:', e);
      Alert.alert('Error', e?.message || 'Failed to request health permissions.');
    }
  }

  async function finish() {
    let userId: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
        const { error } = await supabase.from('profiles')
          .update({ has_onboarded: true })
          .eq('id', user.id);
        if (error) {
          logger.warn('Failed to update has_onboarded in profiles:', error);
        }
      }
    } catch (e: any) {
      logger.warn('Error updating profile:', e);
    }

    // Update local cache
    await setHasOnboarded(userId, true);
    
    // Trigger RootNavigator to re-check onboarding status
    if ((globalThis as any).__refreshOnboarding) {
      (globalThis as any).__refreshOnboarding();
      // Give it a moment to process
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: '800', marginBottom: 12 }}>Permissions</Text>
      <Text style={{ opacity: 0.7, marginBottom: 20 }}>
        Notifications help with reminders. Health data enables personalized mindfulness triggers based on your heart rate, stress, sleep, and activity.
      </Text>

      <TouchableOpacity
        onPress={enableNotifications}
        style={{
          backgroundColor: notiGranted ? theme.colors.primary : theme.colors.primary,
          padding: 14, borderRadius: 12, marginBottom: 12, alignItems: 'center'
        }}
      >
        <Text style={{ color: theme.colors.onPrimary, fontWeight: '700' }}>
          {notiGranted ? 'Notifications enabled ✓' : 'Enable notifications'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={enableHealthData}
        style={{
          backgroundColor: healthGranted ? theme.colors.primary : theme.colors.primary,
          padding: 14, borderRadius: 12, marginBottom: 24, alignItems: 'center'
        }}
      >
        <Text style={{ color: theme.colors.onPrimary, fontWeight: '700' }}>
          {healthGranted 
            ? `Health Data enabled ✓${availablePlatform ? ` (${availablePlatform})` : ''}` 
            : `Enable Health Data${availablePlatform ? ` (${availablePlatform})` : ''}`}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={finish}
        style={{ backgroundColor: theme.colors.primary, padding: 14, borderRadius: 12, alignItems: 'center' }}
      >
        <Text style={{ color: theme.colors.onPrimary, fontWeight: '700' }}>Finish</Text>
      </TouchableOpacity>
    </View>
  );
}
