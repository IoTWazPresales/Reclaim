// C:\Reclaim\app\src\routing\AppNavigator.tsx
import React, { useMemo } from 'react';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';
import { Pressable, View } from 'react-native';
import { Divider, IconButton, Text } from 'react-native-paper';

import TabsNavigator from '@/routing/TabsNavigator';
import MedsStack from '@/routing/MedsStack';

import SleepScreen from '@/screens/SleepScreen';
import MoodScreen from '@/screens/MoodScreen';
import TrainingScreen from '@/screens/TrainingScreen';

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
import { navigateToHome, navigateToSettings } from '@/navigation/nav';

const Drawer = createDrawerNavigator<DrawerParamList>();

/** -----------------------------
 * Drawer tile types (discriminated union)
 * ------------------------------ */
type DrawerTileItem = {
  kind: 'item';
  key: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  isActive?: boolean;
};

type DrawerTileSpacer = {
  kind: 'spacer';
  key: string;
};

type DrawerTile = DrawerTileItem | DrawerTileSpacer;

function DrawerSectionLabel({ label }: { label: string }) {
  const theme = useAppTheme();
  return (
    <Text
      variant="labelSmall"
      style={{
        marginTop: 16,
        marginBottom: 10,
        marginLeft: 18,
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
  const currentName = current?.name;

  const closeDrawer = () => {
    try {
      const state = drawerNavigation.getState();
      if (state?.type !== 'drawer') return;

      if (typeof (drawerNavigation as any).closeDrawer === 'function') {
        (drawerNavigation as any).closeDrawer();
      } else {
        drawerNavigation.dispatch(DrawerActions.closeDrawer());
      }
    } catch {
      // no-op
    }
  };

  const goHomeTab = () => {
    closeDrawer();
    return navigateToHome();
  };

  const goSettingsTab = () => {
    closeDrawer();
    return navigateToSettings();
  };

  const goDrawer = (name: keyof DrawerParamList) => {
    closeDrawer();
    (drawerNavigation as any).navigate(name);
  };

  const tilesMain: DrawerTile[] = useMemo(
    () => [
      {
        kind: 'item',
        key: 'home',
        label: 'Home',
        icon: 'view-dashboard',
        onPress: goHomeTab,
        isActive: currentName === 'HomeTabs',
      },
      {
        kind: 'item',
        key: 'sleep',
        label: 'Sleep',
        icon: 'moon-waning-crescent',
        onPress: () => goDrawer('Sleep'),
        isActive: currentName === 'Sleep',
      },
      {
        kind: 'item',
        key: 'mood',
        label: 'Mood',
        icon: 'emoticon-happy-outline',
        onPress: () => goDrawer('Mood'),
        isActive: currentName === 'Mood',
      },
      {
        kind: 'item',
        key: 'meds',
        label: 'Meds',
        icon: 'pill',
        onPress: () => goDrawer('Meds'),
        isActive: currentName === 'Meds',
      },
      {
        kind: 'item',
        key: 'training',
        label: 'Training',
        icon: 'dumbbell',
        onPress: () => goDrawer('Training'),
        isActive: currentName === 'Training',
      },
      {
        kind: 'item',
        key: 'mindfulness',
        label: 'Mindfulness',
        icon: 'leaf',
        onPress: () => goDrawer('Mindfulness'),
        isActive: currentName === 'Mindfulness',
      },
      {
        kind: 'item',
        key: 'meditation',
        label: 'Meditation',
        icon: 'meditation',
        onPress: () => goDrawer('Meditation'),
        isActive: currentName === 'Meditation',
      },
    ],
    [currentName],
  );

  // ✅ Settings + Support tiles (Support is section inside Settings screen)
  const tilesTools: DrawerTile[] = useMemo(
    () => [
      {
        kind: 'item',
        key: 'settings',
        label: 'Settings',
        icon: 'cog-outline',
        onPress: goSettingsTab,
      },
      {
        kind: 'item',
        key: 'support',
        label: 'Support',
        icon: 'message-alert-outline',
        onPress: goSettingsTab,
      },
      {
        kind: 'item',
        key: 'integrations',
        label: 'Integrations',
        icon: 'sync',
        onPress: () => goDrawer('Integrations'),
        isActive: currentName === 'Integrations',
      },
      {
        kind: 'item',
        key: 'notifications',
        label: 'Notifications',
        icon: 'bell',
        onPress: () => goDrawer('Notifications'),
        isActive: currentName === 'Notifications',
      },
    ],
    [currentName],
  );

  const tilesInfo: DrawerTile[] = useMemo(
    () => [
      {
        kind: 'item',
        key: 'privacy',
        label: 'Privacy',
        icon: 'shield-lock',
        onPress: () => goDrawer('DataPrivacy'),
        isActive: currentName === 'DataPrivacy',
      },
      {
        kind: 'item',
        key: 'moments',
        label: 'Moments',
        icon: 'timeline-text-outline',
        onPress: () => goDrawer('ReclaimMoments'),
        isActive: currentName === 'ReclaimMoments',
      },
      {
        kind: 'item',
        key: 'about',
        label: 'About',
        icon: 'information',
        onPress: () => goDrawer('About'),
        isActive: currentName === 'About',
      },
      { kind: 'spacer', key: 'info_spacer_1' },
    ],
    [currentName],
  );

  const Tile = (t: DrawerTileItem) => {
    const active = !!t.isActive;

    return (
      <Pressable
        onPress={t.onPress}
        style={({ pressed }) => ({
          width: '48%',
          borderRadius: 16,
          paddingVertical: 14,
          paddingHorizontal: 12,
          marginBottom: 12,
          backgroundColor: active
            ? theme.colors.surfaceVariant
            : pressed
              ? theme.colors.surfaceVariant
              : theme.colors.surface,
          borderWidth: 1,
          borderColor: active ? theme.colors.primary : theme.colors.outlineVariant,
        })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 10 }}>
          <MaterialCommunityIcons
            name={t.icon}
            size={22}
            color={active ? theme.colors.primary : theme.colors.onSurfaceVariant}
          />
          <Text
            variant="titleMedium"
            style={{
              color: theme.colors.onSurface,
              fontWeight: active ? '800' : '700',
              fontSize: 16,
              flexShrink: 1,
            }}
          >
            {t.label}
          </Text>
        </View>
      </Pressable>
    );
  };

  const TileSpacer = () => (
    <View
      style={{
        width: '48%',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 12,
        marginBottom: 12,
        opacity: 0,
      }}
    />
  );

  const TileGrid = ({ tiles }: { tiles: DrawerTile[] }) => (
    <View
      style={{
        paddingHorizontal: 18,
        paddingTop: 2,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
      }}
    >
      {tiles.map((t) => {
        if (t.kind === 'spacer') return <TileSpacer key={t.key} />;

        const { key, ...rest } = t;
        return <Tile key={key} {...rest} />;
      })}
    </View>
  );

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={{
        paddingBottom: 18,
        backgroundColor: theme.colors.surface,
      }}
    >
      {/* Header (with Close button) */}
      <View style={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexShrink: 1 }}>
            <Text
              variant="headlineSmall"
              style={{ color: theme.colors.onSurface, fontWeight: '900', letterSpacing: 0.2 }}
            >
              Reclaim
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              Sleep • Mood • Meds • Mindfulness
            </Text>
          </View>

          <IconButton
            icon="close"
            size={22}
            iconColor={theme.colors.onSurface}
            onPress={closeDrawer}
            accessibilityLabel="Close menu"
            style={{ margin: 0 }}
          />
        </View>
      </View>

      <Divider style={{ backgroundColor: theme.colors.outlineVariant, marginHorizontal: 16 }} />

      <DrawerSectionLabel label="Main" />
      <TileGrid tiles={tilesMain} />

      <DrawerSectionLabel label="Tools" />
      <TileGrid tiles={tilesTools} />

      <DrawerSectionLabel label="Info" />
      <TileGrid tiles={tilesInfo} />

      <View style={{ height: 6 }} />
    </DrawerContentScrollView>
  );
}

