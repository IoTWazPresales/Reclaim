import React, { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';

import { getUserSettings } from '@/lib/userSettings';
import { resolveAppTheme } from './resolveAppTheme';

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const { data: settings } = useQuery({
    queryKey: ['user:settings'],
    queryFn: getUserSettings,
  });

  const theme = useMemo(
    () => resolveAppTheme(settings?.appearanceMode, colorScheme),
    [settings?.appearanceMode, colorScheme],
  );

  return <PaperProvider theme={theme}>{children}</PaperProvider>;
}
