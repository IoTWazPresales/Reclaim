import React from 'react';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';

import TabsNavigator from '@/routing/TabsNavigator';
import MedsStack from '@/routing/MedsStack';
import MindfulnessScreen from '@/screens/MindfulnessScreen';
import MeditationScreen from '@/screens/MeditationScreen';
import IntegrationsScreen from '@/screens/IntegrationsScreen';
import NotificationsScreen from '@/screens/NotificationsScreen';
import AboutScreen from '@/screens/AboutScreen';
import DataPrivacyScreen from '@/screens/DataPrivacyScreen';
import EvidenceNotesScreen from '@/screens/EvidenceNotesScreen';
import ReclaimMomentsScreen from '@/screens/ReclaimMomentsScreen';
import { useAppTheme } from '@/theme';
import type { DrawerParamList } from '@/navigation/types';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { navigateToHome } from '@/navigation/nav';

const Drawer = createDrawerNavigator<DrawerParamList>();

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const theme = useAppTheme();
  const drawerNavigation = props.navigation;

  const currentRoute = props.state.routes[props.state.index];
  const isHomeTabs = currentRoute.name === 'HomeTabs';

  // Safe close drawer - check if drawer is actually mounted
  const closeDrawer = () => {
    try {
      const state = drawerNavigation.getState();
      if (state?.type !== 'drawer') {
        return;
      }

      if (typeof drawerNavigation.closeDrawer === 'function') {
        drawerNavigation.closeDrawer();
      } else {
        drawerNavigation.dispatch(DrawerActions.closeDrawer());
      }
    } catch (error) {
      // Silently fail - drawer might not be mounted yet
      // This is expected during navigation transitions
    }
  };
  
  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ backgroundColor: theme.colors.surface }}>
      <DrawerItem
        label="Home"
        icon={({ color, size }) => <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />}
        activeTintColor={theme.colors.primary}
        inactiveTintColor={theme.colors.onSurfaceVariant}
        activeBackgroundColor={theme.colors.surfaceVariant}
        style={{ minHeight: 48 }}
        onPress={() => {
          closeDrawer();
          navigateToHome();
        }}
        focused={isHomeTabs}
      />
      {props.state.routes.slice(1).map((route: any, index: number) => {
        const focused = props.state.index === index + 1;
        const iconMap: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
          Meds: 'pill',
          Mindfulness: 'leaf',
          Meditation: 'meditation',
          Integrations: 'sync',
          Notifications: 'bell',
          About: 'information',
          DataPrivacy: 'shield-lock',
          ReclaimMoments: 'timeline-text-outline',
          EvidenceNotes: 'book-open-variant',
        };
        const labelMap: Record<string, string> = {
          ReclaimMoments: 'Reclaim moments',
          DataPrivacy: 'Data & Privacy',
          EvidenceNotes: 'Evidence notes',
          Meds: 'Medications',
          Meditation: 'Meditation',
          About: 'About Reclaim',
        };
        return (
          <DrawerItem
            key={route.key}
            label={labelMap[route.name] || route.name}
            icon={({ color, size }) => (
              <MaterialCommunityIcons name={iconMap[route.name] || 'circle'} size={size} color={color} />
            )}
            activeTintColor={theme.colors.primary}
            inactiveTintColor={theme.colors.onSurfaceVariant}
            activeBackgroundColor={theme.colors.surfaceVariant}
            style={{ minHeight: 48 }}
            onPress={() => {
              closeDrawer();
              drawerNavigation.navigate(route.name as keyof DrawerParamList);
            }}
            focused={focused}
          />
        );
      })}
    </DrawerContentScrollView>
  );
}

export default function AppNavigator() {
  const theme = useAppTheme();
  const reduceMotion = useReducedMotion();

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: { fontWeight: '600' },
        drawerType: reduceMotion ? 'front' : 'slide',
        swipeEnabled: !reduceMotion,
        swipeEdgeWidth: 60,
        drawerActiveTintColor: theme.colors.primary,
        drawerInactiveTintColor: theme.colors.onSurfaceVariant,
        overlayColor: theme.colors.backdrop,
        drawerStyle: {
          backgroundColor: theme.colors.surface,
        },
      }}
    >
      <Drawer.Screen
        name="HomeTabs"
        component={TabsNavigator}
        options={{
          title: 'Home',
          headerShown: false,
          drawerItemStyle: { display: 'none' }, // Hide default drawer item, using custom
        }}
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
        name="Meditation"
        component={MeditationScreen}
        options={{
          title: 'Meditation',
          drawerIcon: ({ color, size }: { color: string; size: number }) => (
            <MaterialCommunityIcons name="meditation" size={size} color={color} />
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