export default function AppNavigator() {
  const theme = useAppTheme();
  const reduceMotion = useReducedMotion();

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={({ navigation }) => ({
        headerShown: true, // ✅ ensure Drawer screens have a header unless overridden
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,

        // ✅ Hamburger on every Drawer screen header
        headerLeft: () => (
          <IconButton
            icon="menu"
            size={24}
            iconColor={theme.colors.onSurface}
            onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
            accessibilityLabel="Open navigation menu"
            style={{ marginLeft: -4 }}
          />
        ),

        drawerType: reduceMotion ? 'front' : 'slide',
        swipeEnabled: !reduceMotion,
        swipeEdgeWidth: 60,

        drawerActiveTintColor: theme.colors.primary,
        drawerInactiveTintColor: theme.colors.onSurfaceVariant,
        overlayColor: theme.colors.backdrop,

        drawerStyle: {
          backgroundColor: theme.colors.surface,
          width: 380,
          borderTopRightRadius: 18,
          borderBottomRightRadius: 18,
        },
      })}
    >
      <Drawer.Screen
        name="HomeTabs"
        component={TabsNavigator}
        options={{
          title: 'Home',
          headerShown: false, // Tabs navigator already has its own header/menu button
          drawerItemStyle: { display: 'none' },
        }}
      />

      {/* ✅ Drawer-first core screens: now WITH header + hamburger */}
      <Drawer.Screen name="Sleep" component={SleepScreen} options={{ title: 'Sleep' }} />
      <Drawer.Screen name="Mood" component={MoodScreen} options={{ title: 'Mood' }} />

      <Drawer.Screen name="Meds" component={MedsStack} options={{ title: 'Medications', headerShown: false }} />
      <Drawer.Screen name="Training" component={TrainingScreen} options={{ title: 'Training' }} />
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
