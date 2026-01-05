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

  const [booting, setBooting] = useState(true);
  const [hasOnboarded, setHasOnboardedState] = useState<boolean | null>(null);
  const [checkTrigger, setCheckTrigger] = useState(0);

  const reduceMotion = useReducedMotion();
  const theme = useTheme();

  // Fast initial load from SecureStore (no Supabase dependency)
  useEffect(() => {
    (async () => {
      if (!userId) {
        setHasOnboardedState(false);
        setBooting(false);
        return;
      }
      const local = await getHasOnboarded(userId);
      setHasOnboardedState(local);
      // If local says true, we can proceed immediately without waiting for Supabase
      if (local) {
        setBooting(false);
      }
    })();
  }, [userId]);

  const checkOnboarding = useCallback(async () => {
    try {
      if (!userId) {
        setHasOnboardedState(false);
        setBooting(false);
        return;
      }

      const queryPromise = supabase
        .from('profiles')
        .select('has_onboarded')
        .eq('id', userId)
        .maybeSingle();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout')), 3000),
      );

      let data, error;
      try {
        const result = (await Promise.race([queryPromise, timeoutPromise])) as any;
        data = result?.data;
        error = result?.error;
      } catch (timeoutError) {
        console.warn('RootNavigator: Supabase query timeout, using local cache');
        error = timeoutError;
      }

      if (!error && data) {
        const flag = !!data.has_onboarded;
        setHasOnboardedState(flag);
        await setHasOnboarded(userId, flag);
      } else {
        const local = await getHasOnboarded(userId);
        setHasOnboardedState(local);
      }
    } catch (err) {
      console.error('RootNavigator: checkOnboarding error:', err);
      const local = userId ? await getHasOnboarded(userId) : false;
      setHasOnboardedState(local);
    } finally {
      setBooting(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setBooting(false);
      return;
    }

    let cancelled = false;
    let timeoutId: NodeJS.Timeout;

    (async () => {
      timeoutId = setTimeout(() => {
        if (!cancelled) {
          console.warn('RootNavigator: Supabase query timeout, using local cache');
          getHasOnboarded(userId).then((local) => {
            if (!cancelled) {
              setHasOnboardedState(local);
              setBooting(false);
            }
          });
        }
      }, 3000);

      try {
        await checkOnboarding();
        if (!cancelled) clearTimeout(timeoutId);
      } catch (error) {
        if (!cancelled) {
          clearTimeout(timeoutId);
          console.error('RootNavigator: onboarding check error:', error);
          const local = await getHasOnboarded(userId);
          setHasOnboardedState(local);
          setBooting(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [userId, checkTrigger, checkOnboarding]);

  useEffect(() => {
    (globalThis as any).__refreshOnboarding = async () => {
      // Re-read SecureStore immediately (fastest source of truth)
      if (userId) {
        const local = await getHasOnboarded(userId);
        setHasOnboardedState(local);
        setBooting(false);
      }
      // Also trigger Supabase check in background (for sync)
      setCheckTrigger((prev) => prev + 1);
    };
    return () => {
      delete (globalThis as any).__refreshOnboarding;
    };
  }, [userId]);

  const navKey = session ? 'app' : 'auth';

  // Do not render navigator until onboarding status is resolved to avoid flashing onboarding
  if (booting || hasOnboarded === null) {
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
            <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
          )
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
