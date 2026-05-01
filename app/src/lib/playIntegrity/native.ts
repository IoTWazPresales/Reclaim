import { NativeModules, Platform } from 'react-native';

type PlayIntegrityNativeModule = {
  requestIntegrityToken: (nonce: string) => Promise<string>;
};

const nativeModule = NativeModules.PlayIntegrityModule as PlayIntegrityNativeModule | undefined;

export function isPlayIntegritySupported(): boolean {
  return Platform.OS === 'android' && !!nativeModule?.requestIntegrityToken;
}

export async function requestPlayIntegrityToken(nonce: string): Promise<string> {
  if (!isPlayIntegritySupported() || !nativeModule) {
    throw new Error('Play Integrity is not supported on this platform/device.');
  }
  return nativeModule.requestIntegrityToken(nonce);
}

