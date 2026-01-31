/**
 * AsyncStorage-backed persistence adapter. Seam for future storage swapping.
 * No migrations; additive only.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/logger';

export async function getItem(key: string): Promise<string | null> {
  const val = await AsyncStorage.getItem(key);
  logger.debug('[PERSIST_ADAPTER] get', key.substring(0, 40));
  return val;
}

export async function setItem(key: string, value: string): Promise<void> {
  await AsyncStorage.setItem(key, value);
  logger.debug('[PERSIST_ADAPTER] set', key.substring(0, 40));
}

export async function removeItem(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
  logger.debug('[PERSIST_ADAPTER] remove', key.substring(0, 40));
}
