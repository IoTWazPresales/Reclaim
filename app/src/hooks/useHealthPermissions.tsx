// C:\Reclaim\app\src\hooks\useHealthPermissions.ts
import { Platform } from 'react-native';
import AppleHealthKit, { HealthKitPermissions } from 'react-native-health';
import { requestPermission, getGrantedPermissions } from 'react-native-health-connect';

export async function ensureHealthPermissions() {
  if (Platform.OS === 'ios') {
    const perms: HealthKitPermissions = {
      permissions: {
        read: [
          AppleHealthKit.Constants.Permissions.SleepAnalysis,
          AppleHealthKit.Constants.Permissions.HeartRate,
        ],
        write: [], // ← REQUIRED even if empty
      },
    };
    return new Promise<void>((resolve, reject) => {
      AppleHealthKit.initHealthKit(perms, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } else {
    // Android (Health Connect)
    await requestPermission([
      { accessType: 'read', recordType: 'SleepSession' },
      { accessType: 'read', recordType: 'HeartRate' },
    ]);
    const granted = await getGrantedPermissions();
    if (!granted?.length) throw new Error('Health Connect permissions not granted');
  }
}
