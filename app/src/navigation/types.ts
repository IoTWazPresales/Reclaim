import type { NavigatorScreenParams } from '@react-navigation/native';
import type { MedsStackParamList } from '@/routing/MedsStack';

export type TabsParamList = {
  Home: undefined;
  Analytics: undefined;
  Settings: undefined;
};

export type DrawerParamList = {
  HomeTabs: NavigatorScreenParams<TabsParamList>;

  // ✅ Drawer-first core screens
  Sleep: undefined;
  Mood: undefined;

  Meds: NavigatorScreenParams<MedsStackParamList> | undefined;
  Training: undefined;
  Mindfulness: undefined;
  Meditation: undefined;
  Integrations: undefined;
  Notifications: undefined;
  About: undefined;
  DataPrivacy: undefined;
  EvidenceNotes: undefined;
  ReclaimMoments: undefined;
  Diagnostics: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  App: NavigatorScreenParams<DrawerParamList>;
};
