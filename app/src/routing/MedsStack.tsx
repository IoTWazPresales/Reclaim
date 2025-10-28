import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import MedsScreen from '@/screens/MedsScreen';
import MedDetailsScreen from '@/screens/MedDetailsScreen';

export type MedsStackParamList = {
  MedsHome: undefined;
  MedDetails: { id: string };
};

const Stack = createNativeStackNavigator<MedsStackParamList>();

export default function MedsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MedsHome" component={MedsScreen} />
      <Stack.Screen name="MedDetails" component={MedDetailsScreen} />
    </Stack.Navigator>
  );
}
