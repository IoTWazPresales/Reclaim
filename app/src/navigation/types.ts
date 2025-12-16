import type { NavigatorScreenParams } from '@react-navigation/native';
import type { MedsStackParamList } from '@/routing/MedsStack';

export type TabsParamList = {
  Home: undefined;
  Sleep: undefined;
  Mood: undefined;
  Analytics: undefined;
  Settings: undefined;
};

export type DrawerParamList = {
  HomeTabs: NavigatorScreenParams<TabsParamList>;
  Meds: NavigatorScreenParams<MedsStackParamList> | undefined;
  Mindfulness: undefined;
  Meditation: undefined;
  Integrations: undefined;
  Notifications: undefined;
  About: undefined;
  DataPrivacy: undefined;
  EvidenceNotes: undefined;
  ReclaimMoments: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  App: NavigatorScreenParams<DrawerParamList>;
};
