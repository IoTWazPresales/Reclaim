import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultRoutineTemplates, type RoutineTemplate } from './routines';

const STORAGE_KEY = 'settings:routine_templates:v1';

export type RoutineTemplateSettings = Record<string, boolean>;

export async function loadRoutineTemplateSettings(): Promise<RoutineTemplateSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Default: all templates enabled
      const defaults: RoutineTemplateSettings = {};
      for (const tpl of defaultRoutineTemplates) {
        defaults[tpl.id] = tpl.enabled;
      }
      return defaults;
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as RoutineTemplateSettings;
    }
    return {};
  } catch {
    return {};
  }
}

export async function saveRoutineTemplateSettings(settings: RoutineTemplateSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export async function updateRoutineTemplateEnabled(templateId: string, enabled: boolean): Promise<void> {
  const current = await loadRoutineTemplateSettings();
  const next = { ...current, [templateId]: enabled };
  await saveRoutineTemplateSettings(next);
}

