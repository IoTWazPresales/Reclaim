import AppleHealthKit, { HealthKitPermissions } from 'react-native-health';

const PERMS: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
      AppleHealthKit.Constants.Permissions.HeartRate,
    ],
    write: [], // required by type even if empty
  },
};

export async function getHealthKitSleep() {
  return new Promise<{ start: Date; end: Date; source: 'healthkit' } | null>((resolve) => {
    AppleHealthKit.initHealthKit(PERMS, (err) => {
      if (err) return resolve(null);
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 2);
      AppleHealthKit.getSleepSamples(
        { startDate: start.toISOString(), endDate: end.toISOString() },
        (err2, results) => {
          if (err2 || !results?.length) return resolve(null);
          const main = results.sort(
            (a: any, b: any) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
          )[0];
          resolve({ start: new Date(main.startDate), end: new Date(main.endDate), source: 'healthkit' });
        }
      );
    });
  });
}
