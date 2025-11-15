import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import TabsNavigator from '@/routing/TabsNavigator';
import MedsStack from '@/routing/MedsStack';
import MindfulnessScreen from '@/screens/MindfulnessScreen';
import IntegrationsScreen from '@/screens/IntegrationsScreen';
import NotificationsScreen from '@/screens/NotificationsScreen';
import AboutScreen from '@/screens/AboutScreen';
import DataPrivacyScreen from '@/screens/DataPrivacyScreen';
import EvidenceNotesScreen from '@/screens/EvidenceNotesScreen';
import ReclaimMomentsScreen from '@/screens/ReclaimMomentsScreen';
import { useAppTheme } from '@/theme';
import type { DrawerParamList } from '@/navigation/types';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const Drawer = createDrawerNavigator<DrawerParamList>();

export default function AppNavigator() {
  const theme = useAppTheme();
  const reduceMotion = useReducedMotion();

  return (
    <Drawer.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: { fontWeight: '600' },
        sceneContainerStyle: { backgroundColor: theme.colors.background },
        drawerType: reduceMotion ? 'front' : 'slide',
        swipeEnabled: !reduceMotion,
        swipeEdgeWidth: 60,
        drawerActiveTintColor: theme.colors.primary,
        drawerInactiveTintColor: theme.colors.onSurfaceVariant,
        overlayColor: 'rgba(15, 23, 42, 0.15)',
        drawerStyle: {
          backgroundColor: theme.colors.surface,
        },
      }}
    >
      <Drawer.Screen
        name="HomeTabs"
        component={TabsNavigator}
        options={({ navigation }) => ({
          title: 'Home',
          headerShown: false,
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
          ),
          drawerItemStyle: { minHeight: 48 },
        })}
      />
      <Drawer.Screen
        name="Meds"
        component={MedsStack}
        options={{
          title: 'Medications',
          headerShown: false,
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <MaterialCommunityIcons name="pill" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Mindfulness"
        component={MindfulnessScreen}
        options={{
          title: 'Mindfulness',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <MaterialCommunityIcons name="leaf" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Integrations"
        component={IntegrationsScreen}
        options={{
          title: 'Integrations',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <MaterialCommunityIcons name="sync" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          title: 'Notifications',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <MaterialCommunityIcons name="bell" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="About"
        component={AboutScreen}
        options={{
          title: 'About Reclaim',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <MaterialCommunityIcons name="information" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="DataPrivacy"
        component={DataPrivacyScreen}
        options={{
          title: 'Data & Privacy',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <MaterialCommunityIcons name="shield-lock" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="ReclaimMoments"
        component={ReclaimMomentsScreen}
        options={{
          title: 'Reclaim moments',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <MaterialCommunityIcons name="timeline-text-outline" size={size} color={color} />
          ),
        }}
      />
      <Drawer.Screen
        name="EvidenceNotes"
        component={EvidenceNotesScreen}
        options={{
          title: 'Evidence notes',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <MaterialCommunityIcons name="book-open-variant" size={size} color={color} />
          ),
          drawerItemStyle: { display: 'none' },
        }}
      />
    </Drawer.Navigator>
  );
}



