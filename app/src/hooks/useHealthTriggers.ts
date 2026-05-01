/**
 * Hook for health-based notification triggers
 * Manages health monitoring and automatic mindfulness notifications
 */
import { useEffect, useState } from 'react';
import { startHealthTriggers, stopHealthTriggers, getHealthTriggerConfig, updateHealthTriggerConfig, type HealthTriggerConfig } from '@/lib/health/notificationTriggers';
import { logger } from '@/lib/logger';

export function useHealthTriggers(enabled: boolean = true) {
  const [isActive, setIsActive] = useState(false);
  const [config, setConfig] = useState<HealthTriggerConfig>(getHealthTriggerConfig());

  useEffect(() => {
    if (!enabled) {
      stopHealthTriggers();
      setIsActive(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        // Use current config from state
        await startHealthTriggers(config);
        if (!cancelled) {
          setIsActive(true);
          logger.debug('Health triggers started');
        }
      } catch (e: any) {
        logger.error('Failed to start health triggers:', e);
        if (!cancelled) {
          setIsActive(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      stopHealthTriggers();
      setIsActive(false);
    };
  }, [enabled, config.enabled, config.heartRateSpikeThreshold, config.stressThreshold, config.lowActivityThreshold]);

  const updateConfig = async (newConfig: Partial<HealthTriggerConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    await updateHealthTriggerConfig(updated);
  };

  return {
    isActive,
    config,
    updateConfig,
    start: async () => {
      await startHealthTriggers(config);
      setIsActive(true);
    },
    stop: async () => {
      await stopHealthTriggers();
      setIsActive(false);
    },
  };
}

