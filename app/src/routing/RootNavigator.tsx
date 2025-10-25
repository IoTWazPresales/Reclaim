import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@/providers/AuthProvider';
import AuthScreen from '@/screens/AuthScreen';
import TabsNavigator from '@/routing/TabsNavigator';
import { navRef } from '@/navigation/nav';

// If you keep your param list types elsewhere, import those.
// Otherwise, this local fallback keeps TS happy.
export type RootStackParamList = {
  Auth: undefined;
  Tabs: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { session } = useAuth();

  // Using a key on the navigator forces a clean reset when auth state changes
  const navKey = session ? 'app' : 'auth';

  return (
    <NavigationContainer ref={navRef}>
      <Stack.Navigator
        key={navKey}
        screenOptions={{
          headerShown: false,
          animation: 'fade', // smoother swap between Auth <-> App
        }}
      >
        {session ? (
          <Stack.Screen name="Tabs" component={TabsNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
