/**
 * Unified Health Integration
 * Direct integration with Samsung Health, Apple HealthKit, Google Fit, and Health Connect
 */
export * from './types';
export * from './unifiedService';
export * from './notificationTriggers';
export { getUnifiedHealthService } from './unifiedService';
export {
  startHealthTriggers,
  stopHealthTriggers,
  updateHealthTriggerConfig,
  getHealthTriggerConfig,
} from './notificationTriggers';

