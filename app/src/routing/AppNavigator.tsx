import React from 'react';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';
import { View } from 'react-native';
import { Divider, Text } from 'react-native-paper';

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

function DrawerSectionLabel({ label }: { label: string }) {
  const theme = useAppTheme();
  return (
    <Text
      variant="labelSmall"
      style={{
        marginTop: 16,
        marginBottom: 8,
        marginLeft: 16,
        color: theme.colors.onSurfaceVariant,
        letterSpacing: 1,
      }}
    >
      {label.toUpperCase()}
    </Text>
  );
}

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const theme = useAppTheme();
  const drawerNavigation = props.navigation;

  const current = props.state.routes[props.state.index];
  const isHomeTabs = current.name === 'HomeTabs';

  const closeDrawer = () => {
    try {
      const state = drawerNavigation.getState();
      if (state?.type !== 'drawer') return;

      if (typeof drawerNavigation.closeDrawer === 'function') {
        drawerNavigation.closeDrawer();
      } else {
        drawerNavigation.dispatch(DrawerActions.closeDrawer());
      }
    } catch {
      // no-op
    }
  };

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
    HomeTabs: 'view-dashboard',
  };

  const labelMap: Record<string, string> = {
    HomeTabs: 'Home',
    ReclaimMoments: 'Reclaim moments',
    DataPrivacy: 'Data & Privacy',
    EvidenceNotes: 'Evidence notes',
    Meds: 'Medications',
    Meditation: 'Meditation',
    About: 'About Reclaim',
  };

  const baseItemProps = {
    activeTintColor: theme.colors.primary,
    inactiveTintColor: theme.colors.onSurfaceVariant,
    activeBackgroundColor: theme.colors.surfaceVariant,
    style: { minHeight: 48, borderRadius: 12, marginHorizontal: 8 },
    labelStyle: { marginLeft: -8 },
  } as const;

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{
        paddingBottom: 16,
        backgroundColor: theme.colors.surface,
      }}
    >
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 12 }}>
        <Text variant="titleLarge" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
          Reclaim
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
          Sleep • Mood • Meds • Mindfulness
        </Text>
      </View>

      <Divider style={{ backgroundColor: theme.colors.outlineVariant, marginHorizontal: 16 }} />

      {/* MAIN */}
      <DrawerSectionLabel label="Main" />
      <DrawerItem
        label="Home"
        icon={({ color, size }) => (
          <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
        )}
        {...baseItemProps}
        onPress={() => {
          closeDrawer();
          navigateToHome();
        }}
        focused={isHomeTabs}
      />

      <DrawerItem
        label={labelMap.Meds || 'Meds'}
        icon={({ color, size }) => (
          <MaterialCommunityIcons name={iconMap.Meds} size={size} color={color} />
        )}
        {...baseItemProps}
        onPress={() => {
          closeDrawer();
          drawerNavigation.navigate('Meds');
        }}
        focused={current.name === 'Meds'}
      />

      <DrawerItem
        label={labelMap.Mindfulness || 'Mindfulness'}
        icon={({ color, size }) => (
          <MaterialCommunityIcons name={iconMap.Mindfulness} size={size} color={color} />
        )}
        {...baseItemProps}
        onPress={() => {
          closeDrawer();
          drawerNavigation.navigate('Mindfulness');
        }}
        focused={current.name === 'Mindfulness'}
      />

      <DrawerItem
        label={labelMap.Meditation || 'Meditation'}
        icon={({ color, size }) => (
          <MaterialCommunityIcons name={iconMap.Meditation} size={size} color={color} />
        )}
        {...baseItemProps}
        onPress={() => {
          closeDrawer();
          drawerNavigation.navigate('Meditation');
        }}
        focused={current.name === 'Meditation'}
      />

      {/* TOOLS */}
      <DrawerSectionLabel label="Tools" />
      <DrawerItem
        label={labelMap.Integrations || 'Integrations'}
        icon={({ color, size }) => (
          <MaterialCommunityIcons name={iconMap.Integrations} size={size} color={color} />
        )}
        {...baseItemProps}
        onPress={() => {
          closeDrawer();
          drawerNavigation.navigate('Integrations');
        }}
        focused={current.name === 'Integrations'}
      />

      <DrawerItem
        label={labelMap.Notifications || 'Notifications'}
        icon={({ color, size }) => (
          <MaterialCommunityIcons name={iconMap.Notifications} size={size} color={color} />
        )}
        {...baseItemProps}
        onPress={() => {
          closeDrawer();
          drawerNavigation.navigate('Notifications');
        }}
        focused={current.name === 'Notifications'}
      />

      {/* INFO */}
      <DrawerSectionLabel label="Info" />
      <DrawerItem
        label={labelMap.DataPrivacy || 'Data & Privacy'}
        icon={({ color, size }) => (
          <MaterialCommunityIcons name={iconMap.DataPrivacy} size={size} color={color} />
        )}
        {...baseItemProps}
        onPress={() => {
          closeDrawer();
          drawerNavigation.navigate('DataPrivacy');
        }}
        focused={current.name === 'DataPrivacy'}
      />

      <DrawerItem
        label={labelMap.ReclaimMoments || 'Reclaim moments'}
        icon={({ color, size }) => (
          <MaterialCommunityIcons name={iconMap.ReclaimMoments} size={size} color={color} />
        )}
        {...baseItemProps}
        onPress={() => {
          closeDrawer();
          drawerNavigation.navigate('ReclaimMoments');
        }}
        focused={current.name === 'ReclaimMoments'}
      />

      <DrawerItem
        label={labelMap.About || 'About Reclaim'}
        icon={({ color, size }) => (
          <MaterialCommunityIcons name={iconMap.About} size={size} color={color} />
        )}
        {...baseItemProps}
        onPress={() => {
          closeDrawer();
          drawerNavigation.navigate('About');
        }}
        focused={current.name === 'About'}
      />

      {/* EvidenceNotes stays hidden from drawer list, but is still routable */}
      {/* If you want it visible later, just add a DrawerItem here. */}

      <View style={{ height: 12 }} />
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
        drawerStyle: { backgroundColor: theme.colors.surface },
      }}
    >
      <Drawer.Screen
        name="HomeTabs"
        component={TabsNavigator}
        options={{
          title: 'Home',
          headerShown: false,
          drawerItemStyle: { display: 'none' },
        }}
      />

      <Drawer.Screen name="Meds" component={MedsStack} options={{ title: 'Medications', headerShown: false }} />
      <Drawer.Screen name="Mindfulness" component={MindfulnessScreen} options={{ title: 'Mindfulness' }} />
      <Drawer.Screen name="Meditation" component={MeditationScreen} options={{ title: 'Meditation' }} />
      <Drawer.Screen name="Integrations" component={IntegrationsScreen} options={{ title: 'Integrations' }} />
      <Drawer.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <Drawer.Screen name="About" component={AboutScreen} options={{ title: 'About Reclaim' }} />
      <Drawer.Screen name="DataPrivacy" component={DataPrivacyScreen} options={{ title: 'Data & Privacy' }} />
      <Drawer.Screen name="ReclaimMoments" component={ReclaimMomentsScreen} options={{ title: 'Reclaim moments' }} />

      <Drawer.Screen
        name="EvidenceNotes"
        component={EvidenceNotesScreen}
        options={{
          title: 'Evidence notes',
          drawerItemStyle: { display: 'none' },
        }}
      />
    </Drawer.Navigator>
  );
}
