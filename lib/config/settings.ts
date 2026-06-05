// Settings management
import { createLocalStorageStore } from '@/lib/storage/storage-utils';

export interface AppSettings {
  cacheDuration: number; // minutes
  pollingInterval: number; // minutes
  notificationDuration: number; // seconds
  stalePrThresholdHours: number; // hours
}

const DEFAULT_SETTINGS: AppSettings = {
  cacheDuration: 60,
  pollingInterval: 30,
  notificationDuration: 20,
  stalePrThresholdHours: 24,
};

const SETTINGS_KEY = 'pr-dashboard-settings';

// Create storage instance
const settingsStore = createLocalStorageStore<AppSettings>({
  key: SETTINGS_KEY,
  defaultValue: DEFAULT_SETTINGS,
});

export function getSettings(): AppSettings {
  const stored = settingsStore.get();

  if (!stored) {
    return DEFAULT_SETTINGS;
  }

  // Ensure all fields have defaults (backward compatibility)
  return {
    cacheDuration: stored.cacheDuration ?? DEFAULT_SETTINGS.cacheDuration,
    pollingInterval: stored.pollingInterval ?? DEFAULT_SETTINGS.pollingInterval,
    notificationDuration: stored.notificationDuration ?? DEFAULT_SETTINGS.notificationDuration,
    stalePrThresholdHours: stored.stalePrThresholdHours ?? DEFAULT_SETTINGS.stalePrThresholdHours,
  };
}

export function saveSettings(settings: AppSettings): void {
  settingsStore.set(settings);
}
