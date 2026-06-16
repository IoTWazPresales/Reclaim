import React, { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';

import { getUserSettings } from '@/lib/userSettings';
import { resolveAppTheme } from './resolveAppTheme';
import { withReclaimFonts } from './appThemes';
import { useReclaimFontsReady } from './ReclaimFontsProvider';

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const fontsReady = useReclaimFontsReady();
  const { data: settings } = useQuery({
    queryKey: ['user:settings'],
    queryFn: getUserSettings,
  });

  const theme = useMemo(() => {
    const base = resolveAppTheme(settings?.appearanceMode, colorScheme);
    return withReclaimFonts(base, fontsReady);
  }, [settings?.appearanceMode, colorScheme, fontsReady]);

  return <PaperProvider theme={theme}>{children}</PaperProvider>;
}
