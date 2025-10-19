import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import Dashboard from './src/screens/Dashboard';
import FocusArena from './src/screens/FocusArena';
import Mindfulness from './src/screens/Mindfulness';
import Meds from './src/screens/Meds';
import Settings from './src/screens/Settings';
import type { RootStackParamList } from './src/types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();
const qc = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator initialRouteName="Dashboard" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Dashboard" component={Dashboard} />
          <Stack.Screen name="FocusArena" component={FocusArena} />
          <Stack.Screen name="Mindfulness" component={Mindfulness} />
          <Stack.Screen name="Meds" component={Meds} />
          <Stack.Screen name="Settings" component={Settings} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>
  );
}
