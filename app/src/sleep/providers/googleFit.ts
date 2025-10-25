import GoogleFit, { Scopes } from 'react-native-google-fit';

type SleepSample = { startDate: string; endDate: string };

export async function getGoogleFitSleep() {
  const auth = await GoogleFit.authorize({ scopes: [Scopes.FITNESS_SLEEP_READ] });
  if (!auth.success) return null;

  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 2);

  const samples: SleepSample[] = await GoogleFit.getSleepSamples(
    { startDate: start.toISOString(), endDate: end.toISOString() },
    true // return local timezone; also satisfies the 2nd param requirement
  );

  if (!samples?.length) return null;

  const toMs = (s: SleepSample) =>
    new Date(s.endDate).getTime() - new Date(s.startDate).getTime();
  const main = samples.reduce((best, cur) => (toMs(cur) > toMs(best) ? cur : best), samples[0]);

  return { start: new Date(main.startDate), end: new Date(main.endDate), source: 'googlefit' as const };
}
