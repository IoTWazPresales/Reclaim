/**
 * Unified Health Service
 * Automatically selects best available platform and provides unified interface
 */
import { Platform } from 'react-native';
import { AppleHealthKitProvider } from './providers/appleHealthKit';
import { GoogleFitProvider } from './providers/googleFit';
import { HealthConnectProvider } from './providers/healthConnect';
import { SamsungHealthProvider } from './providers/samsungHealth';
import { logger } from '@/lib/logger';
import type {
  UnifiedHealthService,
  HealthPlatform,
  HeartRateSample,
  SleepSession,
  StressLevel,
  ActivitySample,
  HealthDataProvider,
} from './types';

export class UnifiedHealthServiceImpl implements UnifiedHealthService {
  private providers: HealthDataProvider[] = [];
  private activeProvider: HealthDataProvider | null = null;
  private isMonitoringActive = false;
  private heartRateSpikeCallbacks: Set<(sample: HeartRateSample) => void> = new Set();
  private highStressCallbacks: Set<(level: StressLevel) => void> = new Set();
  private lowActivityCallbacks: Set<(sample: ActivitySample) => void> = new Set();
  private sleepEndCallbacks: Set<(session: SleepSession) => void> = new Set();
  private unsubscribeFunctions: (() => void)[] = [];
  private monitoringIntervals: NodeJS.Timeout[] = [];

  constructor() {
    // Initialize all providers
    if (Platform.OS === 'ios') {
      this.providers.push(new AppleHealthKitProvider());
    } else {
      // Android: Try Samsung Health first, then Health Connect, then Google Fit
      this.providers.push(new SamsungHealthProvider());
      this.providers.push(new HealthConnectProvider());
      this.providers.push(new GoogleFitProvider());
    }
  }

  async getAvailablePlatforms(): Promise<HealthPlatform[]> {
    const available: HealthPlatform[] = [];
    for (const provider of this.providers) {
      if (await provider.isAvailable()) {
        available.push(provider.platform);
      }
    }
    return available;
  }

  getActivePlatform(): HealthPlatform | null {
    return this.activeProvider?.platform || null;
  }

  private async selectBestProvider(): Promise<HealthDataProvider | null> {
    // Priority order:
    // iOS: Apple HealthKit
    // Android: Samsung Health (if on Samsung device) > Health Connect > Google Fit
    for (const provider of this.providers) {
      if (await provider.isAvailable()) {
        // Log which provider is being used (for debugging)
        logger.debug('Selected health provider:', provider.platform);
        return provider;
      }
    }
    return null;
  }

  async requestAllPermissions(): Promise<boolean> {
    const provider = await this.selectBestProvider();
    if (!provider) return false;

    this.activeProvider = provider;

    const metrics: any[] = [
      'heart_rate',
      'resting_heart_rate',
      'heart_rate_variability',
      'sleep_analysis',
      'sleep_stages',
      'stress_level',
      'steps',
      'active_energy',
      'activity_level',
    ];

    return provider.requestPermissions(metrics);
  }

