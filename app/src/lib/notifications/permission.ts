import * as Notifications from 'expo-notifications';

/** Read the current OS grant without displaying a permission prompt. */
export async function hasNotificationPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  return existing.status === 'granted';
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (await hasNotificationPermission()) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.status === 'granted';
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}
