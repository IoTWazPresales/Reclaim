export type MoodWeatherKind = 'storm' | 'heavy' | 'cloudy' | 'clear';

export function moodWeatherKind(rating: number, volatile: boolean): MoodWeatherKind {
  if (volatile) return 'storm';
  if (rating <= 4) return 'heavy';
  if (rating <= 6) return 'cloudy';
  return 'clear';
}

export function moodWeatherLabel(kind: MoodWeatherKind): string {
  switch (kind) {
    case 'storm':
      return 'Turbulent';
    case 'heavy':
      return 'Heavy';
    case 'cloudy':
      return 'Cloudy';
    case 'clear':
      return 'Clear';
  }
}

export function moodWeather(rating: number, volatile: boolean) {
  const kind = moodWeatherKind(rating, volatile);
  return { kind, label: moodWeatherLabel(kind) };
}