  async startMonitoring(): Promise<void> {
    if (this.isMonitoringActive) return;
    if (!this.activeProvider) {
      this.activeProvider = await this.selectBestProvider();
    }
    if (!this.activeProvider) return;

    this.isMonitoringActive = true;

    // Subscribe to heart rate for spike detection
    const hrUnsub = this.activeProvider.subscribeToHeartRate((sample) => {
      // Check for heart rate spike (> 100 bpm or > 20 bpm increase from baseline)
      // This is a simplified heuristic - you might want to track user's baseline
      if (sample.value > 100 || (this.heartRateSpikeCallbacks.size > 0 && sample.value > 90)) {
        this.heartRateSpikeCallbacks.forEach((cb) => cb(sample));
      }
    });

    // Subscribe to stress level for high stress detection
    const stressUnsub = this.activeProvider.subscribeToStressLevel((level) => {
      if (level.value > 70 && this.highStressCallbacks.size > 0) {
        this.highStressCallbacks.forEach((cb) => cb(level));
      }
    });

    this.unsubscribeFunctions.push(hrUnsub, stressUnsub);

    // Monitor sleep end (poll every 5 minutes)
    const sleepCheckInterval = setInterval(async () => {
      const latest = await this.getLatestSleepSession();
      if (latest && this.sleepEndCallbacks.size > 0) {
        // Check if sleep ended recently (within last 10 minutes)
        const sleepEndTime = latest.endTime.getTime();
        const now = Date.now();
        if (now - sleepEndTime < 10 * 60 * 1000 && now - sleepEndTime > 0) {
          this.sleepEndCallbacks.forEach((cb) => cb(latest));
        }
      }
    }, 5 * 60 * 1000);

    // Monitor activity (check every hour)
    const activityCheckInterval = setInterval(async () => {
      const today = await this.getTodayActivity();
      if (today && this.lowActivityCallbacks.size > 0) {
        // Low activity = less than 3000 steps by 3pm
        const now = new Date();
        if (now.getHours() >= 15 && (today.steps || 0) < 3000) {
          this.lowActivityCallbacks.forEach((cb) => cb(today));
        }
      }
    }, 60 * 60 * 1000);

    // Store intervals for cleanup
    this.monitoringIntervals.push(sleepCheckInterval, activityCheckInterval);
  }

  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoringActive) return;

    this.unsubscribeFunctions.forEach((unsub) => unsub());
    this.unsubscribeFunctions = [];
    
    // Clear all monitoring intervals
    this.monitoringIntervals.forEach((interval) => clearInterval(interval));
    this.monitoringIntervals = [];
    
    this.isMonitoringActive = false;
  }

  isMonitoring(): boolean {
    return this.isMonitoringActive;
  }

  async getLatestHeartRate(): Promise<HeartRateSample | null> {
    if (!this.activeProvider) {
      this.activeProvider = await this.selectBestProvider();
    }
    if (!this.activeProvider) return null;

    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const samples = await this.activeProvider.getHeartRate(fiveMinutesAgo, now);
    return samples.length > 0 ? samples[samples.length - 1] : null;
  }

  async getLatestRestingHeartRate(): Promise<number | null> {
    if (!this.activeProvider) {
      this.activeProvider = await this.selectBestProvider();
    }
    if (!this.activeProvider) return null;

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return this.activeProvider.getRestingHeartRate(oneWeekAgo, now);
  }

  async getLatestSleepSession(): Promise<SleepSession | null> {
    if (!this.activeProvider) {
      this.activeProvider = await this.selectBestProvider();
    }
    if (!this.activeProvider) return null;

    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const sessions = await this.activeProvider.getSleepSessions(threeDaysAgo, now);
    
    if (sessions.length === 0) return null;
    
    // Sort by end time, return most recent
    sessions.sort((a, b) => b.endTime.getTime() - a.endTime.getTime());
    return sessions[0];
  }

  async getLatestStressLevel(): Promise<StressLevel | null> {
    if (!this.activeProvider) {
      this.activeProvider = await this.selectBestProvider();
    }
    if (!this.activeProvider) return null;

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const levels = await this.activeProvider.getStressLevel(oneHourAgo, now);
    return levels.length > 0 ? levels[levels.length - 1] : null;
  }

  async getTodayActivity(): Promise<ActivitySample | null> {
    if (!this.activeProvider) {
      this.activeProvider = await this.selectBestProvider();
    }
    if (!this.activeProvider) return null;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const samples = await this.activeProvider.getActivity(todayStart, now);
    
    // Aggregate today's activity
    if (samples.length === 0) return null;
    
    const today = samples.find((s) => {
      const date = new Date(s.timestamp);
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
      );
    });

    return today || null;
  }

  onHeartRateSpike(callback: (sample: HeartRateSample) => void): () => void {
    this.heartRateSpikeCallbacks.add(callback);
    if (!this.isMonitoringActive) {
      this.startMonitoring();
    }

    return () => {
      this.heartRateSpikeCallbacks.delete(callback);
      if (this.heartRateSpikeCallbacks.size === 0) {
        this.stopMonitoring();
      }
    };
  }

  onHighStress(callback: (level: StressLevel) => void): () => void {
    this.highStressCallbacks.add(callback);
    if (!this.isMonitoringActive) {
      this.startMonitoring();
    }

    return () => {
      this.highStressCallbacks.delete(callback);
      if (this.highStressCallbacks.size === 0) {
        this.stopMonitoring();
      }
    };
  }

  onLowActivity(callback: (sample: ActivitySample) => void): () => void {
    this.lowActivityCallbacks.add(callback);
    if (!this.isMonitoringActive) {
      this.startMonitoring();
    }

    return () => {
      this.lowActivityCallbacks.delete(callback);
      if (this.lowActivityCallbacks.size === 0) {
        this.stopMonitoring();
      }
    };
  }

  onSleepEnd(callback: (session: SleepSession) => void): () => void {
    this.sleepEndCallbacks.add(callback);
    if (!this.isMonitoringActive) {
      this.startMonitoring();
    }

    return () => {
      this.sleepEndCallbacks.delete(callback);
      if (this.sleepEndCallbacks.size === 0) {
        this.stopMonitoring();
      }
    };
  }
}

// Singleton instance
let unifiedHealthServiceInstance: UnifiedHealthServiceImpl | null = null;

export function getUnifiedHealthService(): UnifiedHealthService {
  if (!unifiedHealthServiceInstance) {
    unifiedHealthServiceInstance = new UnifiedHealthServiceImpl();
  }
  return unifiedHealthServiceInstance;
}

