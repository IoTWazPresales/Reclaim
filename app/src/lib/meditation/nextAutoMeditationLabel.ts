import { getLatestWakeTime } from '@/lib/health/getLatestWakeTime';
import { getMeditationById } from '@/lib/meditations';
import type { MeditationAutoRule } from '@/lib/meditationSettings';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function labelForAutoRuleType(type: MeditationAutoRule['type']): string {
  return getMeditationById(type)?.name ?? type.replace(/_/g, ' ');
}

export function describeAutoRule(rule: MeditationAutoRule): string {
  const name = labelForAutoRuleType(rule.type);
  if (rule.mode === 'after_wake') {
    return `${name}, after you wake`;
  }
  return `${name}, daily at ${pad2(rule.hour)}:${pad2(rule.minute)}`;
}

export async function formatNextScheduledLabel(rule: MeditationAutoRule | null): Promise<string> {
  if (!rule) return 'Set a schedule in Mindfulness → Auto meditation';

  if (rule.mode === 'fixed_time') {
    return `Daily at ${pad2(rule.hour)}:${pad2(rule.minute)} · tap the reminder to start`;
  }

  const wakeResult = await getLatestWakeTime();
  const now = new Date();
  if (wakeResult) {
    const when = new Date(wakeResult.wakeTime.getTime() + rule.offsetMinutes * 60_000);
    if (when > now) {
      return `Today ~${pad2(when.getHours())}:${pad2(when.getMinutes())} after wake`;
    }
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(7, 30, 0, 0);
  return `Tomorrow ~${pad2(tomorrow.getHours())}:${pad2(tomorrow.getMinutes())} after wake`;
}
