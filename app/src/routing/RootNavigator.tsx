import React, { useEffect, useState, useCallback } from 'react';
import { NavigationContainer, type LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Image } from 'react-native';
import { ActivityIndicator, useTheme } from 'react-native-paper';

import { useAuth } from '@/providers/AuthProvider';
import AuthScreen from '@/screens/AuthScreen';
import AppNavigator from '@/routing/AppNavigator';
import OnboardingNavigator from '@/routing/OnboardingNavigator';
import { navRef } from '@/navigation/nav';
import { logger } from '@/lib/logger';

import { supabase } from '@/lib/supabase';
import { getHasOnboarded, setHasOnboarded } from '@/state/onboarding';
import type { RootStackParamList } from '@/navigation/types';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Deep-linking: map reclaim:// URLs to drawer + nested tab routes
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['reclaim://'],
  config: {
    screens: {
      Auth: 'auth',
      Onboarding: { path: 'onboarding' },
      App: {
        screens: {
          HomeTabs: {
            screens: {
              Home: 'home',
              Analytics: 'analytics',
              Settings: 'settings',
            },
          },

          // ✅ Drawer-first core screens
          Sleep: 'sleep',
          Mood: 'mood',

          Meds: {
            screens: {
              MedsHome: 'meds',
              MedDetails: 'meds/:id',
            },
          },

          Training: 'training',
          Mindfulness: 'mindfulness',
          Meditation: 'meditation',

          Integrations: 'integrations',
          Notifications: 'notifications',
          About: 'about',
          DataPrivacy: 'privacy',
          EvidenceNotes: 'evidence-notes',
          ReclaimMoments: 'moments',
        },
      },
    },
  },
};

export default function RootNavigator() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [appReady, setAppReady] = useState(false);
  const [hasOnboarded, setHasOnboardedState] = useState<boolean | null>(null);
  const [checkTrigger, setCheckTrigger] = useState(0);

  const reduceMotion = useReducedMotion();
  const theme = useTheme();

  // PHASE 1: Fast boot - load from local cache FIRST (no Supabase)
  useEffect(() => {
    (async () => {
      if (!userId) {
        setHasOnboardedState(false);
        setAppReady(true);
        return;
      }

      // Load onboarding flag from local cache (fastest)
      const local = await getHasOnboarded(userId);
      setHasOnboardedState(local);

      if (__DEV__) {
        logger.debug('[RootNavigator] Boot phase 1 complete:', { hasOnboarded: local });
      }

      // App is ready to render immediately with local data
      setAppReady(true);

      // PHASE 2: Background Supabase check (non-blocking)
      // Only check if local is false (might be stale)
      if (!local) {
        setTimeout(async () => {
          try {
            const { data, error } = await Promise.race([
              supabase.from('profiles').select('has_onboarded').eq('id', userId).maybeSingle(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
            ]) as any;

            if (!error && data && data.has_onboarded === true) {
              // Remote says onboarded, update local
              setHasOnboardedState(true);
              await setHasOnboarded(userId, true);
            }
          } catch (err) {
            if (__DEV__) {
              logger.debug('[RootNavigator] Background onboarding check failed (non-critical)');
            }
          }
        }, 100);
      }
    })();
  }, [userId]);

  const onFinishOnboarding = useCallback(async () => {
    if (userId) {
      await setHasOnboarded(userId, true);
      setHasOnboardedState(true);
      // Bump trigger → forces one more check from DB
      setCheckTrigger((c) => c + 1);
    }
  }, [userId]);

  useEffect(() => {
    (globalThis as any).__refreshOnboarding = async () => {
      // Re-read SecureStore immediately (fastest source of truth)
      if (userId) {
        const local = await getHasOnboarded(userId);
        setHasOnboardedState(local);
      }
      // Also trigger Supabase check in background (for sync)
      setCheckTrigger((prev) => prev + 1);
    };
    return () => {
      delete (globalThis as any).__refreshOnboarding;
    };
  }, [userId]);

  const navKey = session ? 'app' : 'auth';

  // --- Lightweight splash while boot completes ---
  if (!appReady || hasOnboarded === null) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Image
          source={require('../../assets/splash.png')}
          style={{ width: 160, height: 160, resizeMode: 'contain', marginBottom: 16 }}
        />
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navRef} linking={linking}>
      <Stack.Navigator
        key={navKey}
        screenOptions={{ headerShown: false, animation: reduceMotion ? 'none' : 'fade' }}
      >
        {session ? (
          hasOnboarded ? (
            <Stack.Screen name="App" component={AppNavigator} />
          ) : (
            <Stack.Screen name="Onboarding">
              {() => <OnboardingNavigator onFinish={onFinishOnboarding} />}
            </Stack.Screen>
          )
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
