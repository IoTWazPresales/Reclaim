import React, { useEffect, useState, useCallback } from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '@/providers/AuthProvider';
import AuthScreen from '@/screens/AuthScreen';
import AppNavigator from '@/routing/AppNavigator';
import OnboardingNavigator from '@/routing/OnboardingNavigator';
import { navRef } from '@/navigation/nav';

import { supabase } from '@/lib/supabase';
import { getHasOnboarded, setHasOnboarded } from '@/state/onboarding';
import type { RootStackParamList } from '@/navigation/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Deep-linking: map reclaim:// URLs to tab + nested stack routes
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['reclaim://'],
  config: {
    screens: {
      Auth: 'auth',
      Onboarding: {
        path: 'onboarding',
      },
      App: {
        screens: {
          HomeTabs: {
            screens: {
              Home: 'home',
              Sleep: 'sleep',
              Mood: 'mood',
              Analytics: 'analytics',
              Settings: 'settings',
            },
          },
          Meds: {
            screens: {
              MedsHome: 'meds',
              MedDetails: 'meds/:id',
            },
          },
          Mindfulness: 'mindfulness',
          Integrations: 'integrations',
          Notifications: 'notifications',
          About: 'about',
          DataPrivacy: 'privacy',
        },
      },
    },
  },
};

export default function RootNavigator() {
  const { session } = useAuth();
  const [booting, setBooting] = useState(true);
  const [hasOnboarded, setHasOnboardedState] = useState(false);
  const [checkTrigger, setCheckTrigger] = useState(0); // Force re-check trigger

  // Function to check onboarding status
  const checkOnboarding = useCallback(async () => {
    try {
      if (!session?.user) {
        setHasOnboardedState(false);
        setBooting(false);
        return;
      }
      // Try server truth first
      const { data, error } = await supabase
        .from('profiles')
        .select('has_onboarded')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!error && data) {
        const flag = !!data.has_onboarded;
        setHasOnboardedState(flag);
        await setHasOnboarded(flag); // sync local
      } else {
        // Fallback to local cache
        const local = await getHasOnboarded();
        setHasOnboardedState(local);
      }

    } catch (err) {
      // Fallback to local cache on error
      const local = await getHasOnboarded();
      setHasOnboardedState(local);
    } finally {
      setBooting(false);
    }
  }, [session?.user?.id]);

  // Load onboarding flag whenever the user session changes or checkTrigger changes
  useEffect(() => {
    let cancelled = false;

    (async () => {
      await checkOnboarding();
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, checkTrigger, checkOnboarding]);

  // Expose refresh function globally so PermissionsScreen can trigger it
  useEffect(() => {
    // Store refresh function on global object for PermissionsScreen to call
    (globalThis as any).__refreshOnboarding = () => {
      setCheckTrigger((prev) => prev + 1);
    };
    return () => {
      delete (globalThis as any).__refreshOnboarding;
    };
  }, []);

  const navKey = session ? 'app' : 'auth';
  if (booting) return null;

  return (
    <NavigationContainer ref={navRef} linking={linking}>
      <Stack.Navigator key={navKey} screenOptions={{ headerShown: false, animation: 'fade' }}>
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
