/**
 * Samsung Health Provider
 * 
 * Note: On Android, Samsung Health data is typically aggregated through Health Connect.
 * This provider acts as an alias/enhancer that prioritizes Samsung Health sources
 * from Health Connect data, but can also support direct SDK integration if available.
 * 
 * For direct Samsung Health SDK integration, you would need to:
 * 1. Add samsung-health-data-api.aar to android/app/libs/
 * 2. Configure build.gradle to include the AAR
 * 3. Use native modules to access Samsung Health API
 * 
 * For now, we use Health Connect which aggregates Samsung Health data.
 */
import { Platform } from 'react-native';
import type { HealthDataProvider, HeartRateSample, SleepSession, StressLevel, ActivitySample, HealthMetric } from '../types';
import { HealthConnectProvider } from './healthConnect';

/**
 * Samsung Health provider that wraps Health Connect
 * but filters/prioritizes data from Samsung Health app
 */
export class SamsungHealthProvider implements HealthDataProvider {
  platform = 'samsung_health' as const;
  private healthConnect: HealthConnectProvider;

  constructor() {
    this.healthConnect = new HealthConnectProvider();
  }

  async isAvailable(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    
    // Check if Health Connect is available (which aggregates Samsung Health)
    const hcAvailable = await this.healthConnect.isAvailable();
    if (!hcAvailable) return false;

    // Try to detect Samsung device and Samsung Health app
    try {
      // Get device info from Platform constants
      const constants = Platform.constants || ({} as any);
      const deviceBrand = constants.Brand || '';
      const manufacturer = constants.Manufacturer || '';
      
      // Check if device is Samsung
      const isSamsungDevice = 
        deviceBrand?.toLowerCase().includes('samsung') ||
        manufacturer?.toLowerCase().includes('samsung');
      
      if (isSamsungDevice) {
        // On Samsung devices, Health Connect aggregates Samsung Health data
        // So Samsung Health is available through Health Connect
        return true;
      }
      
      // Even if not Samsung device, if Health Connect has Samsung Health data sources,
      // we can still use it (cross-device scenario)
      return true;
    } catch {
      // If detection fails, assume available if Health Connect is available
      return true;
    }
  }

  async requestPermissions(metrics: HealthMetric[]): Promise<boolean> {
    // Use Health Connect permissions (which includes Samsung Health data)
    return this.healthConnect.requestPermissions(metrics);
  }

  async getHeartRate(startDate: Date, endDate: Date): Promise<HeartRateSample[]> {
    const allSamples = await this.healthConnect.getHeartRate(startDate, endDate);
    // Filter/prioritize Samsung Health sources (now properly identified by HealthConnectProvider)
    const samsungSamples = allSamples.filter((s) => 
      s.source === 'samsung_health' ||
      s.source?.toLowerCase().includes('samsung') || 
      s.source?.toLowerCase().includes('shealth')
    );
    
    // Return Samsung sources if available, otherwise return all
    return samsungSamples.length > 0 ? samsungSamples : allSamples;
  }

  async getRestingHeartRate(startDate: Date, endDate: Date): Promise<number | null> {
    return this.healthConnect.getRestingHeartRate(startDate, endDate);
  }

  async getSleepSessions(startDate: Date, endDate: Date): Promise<SleepSession[]> {
    const allSessions = await this.healthConnect.getSleepSessions(startDate, endDate);
    // Filter/prioritize Samsung Health sources (now properly identified by HealthConnectProvider)
    const samsungSessions = allSessions.filter((s) => 
      s.source === 'samsung_health'
    );
    
    // Return Samsung sessions if available, otherwise return all (they may still be from Samsung via Health Connect)
    return samsungSessions.length > 0 ? samsungSessions : allSessions;
  }

  async getStressLevel(startDate: Date, endDate: Date): Promise<StressLevel[]> {
    return this.healthConnect.getStressLevel(startDate, endDate);
  }

  async getActivity(startDate: Date, endDate: Date): Promise<ActivitySample[]> {
    const allActivity = await this.healthConnect.getActivity(startDate, endDate);
    // Filter/prioritize Samsung Health sources if identifiable
    return allActivity;
  }

  subscribeToHeartRate(callback: (sample: HeartRateSample) => void): () => void {
    // Subscribe to all heart rate, then filter for Samsung sources in callback
    return this.healthConnect.subscribeToHeartRate((sample) => {
      // Forward all samples for now, can add filtering if needed
      callback(sample);
    });
  }

  subscribeToStressLevel(callback: (level: StressLevel) => void): () => void {
    return this.healthConnect.subscribeToStressLevel(callback);
  }
}

