import {
  getSdkStatus,
  SdkAvailabilityStatus,
  requestPermission,
  getGrantedPermissions,
  readRecords,
} from 'react-native-health-connect';

export async function getHealthConnectSleep() {
  const status = await getSdkStatus();
  if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) return null;

  await requestPermission([{ accessType: 'read', recordType: 'SleepSession' }]);

  const granted = await getGrantedPermissions();
  const hasSleep = granted?.some(
    (p) => p.accessType === 'read' && p.recordType === 'SleepSession'
  );
  if (!hasSleep) return null;

  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 2);

  const { records = [] } = await readRecords('SleepSession', {
    timeRangeFilter: {
      operator: 'between',
      startTime: start.toISOString(),
      endTime: end.toISOString(),
    },
  });
  if (!records.length) return null;

  const toMs = (r: any) => new Date(r.endTime).getTime() - new Date(r.startTime).getTime();
  const main = records.reduce((best: any, cur: any) => (toMs(cur) > toMs(best) ? cur : best), records[0]);

  return { start: new Date(main.startTime), end: new Date(main.endTime), source: 'health_connect' as const };
}
