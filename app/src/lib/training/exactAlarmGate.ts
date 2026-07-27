/**
 * Exact-alarm gate for guided training (U4).
 *
 * Soft UX only: never blocks guided start. FGS rest-end timer remains primary;
 * OS exact date alarms stay best-effort when the user grants Alarms & reminders.
 */
import { Alert, Linking, NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/logger';

const SNOOZE_KEY = '@reclaim/exact_alarm_prompt_snooze_v1';

type ExactAlarmNativeModule = {
  canScheduleExactAlarms: () => Promise<boolean>;
  openExactAlarmSettings: () => Promise<boolean>;
};

const native = NativeModules.ExactAlarmModule as ExactAlarmNativeModule | undefined;

/** Pure helper — exported for unit tests. */
export function shouldPromptExactAlarm(opts: {
  platform: string;
  allowed: boolean | null;
  snoozed: boolean;
}): boolean {
  if (opts.platform !== 'android') return false;
  if (opts.allowed === true) return false;
  if (opts.allowed === null) return false; // unknown / no native → skip nag
  if (opts.snoozed) return false;
  return true;
}

export async function canScheduleExactAlarmsAsync(): Promise<boolean | null> {
  if (Platform.OS !== 'android') return true;
  if (!native?.canScheduleExactAlarms) {
    logger.debug('[GUIDED_EXACT_ALARM] native module missing — skipping check');
    return null;
  }
  try {
    return Boolean(await native.canScheduleExactAlarms());
  } catch (e) {
    logger.warn('[GUIDED_EXACT_ALARM] canScheduleExactAlarms failed', e);
    return null;
  }
}

export async function openExactAlarmSettingsAsync(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    if (native?.openExactAlarmSettings) {
      await native.openExactAlarmSettings();
      return;
    }
  } catch (e) {
    logger.warn('[GUIDED_EXACT_ALARM] openExactAlarmSettings failed — falling back', e);
  }
  try {
    await Linking.openSettings();
  } catch {
    // no-op
  }
}

async function isSnoozed(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(SNOOZE_KEY)) === '1';
  } catch {
    return false;
  }
}

async function setSnoozed(value: boolean): Promise<void> {
  try {
    if (value) await AsyncStorage.setItem(SNOOZE_KEY, '1');
    else await AsyncStorage.removeItem(SNOOZE_KEY);
  } catch {
    // no-op
  }
}

/**
 * Soft prompt when exact alarms are denied. Always resolves; never refuses guided.
 */
export async function ensureExactAlarmPromptForGuided(): Promise<'allowed' | 'prompted' | 'skipped'> {
  if (Platform.OS !== 'android') return 'skipped';

  const allowed = await canScheduleExactAlarmsAsync();
  if (allowed === true) {
    await setSnoozed(false);
    return 'allowed';
  }

  const snoozed = await isSnoozed();
  if (!shouldPromptExactAlarm({ platform: Platform.OS, allowed, snoozed })) {
    return 'skipped';
  }

  return await new Promise<'prompted'>((resolve) => {
    Alert.alert(
      'Alarms & reminders',
      'For rest-end alerts while the phone is locked, enable Alarms & reminders for Reclaim. Guided training still works without it — timing while a session is open stays on.',
      [
        {
          text: 'Not now',
          style: 'cancel',
          onPress: () => {
            void setSnoozed(true).finally(() => resolve('prompted'));
          },
        },
        {
          text: 'Open settings',
          onPress: () => {
            void openExactAlarmSettingsAsync().finally(() => resolve('prompted'));
          },
        },
      ],
      { cancelable: true, onDismiss: () => resolve('prompted') },
    );
  });
}
