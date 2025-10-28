import React from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@/providers/AuthProvider';
import AuthScreen from '@/screens/AuthScreen';
import TabsNavigator from '@/routing/TabsNavigator';
import { navRef } from '@/navigation/nav';

export type RootStackParamList = {
  Auth: undefined;
  Tabs: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Deep-linking: map reclaim:// URLs to tab + nested stack routes
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['reclaim://'],
  config: {
    screens: {
      Auth: 'auth',
      Tabs: {
        screens: {
          Home: 'home',
          // Meds is a nested stack; expose both list and details
          Meds: {
            screens: {
              MedsHome: 'meds',
              MedDetails: 'meds/:id',
            },
          },
          Mood: 'mood',
          Sleep: 'sleep',
          Mindfulness: 'mindfulness',
          Insights: 'insights',
        },
      },
    },
  },
};

export default function RootNavigator() {
  const { session } = useAuth();
  const navKey = session ? 'app' : 'auth';

  return (
    <NavigationContainer ref={navRef} linking={linking}>
      <Stack.Navigator key={navKey} screenOptions={{ headerShown: false, animation: 'fade' }}>
        {session ? (
          <Stack.Screen name="Tabs" component={TabsNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
