import { Sentry } from '@/lib/sentry';

export const U5_SENTRY_EVENT_NAMES = {
  preferenceChanged: 'reclaim.u5.experiment.preference_changed.v1',
  assignmentCreated: 'reclaim.u5.experiment.assignment_created.v1',
  completionRecorded: 'reclaim.u5.experiment.completion_recorded.v1',
} as const;

export type U5SentryEventName =
  (typeof U5_SENTRY_EVENT_NAMES)[keyof typeof U5_SENTRY_EVENT_NAMES];

type U5EventProperties = Record<string, boolean | number | string>;

/**
 * Capture one privacy-bounded U5 product event. This must remain best effort: telemetry
 * can never decide whether an experiment preference or local completion is persisted.
 */
export function captureU5SentryEvent(
  name: U5SentryEventName,
  properties: U5EventProperties,
): void {
  try {
    Sentry.captureEvent({
      message: name,
      level: 'info',
      tags: {
        event_name: name,
        event_schema_version: '1',
        feature: 'behavioral_experiment',
        experiment_id: 'evening_wind_down',
      },
      contexts: {
        experiment: properties,
      },
    });
  } catch (error) {
    if (__DEV__) {
      console.debug('[U5_SENTRY] capture failed', error);
    }
  }
}
