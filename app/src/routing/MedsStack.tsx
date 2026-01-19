import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DrawerActions } from '@react-navigation/native';
import { IconButton } from 'react-native-paper';

import MedsScreen from '@/screens/MedsScreen';
import MedDetailsScreen from '@/screens/MedDetailsScreen';
import { useAppTheme } from '@/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export type MedsStackParamList = {
  MedsHome:
    | {
        focusMedId?: string;
        focusScheduledFor?: string;
      }
    | undefined;

  MedDetails: { id: string };
};

const Stack = createNativeStackNavigator<MedsStackParamList>();

export default function MedsStack() {
  const theme = useAppTheme();
  const reduceMotion = useReducedMotion();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
        animation: reduceMotion ? 'none' : 'fade',
      }}
    >
      <Stack.Screen
        name="MedsHome"
        component={MedsScreen}
        options={({ navigation }) => ({
          title: 'Medications',
          headerLeft: () => (
            <IconButton
              icon="menu"
              size={24}
              onPress={() => navigation.getParent()?.dispatch(DrawerActions.toggleDrawer())}
              accessibilityLabel="Open navigation menu"
              iconColor={theme.colors.onSurface}
              style={{ marginLeft: -4 }}
            />
          ),
        })}
      />
      <Stack.Screen
        name="MedDetails"
        component={MedDetailsScreen}
        options={{
          title: 'Medication details',
          headerBackVisible: false,
        }}
      />
    </Stack.Navigator>
  );
}
