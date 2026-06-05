// Proactive settings storage and retrieval
import { createLocalStorageStore } from '@/lib/storage/storage-utils';

export interface ProactiveSettings {
  autoGeneration: {
    enabled: boolean;
    riskThreshold: number;
    fileThreshold: number;
  };
}

const STORAGE_KEY = 'proactive_settings';

const DEFAULT_SETTINGS: ProactiveSettings = {
  autoGeneration: {
    enabled: true,
    riskThreshold: 6.0,
    fileThreshold: 10
  },
};

// Create storage instance with deep merge deserializer
const proactiveSettingsStore = createLocalStorageStore<ProactiveSettings>({
  key: STORAGE_KEY,
  defaultValue: DEFAULT_SETTINGS,
  deserialize: (value: string) => {
    const parsed = JSON.parse(value);
    // Deep merge to ensure all fields have defaults (backward compatibility)
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      autoGeneration: {
        ...DEFAULT_SETTINGS.autoGeneration,
        ...parsed.autoGeneration
      },
    };
  }
});

export function getProactiveSettings(): ProactiveSettings {
  return proactiveSettingsStore.get() ?? DEFAULT_SETTINGS;
}

export function saveProactiveSettings(settings: ProactiveSettings): boolean {
  return proactiveSettingsStore.set(settings);
}

export function validateProactiveSettings(settings: Partial<ProactiveSettings>): string[] {
  const errors: string[] = [];

  if (settings.autoGeneration) {
    const { riskThreshold, fileThreshold } = settings.autoGeneration;

    if (riskThreshold !== undefined) {
      if (riskThreshold < 0 || riskThreshold > 10) {
        errors.push('Risk threshold must be between 0.0 and 10.0');
      }
    }

    if (fileThreshold !== undefined) {
      if (!Number.isInteger(fileThreshold) || fileThreshold < 1 || fileThreshold > 1000) {
        errors.push('File threshold must be an integer between 1 and 1000');
      }
    }
  }

  return errors;
}
