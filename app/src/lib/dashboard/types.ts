/**
 * Dashboard-specific types. Extracted from Dashboard.tsx for reuse.
 */
import type { Med } from '@/lib/api';
import type { SessionTemplate } from '@/lib/training/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

export type UpcomingDose = {
  id: string;
  med: Med;
  scheduled: Date;
};

export type ScheduleItem =
  | {
      key: string;
      time: Date;
      kind: 'med';
      icon: IconName;
      title: string;
      subtitle?: string;
      medId: string;
      scheduledISO: string;
      onPress?: () => void;
    }
  | {
      key: string;
      time: Date;
      kind: 'sleep';
      icon: IconName;
      title: string;
      subtitle?: string;
      onPress?: () => void;
    }
  | {
      key: string;
      time: Date;
      kind: 'info';
      icon: IconName;
      title: string;
      subtitle?: string;
      onPress?: () => void;
    }
  | {
      key: string;
      time: Date;
      kind: 'training';
      icon: IconName;
      title: string;
      subtitle?: string;
      sessionTemplate?: SessionTemplate;
      onPress?: () => void;
    };
