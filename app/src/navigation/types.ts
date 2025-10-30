import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabsParamList = {
  Home?: undefined;
  Meds: { focusMedId?: string } | undefined;
  Mood?: undefined;
  Sleep?: undefined;
  Mindfulness?: undefined;
  Insights?: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  Tabs: NavigatorScreenParams<TabsParamList>;
};
