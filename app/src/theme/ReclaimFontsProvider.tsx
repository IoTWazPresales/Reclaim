import React, { createContext, useContext, useMemo } from 'react';
import { useFonts } from 'expo-font';
import {
  SchibstedGrotesk_700Bold,
  SchibstedGrotesk_800ExtraBold,
} from '@expo-google-fonts/schibsted-grotesk';
import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
} from '@expo-google-fonts/hanken-grotesk';

type ReclaimFontsContextValue = {
  fontsLoaded: boolean;
};

const ReclaimFontsContext = createContext<ReclaimFontsContextValue>({ fontsLoaded: false });

export function useReclaimFontsReady(): boolean {
  return useContext(ReclaimFontsContext).fontsLoaded;
}

export function ReclaimFontsProvider({ children }: { children: React.ReactNode }) {
  const [loaded, error] = useFonts({
    SchibstedGrotesk_700Bold,
    SchibstedGrotesk_800ExtraBold,
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
  });

  const fontsLoaded = loaded || !!error;

  const value = useMemo(() => ({ fontsLoaded }), [fontsLoaded]);

  return <ReclaimFontsContext.Provider value={value}>{children}</ReclaimFontsContext.Provider>;
}
